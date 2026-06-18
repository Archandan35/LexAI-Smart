// Case display helpers.

// Combined court display: "Civil Judge (Senior Division), Athgarh".
export function combinedCourt(c) {
  if (!c) return '';
  const type = c.court || '';
  const name = c.courtName || '';
  if (type && name) return `${type}, ${name}`;
  return type || name || '—';
}

export default combinedCourt;
