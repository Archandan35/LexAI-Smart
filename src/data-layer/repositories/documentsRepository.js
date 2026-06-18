import { createRepository } from './baseRepository.js';

// documentsRepository — case/draft file metadata + OCR text.
export const documentsRepository = createRepository('documents');
export default documentsRepository;
