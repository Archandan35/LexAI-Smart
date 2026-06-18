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
    inheritsHierarchy: 'boolean',
    system: 'boolean',
    status: 'string',
    createdAt: 'datetime',
    updatedAt: 'datetime',
  },
  required: ['code', 'name'],
  defaults: {
    permissions: [],
    all: false,
    inheritsHierarchy: false,
    system: false,
    status: 'Active', // matches the app's existing convention (capitalised)
  },
  relations: [],
  indexes: ['code', 'status'],
};

export default RolesSchema;
