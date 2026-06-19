// DateEngine — provider-agnostic date and time handling.
//
// All code throughout the application uses DateEngine for date operations
// instead of calling `new Date()`, `new Date().toISOString()`, or
// `nowISO()` directly. This ensures consistent date formatting and makes
// date representation independent of the storage provider.

function pad2(n) {
  return String(n).padStart(2, '0');
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
};

export default DateEngine;
