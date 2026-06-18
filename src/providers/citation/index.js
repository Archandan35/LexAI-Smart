import { config } from '@/config/config.js';
import LocalCitationProvider from './LocalCitationProvider.js';
import IndianKanoonProvider from './IndianKanoonProvider.js';

const registry = {
  local: () => new LocalCitationProvider(),
  indiankanoon: () => new IndianKanoonProvider(),
  // casemine / verdictum / sci-portal implement the same CitationProvider contract.
};

let instance = null;

export function getCitationProvider() {
  if (instance) return instance;
  const make = registry[config.providers.citation] || registry.local;
  instance = make();
  return instance;
}

export function resetCitationProvider() { instance = null; }

export default getCitationProvider;
