import { settingsService } from '@/services/settingsService.js';
import { ok, fail } from '@/utils/result.js';

const SETTINGS_KEY = 'lexai_settings';
const HISTORY_KEY = 'sql_history';

export const settingsLogic = {
  async loadSettings() {
    try {
      const row = await settingsService.getByKey(SETTINGS_KEY);
      return ok(row ? row.value : {});
    } catch (err) { return fail(err); }
  },

  async saveSettings(settings) {
    try {
      await settingsService.setByKey(SETTINGS_KEY, settings, 'system');
      return ok(true);
    } catch (err) { return fail(err); }
  },

  async deleteSettings() {
    try {
      const row = await settingsService.getByKey(SETTINGS_KEY);
      if (row) await settingsService.delete(row.id);
      return ok(true);
    } catch (err) { return fail(err); }
  },

  async loadHistory() {
    try {
      const row = await settingsService.getByKey(HISTORY_KEY);
      return ok(row ? row.value : []);
    } catch (err) { return fail(err); }
  },

  async saveHistory(entry) {
    try {
      let history = [];
      const row = await settingsService.getByKey(HISTORY_KEY);
      if (row) history = row.value;
      history.unshift({ ...entry, ts: Date.now() });
      if (history.length > 50) history.length = 50;
      await settingsService.setByKey(HISTORY_KEY, history, 'system');
      return ok(history);
    } catch (err) { return fail(err); }
  },
};

export default settingsLogic;
