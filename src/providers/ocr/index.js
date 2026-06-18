import { config } from '@/config/config.js';
import MockOCRProvider from './MockOCRProvider.js';

const registry = {
  mock: () => new MockOCRProvider(),
  // tesseract / textract / gvision implement the same OCRProvider contract.
};

let instance = null;

export function getOCRProvider() {
  if (instance) return instance;
  const make = registry[config.providers.ocr] || registry.mock;
  instance = make();
  return instance;
}

export function resetOCRProvider() { instance = null; }

export default getOCRProvider;
