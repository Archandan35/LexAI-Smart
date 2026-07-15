// DateEngine — provider-agnostic date and time handling.
//
// All code throughout the application uses DateEngine for date operations
// instead of calling `new Date()`, `new Date().toISOString()`, or
// `nowISO()` directly. This ensures consistent date formatting and makes
// date representation independent of the storage provider.

import { settingsCache } from '@/core/settingsCache.js';

function pad2(n) {
  return String(n).padStart(2, '0');
}

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateObj(date, timezone) {
  const iso = DateEngine.toISO(date);
  if (!iso) return null;
  const d = new Date(iso);
  return timezone ? new Date(d.toLocaleString('en-US', { timeZone: timezone })) : d;
}

function ordinal(n) {
  if (n > 3 && n < 21) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function formatByPattern(date, format, timezone) {
  const d = toDateObj(date, timezone);
  if (!d) return '—';
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  const h = d.getHours();
  const min = d.getMinutes();
  const sec = d.getSeconds();

  switch (format) {
    case 'june23':
      return `${MONTHS_FULL[m]} ${day}, ${y}`;
    case '23june':
      return `${day} ${MONTHS_FULL[m]} ${y}`;
    case '23rdjune':
      return `${ordinal(day)} ${MONTHS_FULL[m]} ${y}`;
    case '23.06.2026':
      return `${pad2(day)}.${pad2(m + 1)}.${y}`;
    case '2026-06-23':
    case 'iso':
      return `${y}-${pad2(m + 1)}-${pad2(day)}`;
    case '23-06-2026':
      return `${pad2(day)}-${pad2(m + 1)}-${y}`;
    case '23/06/2026':
    case 'dmy':
      return `${pad2(day)}/${pad2(m + 1)}/${y}`;
    case '06/23/2026':
    case 'mdy':
      return `${pad2(m + 1)}/${pad2(day)}/${y}`;
    default: {
      const map = {
        'F': MONTHS_FULL[m],
        'M': MONTHS_SHORT[m],
        'm': pad2(m + 1),
        'n': String(m + 1),
        'd': pad2(day),
        'j': String(day),
        'jS': ordinal(day),
        'Y': String(y),
        'y': String(y).slice(-2),
        'H': pad2(h),
        'h': pad2(h % 12 || 12),
        'i': pad2(min),
        's': pad2(sec),
        'g': String(h % 12 || 12),
        'G': String(h),
        'A': h >= 12 ? 'PM' : 'AM',
        'a': h >= 12 ? 'pm' : 'am',
      };
      let result = format;
      for (const [token, val] of Object.entries(map)) {
        result = result.split(token).join(val);
      }
      return result;
    }
  }
}

function formatTimeByPattern(date, format, timezone) {
  const d = toDateObj(date, timezone);
  if (!d) return '—';
  const h = d.getHours();
  const min = d.getMinutes();
  const hour12 = h % 12 || 12;

  switch (format) {
    case '12h':
      return `${pad2(hour12)}:${pad2(min)} ${h >= 12 ? 'PM' : 'AM'}`;
    case '24h':
      return `${pad2(h)}:${pad2(min)}`;
    default:
      return `${pad2(hour12)}:${pad2(min)} ${h >= 12 ? 'PM' : 'AM'}`;
  }
}

export const DateEngine = {
  // Current timestamp as ISO 8601 string (always UTC).
  now() {
    return new Date().toISOString();
  },

  // Current date as YYYY-MM-DD string.
  today() {
    return this.now().slice(0, 10);
  },

  // Format a date value (string, Date, or number) to ISO 8601.
  // Returns null for unparseable values.
  toISO(date) {
    if (!date && date !== 0) return null;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return `${date}T00:00:00.000Z`;
    }
    try {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return null;
      return d.toISOString();
    } catch {
      return null;
    }
  },

  // Format a date as YYYY-MM-DD.
  toDateString(date) {
    const iso = this.toISO(date);
    return iso ? iso.slice(0, 10) : null;
  },

  // Format a date for display (DD/MM/YYYY).
  toDisplayDate(date) {
    const iso = this.toISO(date);
    if (!iso) return '—';
    const d = new Date(iso);
    return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  },

  // Format a date for display with time.
  toDisplayDateTime(date) {
    const iso = this.toISO(date);
    if (!iso) return '—';
    const d = new Date(iso);
    return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
  },

  // Compare two dates. Returns negative/zero/positive.
  compare(a, b) {
    const da = new Date(this.toISO(a) || 0).getTime();
    const db = new Date(this.toISO(b) || 0).getTime();
    return da - db;
  },

  // Sort function for arrays of objects with date fields.
  sortByDate(array, field = 'createdAt', direction = 'asc') {
    const dir = direction === 'desc' ? -1 : 1;
    return [...(array || [])].sort((a, b) => {
      return dir * this.compare(a[field], b[field]);
    });
  },

  // Check if a date is today.
  isToday(date) {
    const d = this.toDateString(date);
    return d === this.today();
  },

  // Check if a date is in the past.
  isPast(date) {
    const d = new Date(this.toISO(date) || 0);
    return d.getTime() < Date.now();
  },

  // Check if a date is in the future.
  isFuture(date) {
    const d = new Date(this.toISO(date) || 0);
    return d.getTime() > Date.now();
  },

  // Get the timestamp number from a date value.
  timestamp(date) {
    return new Date(this.toISO(date) || 0).getTime();
  },

  // Get the configured date format key from settings cache.
  getDateFormat() {
    const s = settingsCache.getAll();
    return s.dateFormat || 'june23';
  },

  // Get the configured time format key from settings cache.
  getTimeFormat() {
    const s = settingsCache.getAll();
    return s.timeFormat || '12h';
  },

  // Get a human-readable placeholder string for the configured date format.
  getDatePlaceholder() {
    const fmt = this.getDateFormat();
    switch (fmt) {
      case 'june23': return 'Month DD, YYYY';
      case '23june': return 'DD Month YYYY';
      case '23rdjune': return 'DDth Month YYYY';
      case '23.06.2026': return 'dd.mm.yyyy';
      case '2026-06-23':
      case 'iso': return 'yyyy-mm-dd';
      case '23-06-2026': return 'dd-mm-yyyy';
      case '23/06/2026':
      case 'dmy': return 'dd/mm/yyyy';
      case '06/23/2026':
      case 'mdy': return 'mm/dd/yyyy';
      default: return 'dd-mm-yyyy';
    }
  },

  // Convert a date value to a YYYY-MM-DD string suitable for `<input type="date">` value.
  toInputDate(value) {
    return this.toDateString(value) || '';
  },

  // Format a date using a named pattern and optional timezone.
  // If format/timezone omitted, reads from global settings cache.
  formatDate(date, format, timezone) {
    const s = settingsCache.getAll();
    return formatByPattern(date, format || s.dateFormat || 'june23', timezone || s.timezone);
  },

  // Format a time using a named pattern and optional timezone.
  // If format/timezone omitted, reads from global settings cache.
  formatTime(date, format, timezone) {
    const s = settingsCache.getAll();
    return formatTimeByPattern(date, format || s.timeFormat || '12h', timezone || s.timezone);
  },

  // Apply a timezone offset to a date and return a new Date.
  inTimezone(date, timezone) {
    return toDateObj(date, timezone);
  },

  // Get the first day of the week (0=Sunday, 1=Monday) from settings cache.
  // Falls back to Monday if no setting found.
  getWeekStart() {
    const s = settingsCache.getAll();
    const val = (s.weekStart || 'Monday').toLowerCase();
    return val.startsWith('sun') ? 0 : 1;
  },
};

export default DateEngine;
