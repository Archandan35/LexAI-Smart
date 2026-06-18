import { createRepository } from './baseRepository.js';

// settingsRepository — provider-agnostic key/value application settings.
const base = createRepository('settings');

export const settingsRepository = {
  ...base,
  // Convenience: read a single settings record by its logical key.
  async getByKey(key) {
    const rows = await base.getAll({ key });
    return rows[0] || null;
  },
  // Upsert a settings value for a key.
  async setByKey(key, value, updatedBy) {
    const existing = await this.getByKey(key);
    if (existing) return base.update(existing.id, { value, updatedBy, updatedAt: new Date().toISOString() });
    return base.create({ id: `set_${key}`, key, value, updatedBy, updatedAt: new Date().toISOString() });
  },
};

export default settingsRepository;
