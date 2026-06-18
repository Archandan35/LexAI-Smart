// Universal schema — auditLogs. Append-only security/event trail.
export const AuditLogsSchema = {
  collection: 'auditLogs',
  label: 'Audit Logs',
  primaryKey: 'id',
  core: true,
  fields: {
    id: 'string',
    action: 'string',
    module: 'string',
    userId: 'string',
    userName: 'string',
    ip: 'string',
    at: 'datetime',
    details: 'string',
    meta: 'object',
  },
  required: ['action'],
  defaults: { ip: 'client' },
  relations: [
    { field: 'userId', references: 'users', on: 'id' },
  ],
  indexes: ['module', 'action', 'userId', 'at'],
};

export default AuditLogsSchema;
