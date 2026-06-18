import OCRProvider from './OCRProvider.js';

// MockOCRProvider — returns embedded text for objects that already carry it
// (seed docs / .txt), otherwise a deterministic placeholder. Replace with
// Tesseract.js / AWS Textract / Google Vision behind the same contract.
export default class MockOCRProvider extends OCRProvider {
  async extract(file) {
    await new Promise((r) => setTimeout(r, 250));
    if (file && typeof file.text === 'string' && file.text) {
      return { text: file.text, engine: 'mock', confidence: 0.99 };
    }
    if (file && typeof file.arrayBuffer === 'function' && /text\//.test(file.type || '')) {
      const text = await file.text();
      return { text, engine: 'mock', confidence: 0.95 };
    }
    return {
      text: `[Mock OCR] Extracted text for "${file?.name || 'document'}". Configure a real OCR provider (VITE_OCR_PROVIDER) for true extraction.`,
      engine: 'mock',
      confidence: 0.5,
    };
  }
}
