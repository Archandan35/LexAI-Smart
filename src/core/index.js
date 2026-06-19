// Core — LexAI's provider-agnostic foundation layer.
// Everything above this layer uses ONLY these exports.
// Nothing in pages, components, hooks, services, or logic
// may import from providers or data-provider directly.

export { EntityRegistry } from './EntityRegistry.js';
export { FieldMapper } from './FieldMapper.js';
export { IDEngine } from './IDEngine.js';
export { DateEngine } from './DateEngine.js';
