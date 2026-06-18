import { getOCRProvider } from '@/providers/ocr/index.js';

// ocrService — text extraction façade over the active OCRProvider.
export const ocrService = {
  extract: (file, opts) => getOCRProvider().extract(file, opts),
};

export default ocrService;
