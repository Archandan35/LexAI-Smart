import { createRepository } from './baseRepository.js';

// permissionsRepository — the permission catalog (module.action rows).
export const permissionsRepository = createRepository('permissions');
export default permissionsRepository;
