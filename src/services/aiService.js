import { getAIProvider } from '@/providers/ai/index.js';

// aiService — façade over the active AIProvider. The single choke point for all
// model calls, so the citation guardrail can be reasoned about in one place:
// the AI is NEVER asked to emit citations; that is the CitationProvider's job.
export const aiService = {
  ask: (prompt) => getAIProvider().ask(prompt),
  chat: (messages) => getAIProvider().chat(messages),
  analyzeDocument: (document) => getAIProvider().analyzeDocument(document),
  generateDraft: (data) => getAIProvider().generateDraft(data),
};

export default aiService;
