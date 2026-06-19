import { createRepository } from './baseRepository.js';

// auditLogsRepository — append-only security/event trail.
export const auditLogsRepository = createRepository('audit_logs');
export default auditLogsRepository;
