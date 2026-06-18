import { aiService } from './aiService.js';

// analysisService — wraps AI document analysis. Pure pass-through to the AI
// provider; the heuristic reasoning lives in the logic layer so it works even
// with the mock model.
export const analysisService = {
  analyzeDocument: (document) => aiService.analyzeDocument(document),
  ask: (prompt) => aiService.ask(prompt),
};

export default analysisService;
