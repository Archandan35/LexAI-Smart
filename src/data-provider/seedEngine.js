// seedEngine — provider-agnostic clearing and row counts. Demo seeding has been
// removed per architecture audit. The permissions catalog is now managed through
// the Permission Manager UI only — no programmatic seeding on boot or install.
import { getDatabaseProvider } from '@/providers/database/index.js';
import { collectionNames } from '@/data-provider/schema/index.js';
import { nowISO, uid } from '@/utils/id.js';

const db = () => getDatabaseProvider();

export const seedEngine = {
  async seedMasterData() {
    const provider = db();
    const now = nowISO();
    const defaults = [];

    const existingStatuses = await provider.getAll('case_statuses').catch(() => []);
    if (!existingStatuses.length) {
      const rows = [
        { name: 'Active', display_order: 1 },
        { name: 'Disposed', display_order: 2 },
        { name: 'Stayed', display_order: 3 },
        { name: 'Appeal', display_order: 4 },
        { name: 'Closed', display_order: 5 },
      ];
      for (const r of rows) {
        await provider.create('case_statuses', { id: uid('cs'), ...r, status: 'Active', created_at: now });
      }
      defaults.push('case_statuses');
    }

    const existingPriorities = await provider.getAll('priorities').catch(() => []);
    if (!existingPriorities.length) {
      const rows = [
        { name: 'Critical', display_order: 1, color: '#ef4444' },
        { name: 'High', display_order: 2, color: '#f97316' },
        { name: 'Normal', display_order: 3, color: '#6b7280' },
        { name: 'Low', display_order: 4, color: '#22c55e' },
      ];
      for (const r of rows) {
        await provider.create('priorities', { id: uid('pr'), ...r, status: 'Active', created_at: now });
      }
      defaults.push('priorities');
    }

    const existingHearingStatuses = await provider.getAll('hearing_statuses').catch(() => []);
    if (!existingHearingStatuses.length) {
      const rows = [
        { name: 'Scheduled', display_order: 1, color: '#3b82f6' },
        { name: 'Rescheduled', display_order: 2, color: '#f97316' },
        { name: 'Completed', display_order: 3, color: '#22c55e' },
        { name: 'Adjourned', display_order: 4, color: '#eab308' },
        { name: 'Part Heard', display_order: 5, color: '#8b5cf6' },
        { name: 'Reserved for Orders', display_order: 6, color: '#06b6d4' },
        { name: 'Disposed', display_order: 7, color: '#ef4444' },
        { name: 'Next Date Awaited', display_order: 8, color: '#6b7280' },
      ];
      for (const r of rows) {
        await provider.create('hearing_statuses', { id: uid('hs'), ...r, status: 'Active', created_at: now });
      }
      defaults.push('hearing_statuses');
    }

    const existingContactTypes = await provider.getAll('contact_types').catch(() => []);
    if (!existingContactTypes.length) {
      const rows = [
        { name: 'Advocate', display_order: 1 },
        { name: 'Judge', display_order: 2 },
        { name: 'Court Staff', display_order: 3 },
        { name: 'Client', display_order: 4 },
        { name: 'Other', display_order: 5 },
      ];
      for (const r of rows) {
        await provider.create('contact_types', { id: uid('cty'), ...r, status: 'Active', created_at: now });
      }
      defaults.push('contact_types');
    }

    const existingActs = await provider.getAll('acts').catch(() => []);
    if (!existingActs.length) {
      const rows = [
        { title: 'Code of Civil Procedure, 1908', act_type: 'Procedure', jurisdiction: 'India', year: 1908, short_code: 'CPC', sections_count: 158, description: 'Code of Civil Procedure, 1908' },
        { title: 'Indian Evidence Act, 1872', act_type: 'Evidence', jurisdiction: 'India', year: 1872, short_code: 'Evidence Act', sections_count: 167, description: 'Indian Evidence Act, 1872' },
        { title: 'Bharatiya Sakshya Adhiniyam, 2023', act_type: 'Evidence', jurisdiction: 'India', year: 2023, short_code: 'BSA', sections_count: 170, description: 'Bharatiya Sakshya Adhiniyam, 2023' },
        { title: 'Bharatiya Nagarik Suraksha Sanhita, 2023', act_type: 'Procedure', jurisdiction: 'India', year: 2023, short_code: 'BNSS', sections_count: 531, description: 'Bharatiya Nagarik Suraksha Sanhita, 2023' },
        { title: 'Bharatiya Nyaya Sanhita, 2023', act_type: 'Substantive', jurisdiction: 'India', year: 2023, short_code: 'BNS', sections_count: 358, description: 'Bharatiya Nyaya Sanhita, 2023' },
        { title: 'Limitation Act, 1963', act_type: 'Procedure', jurisdiction: 'India', year: 1963, short_code: 'Limitation Act', sections_count: 32, description: 'Limitation Act, 1963' },
        { title: 'Registration Act, 1908', act_type: 'Procedure', jurisdiction: 'India', year: 1908, short_code: 'Registration Act', sections_count: 90, description: 'Registration Act, 1908' },
        { title: 'Transfer of Property Act, 1882', act_type: 'Substantive', jurisdiction: 'India', year: 1882, short_code: 'TP Act', sections_count: 137, description: 'Transfer of Property Act, 1882' },
        { title: 'Constitution of India, 1950', act_type: 'Constitutional', jurisdiction: 'India', year: 1950, short_code: 'Constitution', sections_count: 395, description: 'Constitution of India, 1950' },
      ];
      for (const r of rows) {
        await provider.create('acts', { id: uid('act'), ...r, status: 'Active', created_at: now });
      }
      defaults.push('acts');
    }

    return defaults;
  },

  // Wipe every known collection. Returns per-collection removed counts.
  async clearAll() {
    const provider = db();
    const removed = {};
    for (const name of collectionNames) {
      // eslint-disable-next-line no-await-in-loop
      removed[name] = await provider.clear(name).catch(() => 0);
    }
    return removed;
  },

  // Current row counts per collection (for the Database Manager dashboard).
  async counts() {
    const provider = db();
    const out = {};
    for (const name of collectionNames) {
      // eslint-disable-next-line no-await-in-loop
      out[name] = await provider.count(name).catch(() => 0);
    }
    return out;
  },
};

export default seedEngine;
