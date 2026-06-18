import { config } from '@/config/config.js';
import MockAIProvider from './MockAIProvider.js';
import OpenAIProvider from './OpenAIProvider.js';

// AI provider factory. Add a vendor here; the rest of the app is untouched.
// claude/gemini/ollama/deepseek/qwen would follow the OpenAIProvider template.
const registry = {
  mock: () => new MockAIProvider(),
  openai: () => new OpenAIProvider(),
  // claude: () => new ClaudeProvider(),
  // gemini: () => new GeminiProvider(),
  // ollama: () => new OllamaProvider(),
};

let instance = null;

export function getAIProvider() {
  if (instance) return instance;
  const make = registry[config.providers.ai] || registry.mock;
  instance = make();
  return instance;
}

export function resetAIProvider() { instance = null; }

export default getAIProvider;
