import { createRepository } from './baseRepository.js';

// schemaMetaRepository — installed schema version + history (one row).
export const schemaMetaRepository = createRepository('schema_meta');
export default schemaMetaRepository;
