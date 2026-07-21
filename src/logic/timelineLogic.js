import { ocrService } from '@/services/ocrService.js';
import { extractDates, sentences } from '@/utils/text.js';
import { ok, fail } from '@/utils/result.js';

// timelineLogic — builds a chronology from one or more documents. Runs OCR for
// images/PDFs (via the OCR provider), mines dates, and pairs each date with the
// sentence it appears in to form an event.
export const timelineLogic = {
  async buildFromDocuments(docs = []) {
    if (!docs.length) return fail('Add at least one document to build a timeline.');
    try {
      const events = [];
      for (const doc of docs) {
        let text = doc.text || '';
        if (!text) {
          try { ({ text } = await ocrService.extract(doc)); } catch { text = ''; }
        }
        const sents = sentences(text);
        sents.forEach((s) => {
          extractDates(s).forEach((d) => {
            events.push({
              date: d,
              sortKey: toSortKey(d),
              event: s.trim().slice(0, 220),
              source: doc.name || 'document',
            });
          });
        });
      }
      events.sort((a, b) => a.sortKey - b.sortKey);
      return ok({ events, count: events.length });
    } catch (e) {
      return fail(e);
    }
  },

  buildFromText(text, source = 'pasted text') {
    const events = [];
    sentences(text).forEach((s) => {
      extractDates(s).forEach((d) => {
        events.push({ date: d, sortKey: toSortKey(d), event: s.trim().slice(0, 220), source });
      });
    });
    events.sort((a, b) => a.sortKey - b.sortKey);
    return { events, count: events.length };
  },
};

function toSortKey(dateStr) {
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) return d.getTime();
  // dd/mm/yyyy fallback
  const m = dateStr.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
    return new Date(`${yr}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T00:00:00.000Z`).getTime() || 0;
  }
  return 0;
}

export default timelineLogic;
