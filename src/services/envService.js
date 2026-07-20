import { envVarsRepository } from '@/data-layer/repositories/envVarsRepository.js';
import { configHistoryRepository } from '@/data-layer/repositories/configHistoryRepository.js';
import { auditService } from './auditService.js';
import { config } from '@/config/config.js';
import { ENV_CATEGORIES, API_CATALOG } from '@/constants/envCatalog.js';
import { uid } from '@/utils/id.js';
import { randomHex } from '@/utils/crypto.js';
import { DateEngine } from '@/core/index.js';

// envService — centralised environment-variable & API configuration manager.
// Provider-agnostic and client-side: actual secrets live only in environment
// variables. Admin-managed overrides + metadata are stored in `envVars`, and a
// masked change log in `configHistory`. Secret values are NEVER logged in clear.

// Snapshot of values the app already knows from config (read-only origin).
function snapshot() {
  const c = config;
  return {
    DATABASE_PROVIDER: c.providers.database,
    STORAGE_PROVIDER: c.providers.storage,
    AUTH_PROVIDER: c.providers.auth,
    SEARCH_PROVIDER: c.providers.search,
    OCR_PROVIDER: c.providers.ocr,
    OPENAI_API_KEY: c.credentials.openaiApiKey,
    ANTHROPIC_API_KEY: c.credentials.anthropicApiKey,
    GEMINI_API_KEY: c.credentials.geminiApiKey,
    OLLAMA_BASE_URL: c.credentials.ollamaBaseUrl,
    DATABASE_URL: c.credentials.supabaseUrl || c.credentials.databaseUrl || '',
    DATABASE_ANON_KEY: c.credentials.supabaseAnonKey || c.credentials.databaseKey || '',
    INDIANKANOON_API_KEY: c.credentials.indianKanoonApiKey,
    STORAGE_ROOT_FOLDER: c.storage?.rootFolder,
    GOOGLE_DRIVE_CLIENT_ID: c.storage?.googleDrive?.clientId,
    GOOGLE_DRIVE_REFRESH_TOKEN: c.storage?.googleDrive?.refreshToken,
  };
}

export function maskValue(value, secret) {
  if (!value) return '';
  if (!secret) return value;
  const tail = String(value).slice(-4);
  return `${'•'.repeat(Math.max(8, String(value).length - 4))}${tail}`;
}

function catalogMeta(name) {
  for (const cat of ENV_CATEGORIES) {
    const v = cat.vars.find((x) => x.name === name);
    if (v) return { category: cat.key, secret: v.secret };
  }
  return { category: 'Custom', secret: /KEY|SECRET|TOKEN|PASSWORD/i.test(name) };
}

let cachedList = null;
let cachedListTs = 0;
const CACHE_TTL = 60_000;

async function getOverrides() {
  if (cachedList && Date.now() - cachedListTs < CACHE_TTL) return cachedList;
  cachedList = await envVarsRepository.getAll();
  cachedListTs = Date.now();
  return cachedList;
}

function invalidateCache() { cachedList = null; cachedListTs = 0; }

export const envService = {
  invalidateCache,

  // Merge catalog + config snapshot + DB overrides into a single row list.
  async list() {
    const overrides = await getOverrides();
    const byName = Object.fromEntries(overrides.map((o) => [o.name, o]));
    const snap = snapshot();
    const rows = [];

    ENV_CATEGORIES.forEach((cat) => {
      cat.vars.forEach((v) => {
        const o = byName[v.name];
        const value = o?.value ?? snap[v.name] ?? '';
        rows.push({
          id: o?.id || `cat_${v.name}`,
          name: v.name,
          category: cat.key,
          secret: v.secret,
          value,
          masked: maskValue(value, v.secret),
          hasValue: Boolean(value),
          status: o?.status || (value ? 'enabled' : 'unset'),
          updatedAt: o?.updatedAt || null,
          updatedBy: o?.updatedBy || null,
          source: o ? 'managed' : (snap[v.name] ? 'environment' : 'catalog'),
          persisted: Boolean(o),
        });
      });
    });

    // Any custom (non-catalog) managed variables.
    overrides.filter((o) => !rows.some((r) => r.name === o.name)).forEach((o) => {
      const meta = catalogMeta(o.name);
      rows.push({
        id: o.id, name: o.name, category: meta.category, secret: meta.secret,
        value: o.value || '', masked: maskValue(o.value, meta.secret), hasValue: Boolean(o.value),
        status: o.status || 'enabled', updatedAt: o.updatedAt, updatedBy: o.updatedBy,
        source: 'managed', persisted: true,
      });
    });

    return rows;
  },

  async upsert({ name, value, status }, user) {
    const meta = catalogMeta(name);
    const existing = (await getOverrides()).find((o) => o.name === name);
    const patch = {
      name, value: value ?? existing?.value ?? '', status: status || existing?.status || 'enabled',
      category: meta.category, secret: meta.secret, updatedAt: DateEngine.now(), updatedBy: user?.name || 'system',
    };
    let row;
    if (existing) row = await envVarsRepository.update(existing.id, patch);
    else row = await envVarsRepository.create({ id: uid('env'), createdAt: DateEngine.now(), ...patch });

    invalidateCache();
    await this.recordHistory(name, existing?.value, patch.value, meta.secret, user);
    await auditService.record({ action: existing ? 'env.update' : 'env.create', module: 'env', user, details: name });
    return row;
  },

  async remove(name, user) {
    const existing = (await getOverrides()).find((o) => o.name === name);
    if (existing) await envVarsRepository.delete(existing.id);
    invalidateCache();
    await auditService.record({ action: 'env.delete', module: 'env', user, details: name });
  },

  async setStatus(name, status, user) {
    const existing = (await getOverrides()).find((o) => o.name === name);
    if (existing) { await envVarsRepository.update(existing.id, { status, updatedAt: DateEngine.now(), updatedBy: user?.name || 'system' }); invalidateCache(); }
    else await this.upsert({ name, status }, user);
    await auditService.record({ action: status === 'enabled' ? 'env.enable' : 'env.disable', module: 'env', user, details: name });
  },

  // Rotate a secret to a fresh random value (demo: a new random hex token).
  async rotate(name, user) {
    const value = randomHex(24);
    await this.upsert({ name, value }, user);
    await auditService.record({ action: 'env.rotate', module: 'env', user, details: name });
    return value;
  },

  async recordHistory(name, oldValue, newValue, secret, user) {
    try {
      await configHistoryRepository.create({
        id: uid('cfg'), name,
        oldValue: maskValue(oldValue, secret), newValue: maskValue(newValue, secret),
        changedBy: user?.name || 'system', at: DateEngine.now(),
      });
    } catch { /* never break the action */ }
  },

  async history() {
    const rows = await configHistoryRepository.getAll();
    return DateEngine.sortByDate(rows, 'at', 'desc');
  },

  // API Manager: derive connection state from whether the configuring var is set.
  async apis() {
    const rows = await this.list();
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
    return API_CATALOG.map((a) => {
      const v = byName[a.keyVar];
      const configured = Boolean(v?.hasValue);
      return {
        ...a,
        status: configured ? 'connected' : 'disconnected',
        keySet: configured,
      };
    });
  },

  // "Test configuration" — reports whether the variable resolves to a value.
  async test(name) {
    const rows = await this.list();
    const row = rows.find((r) => r.name === name);
    return { ok: Boolean(row?.hasValue), name, message: row?.hasValue ? 'Value is configured.' : 'No value configured.' };
  },
};

export default envService;
