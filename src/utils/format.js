import { useState, useEffect } from 'react';
import { DateEngine } from '@/core/DateEngine.js';
import { settingsCache } from '@/core/settingsCache.js';

export function useFormat() {
  const [, setTick] = useState(0);
  useEffect(() => settingsCache.subscribe(() => setTick(t => t + 1)), []);
  return { formatDate, formatDateTime, fromNow };
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return DateEngine.formatDate(value);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const date = DateEngine.formatDate(value);
  const time = DateEngine.formatTime(value);
  return `${date} ${time}`;
}

export function fromNow(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function bytes(n) {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / 1024 ** i).toFixed(1)} ${units[i]}`;
}

export function stripHtml(str) {
  if (!str) return '';
  // Add spacing after block closing tags to prevent text concatenation
  let text = str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    // Ensure space between adjacent tags so inline elements don't concatenate
    .replace(/>(\s*)</g, '> <')
    .replace(/<[^>]*>/g, '');
  // Decode HTML entities via textarea (handles &amp; &lt; &gt; &quot; &nbsp; &#39; etc.)
  const el = document.createElement('textarea');
  el.innerHTML = text;
  text = el.value;
  return text;
}

export function truncate(str, len = 120) {
  if (!str) return '';
  return str.length > len ? `${str.slice(0, len)}…` : str;
}
