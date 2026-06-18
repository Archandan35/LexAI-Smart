import { config } from '@/config/config.js';
import LocalSearchProvider from './LocalSearchProvider.js';

const registry = {
  local: () => new LocalSearchProvider(),
  // meilisearch / elastic implement the same SearchProvider contract.
};

let instance = null;

export function getSearchProvider() {
  if (instance) return instance;
  const make = registry[config.providers.search] || registry.local;
  instance = make();
  return instance;
}

export function resetSearchProvider() { instance = null; }

export default getSearchProvider;
