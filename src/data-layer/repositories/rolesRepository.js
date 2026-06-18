import { createRepository } from './baseRepository.js';

// rolesRepository — role definitions (permissions live on role.permissions[]).
export const rolesRepository = createRepository('roles');
export default rolesRepository;
