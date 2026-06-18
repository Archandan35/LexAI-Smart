// Client-side export helpers (no deps). Trigger a browser download of JSON/CSV.
import { nowISO } from './id.js';

function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportJson(name, data) {
  download(`${name}.json`, JSON.stringify(data, null, 2), 'application/json');
}

export function exportCsv(name, rows, columns) {
  const cols = columns || (rows[0] ? Object.keys(rows[0]) : []);
  const esc = (v) => {
    const s = v == null ? '' : String(typeof v === 'object' ? JSON.stringify(v) : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.map((c) => (typeof c === 'object' ? c.label : c)).join(',');
  const body = rows.map((r) => cols.map((c) => esc(r[typeof c === 'object' ? c.key : c])).join(',')).join('\n');
  download(`${name}.csv`, `${head}\n${body}`, 'text/csv');
}

// Trigger a download of an arbitrary blob/string with explicit extension (UDB backups).
export function downloadFile(filename, text, mime = 'application/octet-stream') {
  download(filename, text, mime);
}

export function stampName(prefix) {
  return `${prefix}_${nowISO().replace(/[:.]/g, '-')}`;
}

export default exportJson;
