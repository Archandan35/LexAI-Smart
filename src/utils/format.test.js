import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, formatDateTime, fromNow, bytes, stripHtml, truncate } from './format.js';

vi.mock('@/core/DateEngine.js', () => ({
  DateEngine: {
    formatDate: vi.fn((v) => {
      if (!v) return '';
      return '15/03/2024';
    }),
    formatTime: vi.fn(() => '02:30 PM'),
  },
}));

describe('formatDate', () => {
  it('returns em dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns em dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('returns em dash for empty string', () => {
    expect(formatDate('')).toBe('—');
  });

  it('returns the raw value for an unparseable date string', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatDateTime', () => {
  it('returns em dash for null', () => {
    expect(formatDateTime(null)).toBe('—');
  });

  it('returns raw value for unparseable date', () => {
    expect(formatDateTime('garbage')).toBe('garbage');
  });
});

describe('fromNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-15T14:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string for null', () => {
    expect(fromNow(null)).toBe('');
  });

  it('returns "just now" for a date seconds ago', () => {
    const d = new Date('2024-03-15T14:29:45Z').toISOString();
    expect(fromNow(d)).toBe('just now');
  });

  it('returns "Xm ago" for a date minutes ago', () => {
    const d = new Date('2024-03-15T14:25:00Z').toISOString();
    expect(fromNow(d)).toBe('5m ago');
  });

  it('returns "Xh ago" for a date hours ago', () => {
    const d = new Date('2024-03-15T11:30:00Z').toISOString();
    expect(fromNow(d)).toBe('3h ago');
  });

  it('returns "Xd ago" for a date days ago', () => {
    const d = new Date('2024-03-13T14:30:00Z').toISOString();
    expect(fromNow(d)).toBe('2d ago');
  });
});

describe('bytes', () => {
  it('returns "0 B" for 0', () => {
    expect(bytes(0)).toBe('0 B');
  });

  it('returns "0 B" for null', () => {
    expect(bytes(null)).toBe('0 B');
  });

  it('formats bytes as KB', () => {
    expect(bytes(1024)).toBe('1.0 KB');
  });

  it('formats bytes as MB', () => {
    expect(bytes(1048576)).toBe('1.0 MB');
  });

  it('formats bytes as GB', () => {
    expect(bytes(1073741824)).toBe('1.0 GB');
  });
});

describe('stripHtml', () => {
  it('strips HTML tags and decodes entities', () => {
    const result = stripHtml('<p>Hello <b>world</b></p>');
    expect(result.trim()).toBe('Hello world');
  });

  it('replaces <br> with newlines', () => {
    const result = stripHtml('line1<br>line2');
    expect(result).toBe('line1\nline2');
  });

  it('returns empty string for null', () => {
    expect(stripHtml(null)).toBe('');
  });
});

describe('truncate', () => {
  it('returns the string as-is when shorter than limit', () => {
    expect(truncate('short', 120)).toBe('short');
  });

  it('truncates and appends ellipsis when longer than limit', () => {
    expect(truncate('a very long string', 5)).toBe('a ver…');
  });

  it('returns empty string for null', () => {
    expect(truncate(null)).toBe('');
  });

  it('defaults to 120 character limit', () => {
    const long = 'a'.repeat(200);
    const result = truncate(long);
    expect(result).toHaveLength(121);
    expect(result).toMatch(/…$/);
  });
});
