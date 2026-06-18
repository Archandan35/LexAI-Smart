// Pure text-mining helpers used by logic layer (dates, parties, numbers).
// Deliberately provider-free so they can run anywhere.

const MONTHS = '(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)';

export function extractDates(text = '') {
  const out = new Set();
  const patterns = [
    /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/g,
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTHS}\\s+(\\d{4})\\b`, 'gi'),
    new RegExp(`\\b${MONTHS}\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, 'gi'),
  ];
  patterns.forEach((re) => {
    let m;
    while ((m = re.exec(text)) !== null) out.add(m[0]);
  });
  return [...out];
}

export function extractCaseNumbers(text = '') {
  const re = /\b(?:O\.?S\.?|C\.?S\.?|S\.?C\.?|Crl\.?|W\.?P\.?|R\.?S\.?A\.?|F\.?A\.?|M\.?A\.?|C\.?C\.?)\s*No\.?\s*\d+\s*\/?\s*\d{0,4}/gi;
  return [...new Set((text.match(re) || []).map((s) => s.trim()))];
}

export function extractPlotNumbers(text = '') {
  const re = /\b(?:Plot|Site|Survey|Sy\.?)\s*(?:No\.?)?\s*\d+[A-Za-z\/\-]*\b/gi;
  return [...new Set((text.match(re) || []).map((s) => s.trim()))];
}

export function extractKhataNumbers(text = '') {
  const re = /\bKhata\s*(?:No\.?)?\s*[\d\/\-]+/gi;
  return [...new Set((text.match(re) || []).map((s) => s.trim()))];
}

export function extractExhibits(text = '') {
  const re = /\b(?:Ex\.?|Exhibit|Annexure|Mark(?:ed)?)\s*[-:]?\s*[A-Z]?\d*[A-Za-z]?\b/gi;
  return [...new Set((text.match(re) || []).map((s) => s.trim()))].filter((s) => s.length <= 24);
}

export function extractParties(text = '') {
  const out = new Set();
  const re = /\b([A-Z][a-zA-Z.]+(?:\s+[A-Z][a-zA-Z.]+){0,3})\s+(?:vs\.?|versus|v\.)\s+([A-Z][a-zA-Z.]+(?:\s+[A-Z][a-zA-Z.]+){0,3})/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.add(m[1].trim());
    out.add(m[2].trim());
  }
  return [...out];
}

export function sentences(text = '') {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.?!])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function keywords(text = '', limit = 12) {
  const stop = new Set('the a an of to in and or for is are was were be been being on at by with as that this it its from not no shall will may any all such have has had he she they we you i'.split(' '));
  const freq = {};
  (text.toLowerCase().match(/[a-z]{4,}/g) || []).forEach((w) => {
    if (!stop.has(w)) freq[w] = (freq[w] || 0) + 1;
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([w]) => w);
}
