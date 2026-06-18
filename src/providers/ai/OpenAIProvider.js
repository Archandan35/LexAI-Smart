import AIProvider from './AIProvider.js';
import { config } from '@/config/config.js';

// OpenAIProvider — reference implementation of a real vendor. Same contract as
// MockAIProvider. Swapping to OpenAI requires only VITE_AI_PROVIDER=openai and a
// key; no page or logic file changes. (Network call kept minimal/dependency-free.)
export default class OpenAIProvider extends AIProvider {
  constructor() {
    super();
    this.apiKey = config.credentials.openaiApiKey;
    this.model = 'gpt-4o-mini';
    this.base = 'https://api.openai.com/v1/chat/completions';
  }

  async #complete(messages, { json = false } = {}) {
    if (!this.apiKey) throw new Error('OpenAI API key not configured (VITE_OPENAI_API_KEY).');
    const res = await fetch(this.base, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  async ask(prompt) {
    return this.#complete([
      { role: 'system', content: GUARDRAIL },
      { role: 'user', content: prompt },
    ]);
  }

  async chat(messages) {
    return this.#complete([{ role: 'system', content: GUARDRAIL }, ...messages]);
  }

  async analyzeDocument(document) {
    const raw = await this.#complete(
      [
        { role: 'system', content: `${GUARDRAIL} Respond as JSON with keys summary (string) and observations (string[]).` },
        { role: 'user', content: `Analyze this litigation document:\n\n${document?.text || ''}` },
      ],
      { json: true }
    );
    try { return JSON.parse(raw); } catch { return { summary: raw, observations: [] }; }
  }

  async generateDraft(data) {
    return this.#complete([
      { role: 'system', content: `${GUARDRAIL} You are an Indian litigation drafting assistant. Produce a formal, court-ready draft. Leave blanks where facts are unknown rather than inventing them.` },
      { role: 'user', content: `Draft a ${data?.type}. Inputs: ${JSON.stringify(data)}` },
    ]);
  }
}

const GUARDRAIL =
  'You assist with Indian litigation. NEVER invent case citations, judgment names, paragraph numbers, or authorities. If a precedent is needed, say a verified citation must be retrieved via the citation search. Do not hallucinate.';
