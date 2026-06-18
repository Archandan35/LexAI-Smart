// Lightweight id + timestamp helpers (no external deps).
export function uid(prefix = 'id') {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${rand}`;
}

export function nowISO() {
  return new Date().toISOString();
}

export default uid;
