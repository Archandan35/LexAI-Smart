// Case display helpers.

// Combined court display: "Civil Judge (Senior Division), Athgarh".
export function combinedCourt(c) {
  if (!c) return '';
  if (c.court_name || c.courtName) return c.court_name || c.courtName;
  const hierarchy = c.court || '';
  const location = c.jurisdiction || '';
  if (hierarchy && location) return `${hierarchy}, ${location}`;
  return hierarchy || location || '—';
}

// Extract jurisdiction from a case record.
// jurisdiction is stored as the second part of court_name ("hierarchy, jurisdiction").
export function extractJurisdiction(c) {
  if (!c) return '';
  const name = c.court_name || c.courtName || '';
  const idx = name.indexOf(', ');
  return idx > 0 ? name.slice(idx + 2).trim() : '';
}

export default combinedCourt;
