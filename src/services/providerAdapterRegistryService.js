// ProviderAdapterRegistryService — manages the provider_adapter_registry table.
// The installer dynamically loads adapters from this registry instead of
// hardcoding provider-specific logic in pages or the Setup Wizard.

import { getDatabaseProvider } from '@/providers/database/index.js';
import { EntityRegistry } from '@/core/EntityRegistry.js';

const TABLE = 'provider_adapter_registry';

const DEFAULT_ADAPTERS = [
  { provider: 'supabase', adapter_name: 'SupabaseAdapter', adapter_version: '1.0.0', migration_engine: 'sql', capabilities: { exec_sql: true, safe_ddl: true, rls: true, fk: true, transactions: true, json_support: true }, active: true },
  { provider: 'postgresql', adapter_name: 'PostgreSQLAdapter', adapter_version: '1.0.0', migration_engine: 'sql', capabilities: { exec_sql: true, safe_ddl: true, rls: true, fk: true, transactions: true, json_support: true }, active: true },
  { provider: 'mysql', adapter_name: 'MySQLAdapter', adapter_version: '1.0.0', migration_engine: 'sql', capabilities: { exec_sql: false, safe_ddl: false, rls: false, fk: true, transactions: true, json_support: true }, active: true },
  { provider: 'sqlite', adapter_name: 'SQLiteAdapter', adapter_version: '1.0.0', migration_engine: 'sql', capabilities: { exec_sql: false, safe_ddl: false, rls: false, fk: true, transactions: false, json_support: false }, active: true },
  { provider: 'mongodb', adapter_name: 'MongoDBAdapter', adapter_version: '1.0.0', migration_engine: 'mongoose', capabilities: { exec_sql: false, safe_ddl: false, rls: false, fk: false, transactions: true, json_support: true }, active: true },
  { provider: 'firebase', adapter_name: 'FirebaseAdapter', adapter_version: '1.0.0', migration_engine: 'firestore', capabilities: { exec_sql: false, safe_ddl: false, rls: false, fk: false, transactions: false, json_support: true }, active: true },
  { provider: 'local', adapter_name: 'LocalAdapter', adapter_version: '1.0.0', migration_engine: 'local', capabilities: { exec_sql: false, safe_ddl: false, rls: false, fk: false, transactions: false, json_support: false }, active: true },
];

export const ProviderAdapterRegistryService = {
  async getAll() {
    const provider = getDatabaseProvider();
    try {
      const rows = await provider.list(TABLE, {});
      return rows || [];
    } catch {
      return [];
    }
  },

  async getByProvider(providerName) {
    const provider = getDatabaseProvider();
    try {
      const rows = await provider.list(TABLE, { filter: { provider: providerName } });
      return rows?.[0] || null;
    } catch {
      return null;
    }
  },

  async getActive() {
    const provider = getDatabaseProvider();
    try {
      const rows = await provider.list(TABLE, { filter: { active: true } });
      return rows || [];
    } catch {
      return [];
    }
  },

  async register(adapter) {
    const provider = getDatabaseProvider();
    try {
      const existing = await this.getByProvider(adapter.provider);
      if (existing) {
        return provider.update(TABLE, existing.id, { ...adapter, updated_at: new Date().toISOString() });
      }
      return provider.create(TABLE, { id: `ADP-${adapter.provider}`, ...adapter, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    } catch (e) {
      console.warn('Failed to register adapter:', e.message);
      return null;
    }
  },

  async setActive(providerName, active) {
    const provider = getDatabaseProvider();
    try {
      const existing = await this.getByProvider(providerName);
      if (!existing) return null;
      return provider.update(TABLE, existing.id, { active, updated_at: new Date().toISOString() });
    } catch (e) {
      console.warn('Failed to set adapter active status:', e.message);
      return null;
    }
  },

  async seedDefaults() {
    const provider = getDatabaseProvider();
    for (const adapter of DEFAULT_ADAPTERS) {
      try {
        const existing = await this.getByProvider(adapter.provider);
        if (!existing) {
          await provider.create(TABLE, { id: `ADP-${adapter.provider}`, ...adapter, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        }
      } catch (e) {
        console.warn(`Failed to seed adapter ${adapter.provider}:`, e.message);
      }
    }
  },

  // Dynamic adapter loader — returns the adapter module for a provider
  async loadAdapter(providerName) {
    const adapterDef = await this.getByProvider(providerName);
    if (!adapterDef) {
      throw new Error(`No adapter registered for provider: ${providerName}`);
    }
    const adapterName = adapterDef.adapter_name;
    try {
      // Adapters are loaded dynamically by name convention
      const mod = await import(`@/providers/database/${adapterName}.js`);
      return { adapter: mod.default || mod, definition: adapterDef };
    } catch {
      // Fallback: try the existing provider
      const mod = await import(`@/providers/database/index.js`);
      const dbProvider = mod.getDatabaseProvider();
      return { adapter: dbProvider, definition: adapterDef };
    }
  },

  DEFAULT_ADAPTERS,
};

export default ProviderAdapterRegistryService;
