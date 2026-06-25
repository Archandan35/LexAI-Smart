import { caseService } from '@/services/caseService.js';
import { reminderService } from '@/services/reminderService.js';
import { preferencesService } from '@/services/preferencesService.js';

// notificationLogic — derives notifications from app data (chiefly upcoming and
// overdue hearings). Computed on read; dismissals are tracked via the
// preferences provider so the bell badge behaves
// naturally without a backend.
const DISMISS_KEY = 'lexai.notifs.dismissed.v1';

function readDismissed() {
  const arr = preferencesService.get(DISMISS_KEY, []);
  return new Set(Array.isArray(arr) ? arr : []);
}
function writeDismissed(set) {
  preferencesService.set(DISMISS_KEY, [...set]);
}

function dayDiff(date) {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

export const notificationLogic = {
  async list({ windowDays = 7 } = {}) {
    const dismissed = readDismissed();
    let hearings = [];
    let reminders = [];
    try { hearings = await caseService.listHearings(); } catch { hearings = []; }
    try { reminders = await reminderService.list(); } catch { reminders = []; }

    const notifs = [];
    reminders.forEach((r) => {
      if (r.done) return;
      const diff = dayDiff(r.date);
      if (diff < -3 || diff > windowDays) return;
      let level = 'info';
      let when = `in ${diff} day${diff === 1 ? '' : 's'}`;
      if (diff < 0) { level = 'danger'; when = 'overdue'; }
      else if (diff === 0) { level = 'warn'; when = 'today'; }
      else if (diff === 1) { level = 'warn'; when = 'tomorrow'; }
      const id = `reminder_${r.id}`;
      notifs.push({
        id, level, type: r.type || 'Reminder',
        title: r.title,
        message: `${r.title} — ${when}`,
        date: r.date, route: r.caseId ? `/cases/${r.caseId}` : '/cases', icon: 'clock',
        read: dismissed.has(id),
        sortKey: diff,
      });
    });
    hearings.forEach((h) => {
      if (h.status === 'Disposed' || h.status === 'Adjourned') return;
      const diff = dayDiff(h.date);
      if (diff < -1 || diff > windowDays) return;
      let level = 'info';
      let when = `in ${diff} day${diff === 1 ? '' : 's'}`;
      if (diff < 0) { level = 'danger'; when = 'overdue'; }
      else if (diff === 0) { level = 'warn'; when = 'today'; }
      else if (diff === 1) { level = 'warn'; when = 'tomorrow'; }
      const id = `hearing_${h.id}`;
      notifs.push({
        id, level, type: 'Hearing',
        title: h.purpose || 'Hearing',
        message: `${h.purpose || 'Hearing'} — ${when}`,
        date: h.date, route: '/cause-list', icon: 'calendar',
        read: dismissed.has(id),
        sortKey: diff,
      });
    });

    return notifs.sort((a, b) => a.sortKey - b.sortKey);
  },

  dismiss(id) {
    const d = readDismissed(); d.add(id); writeDismissed(d);
  },
  dismissAll(ids) {
    const d = readDismissed(); ids.forEach((i) => d.add(i)); writeDismissed(d);
  },
};

export default notificationLogic;
