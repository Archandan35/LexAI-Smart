// SchemaVersionManager — owns the `schema_meta` record and version lifecycle.
// Provider-agnostic: talks to the active provider directly (data-provider sits
// below the repository layer, so it must not import repositories). Upgrades and
// rollbacks run the ordered steps in versions.js and never destroy data.
import { getDatabaseProvider } from '@/providers/database/index.js';
import { config } from '@/config/config.js';
import { SCHEMA_VERSION, coreCollections } from '@/data-provider/schema/index.js';
import { MIGRATIONS } from './versions.js';

const META = 'schema_meta';
const META_ID = 'schema_meta';

export const schemaVersionManager = {
  targetVersion() { return SCHEMA_VERSION; },

  async getMeta() {
    try {
      const rows = await getDatabaseProvider().list(META, {});
      console.log('[LexAI schemaVersion] getMeta rows:', rows?.length);
      return (Array.isArray(rows) && rows[0]) || null;
    } catch (e) {
      console.warn('[LexAI schemaVersion] getMeta failed:', e.message);
      return null;
    }
  },

  // Installed version, or 0 if the backend has no schema yet. Self-heals a
  // pre-versioning install (collections already populated, no schema_meta row)
  // by stamping the current version — so existing local users never see a wizard.
  async getVersion() {
    const meta = await this.getMeta();
    if (meta) {
      console.log('[LexAI schemaVersion] found meta, version:', meta.version);
      return meta.version || 0;
    }
    // No schema_meta row — check if any core collection has data (pre-versioning install)
    try {
      const provider = getDatabaseProvider();
      for (const c of coreCollections) {
        if (c === META) continue;
        // eslint-disable-next-line no-await-in-loop
        const n = await provider.count(c).catch(() => 0);
        console.log('[LexAI schemaVersion] count', c, ':', n);
        if (n > 0) {
          console.log('[LexAI schemaVersion] found data in', c, '— self-healing stamp');
          await this.stamp(SCHEMA_VERSION, 'install');
          return SCHEMA_VERSION;
        }
      }
    } catch (e) {
      console.warn('[LexAI schemaVersion] getVersion catch:', e.message);
    }
    console.log('[LexAI schemaVersion] no data found — returning 0');
    return 0;
  },

  async isInstalled() { return (await this.getVersion()) > 0; },

  // Write/refresh the schema_meta record.
  async stamp(version, action = 'install') {
    const provider = getDatabaseProvider();
    await provider.ensureCollection(META).catch(() => {});
    const now = new Date().toISOString();
    const existing = await this.getMeta();
    const entry = { version, action, at: now };
    if (existing) {
      return provider.update(META, existing.id, {
        version,
        provider: config.providers.database,
        app_version: config.app.version,
        updated_at: now,
        history: [entry, ...(existing.history || [])].slice(0, 50),
      });
    }
    return provider.create(META, {
      id: META_ID,
      version,
      provider: config.providers.database,
      app_version: config.app.version,
      installed_at: now,
      updated_at: now,
      history: [entry],
    });
  },

  // Apply forward steps from the current version up to `target`.
  async upgrade(target = SCHEMA_VERSION) {
    const provider = getDatabaseProvider();
    const current = await this.getVersion();
    if (current >= target) return { from: current, to: current, applied: [], upToDate: true };
    const steps = MIGRATIONS.filter((m) => m.version > current && m.version <= target).sort((a, b) => a.version - b.version);
    const applied = [];
    for (const step of steps) {
      // eslint-disable-next-line no-await-in-loop
      if (typeof step.up === 'function') await step.up({ provider });
      applied.push(step.version);
    }
    await this.stamp(target, 'upgrade');
    return { from: current, to: target, applied };
  },

  // Reverse steps from the current version down to `target` (default: one step).
  async rollback(target) {
    const provider = getDatabaseProvider();
    const current = await this.getVersion();
    const tgt = Math.max(0, target ?? current - 1);
    const steps = MIGRATIONS.filter((m) => m.version <= current && m.version > tgt).sort((a, b) => b.version - a.version);
    const reverted = [];
    for (const step of steps) {
      // eslint-disable-next-line no-await-in-loop
      if (typeof step.down === 'function') await step.down({ provider });
      reverted.push(step.version);
    }
    await this.stamp(tgt, 'rollback');
    return { from: current, to: tgt, reverted };
  },
};

export default schemaVersionManager;
