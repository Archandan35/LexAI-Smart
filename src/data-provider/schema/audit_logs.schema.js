// Universal schema — auditLogs. Append-only security/event trail.
export const AuditLogsSchema = {
  collection: 'audit_logs',
  label: 'Audit Logs',
  primaryKey: 'id',
  core: true,
  fields: {
    id: 'string',
    action: 'string',
    module: 'string',
    user_id: 'string',
    user_name: 'string',
    ip: 'string',
    at: 'datetime',
    details: 'string',
    meta: 'object',
  },
  required: ['action'],
  defaults: { ip: 'client' },
  relations: [
    { field: 'user_id', references: 'users', on: 'id' },
  ],
  indexes: ['module', 'action', 'user_id', 'at'],
};

export default AuditLogsSchema;
