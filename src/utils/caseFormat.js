// Case display helpers.

// Combined court display: "Civil Judge (Senior Division), Athgarh".
export function combinedCourt(c) {
  if (!c) return '';
  const hierarchy = c.court_hierarchy || c.court || '';
  const location = c.courtName || c.court_name || '';
  if (hierarchy && location) return `${hierarchy}, ${location}`;
  return hierarchy || location || '—';
}

export default combinedCourt;
