// Universal schema — roles. Permissions live on roles.permissions[] plus the
// hierarchy flags; rbacLogic resolves effective permissions at runtime.
export const RolesSchema = {
  collection: 'roles',
  label: 'Roles',
  primaryKey: 'id',
  core: true,
  fields: {
    id: 'string',
    code: 'string',
    name: 'string',
    description: 'string',
    permissions: 'array',
    all: 'boolean',
    inherits: 'array',
    inherits_hierarchy: 'boolean',
    system: 'boolean',
    status: 'string',
    created_at: 'datetime',
    updated_at: 'datetime',
  },
  required: ['code', 'name'],
  defaults: {
    permissions: [],
    all: false,
    inherits: [],
    inheritsHierarchy: false,
    system: false,
    status: 'Active', // matches the app's existing convention (capitalised)
  },
  relations: [],
  indexes: ['code', 'status'],
  uniqueConstraints: [
    { field: 'code', name: 'uq_roles_code' },
  ],
};

export default RolesSchema;
