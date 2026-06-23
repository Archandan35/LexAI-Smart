import { settingsRepository } from '@/data-layer/repositories/settingsRepository.js';

export const settingsService = {
  getByKey: (key) => settingsRepository.getByKey(key),
  setByKey: (key, value, updatedBy) => settingsRepository.setByKey(key, value, updatedBy),
  delete: (id) => settingsRepository.delete(id),
};

export default settingsService;
