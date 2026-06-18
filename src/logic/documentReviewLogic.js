import { ocrService } from '@/services/ocrService.js';
import {
  extractDates, extractCaseNumbers, extractPlotNumbers,
  extractKhataNumbers, extractParties, extractExhibits,
} from '@/utils/text.js';
import { ok, fail } from '@/utils/result.js';

// documentReviewLogic — OCR + structured entity extraction from uploaded files.
// Extracts dates, plot numbers, khata numbers, parties, case numbers, exhibits.
export const documentReviewLogic = {
  async review(file) {
    if (!file) return fail('Select a document to review.');
    try {
      const { text } = await ocrService.extract(file);
      return ok({ text, entities: this.extractEntities(text) });
    } catch (e) {
      return fail(e);
    }
  },

  reviewText(text) {
    return ok({ text, entities: this.extractEntities(text) });
  },

  extractEntities(text = '') {
    return {
      dates: extractDates(text),
      caseNumbers: extractCaseNumbers(text),
      plotNumbers: extractPlotNumbers(text),
      khataNumbers: extractKhataNumbers(text),
      parties: extractParties(text),
      exhibits: extractExhibits(text),
    };
  },
};

export default documentReviewLogic;
