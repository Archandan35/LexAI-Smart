// Universal schema — users. Provider-agnostic: no SDK, no provider-specific types.
// Consumed by the migration engine (table/collection creation) and the
// repository layer (field validation / defaults). See schema/index.js.
export const UsersSchema = {
  collection: 'users',
  label: 'Users',
  primaryKey: 'id',
  core: true, // part of the minimum install set created on a fresh provider
  fields: {
    id: 'string',
    name: 'string',
    email: 'string',
    username: 'string',
    roleCode: 'string',
    extraRoles: 'array',
    grants: 'array',
    denies: 'array',
    status: 'string',
    salt: 'string',
    passwordHash: 'string',
    createdAt: 'datetime',
    updatedAt: 'datetime',
    lastLoginAt: 'datetime',
  },
  required: ['name', 'roleCode'],
  defaults: {
    extraRoles: [],
    grants: [],
    denies: [],
    status: 'Active', // matches the app's existing convention (capitalised)
  },
  relations: [
    { field: 'roleCode', references: 'roles', on: 'code' },
  ],
  indexes: ['email', 'username', 'roleCode', 'status'],
};

export default UsersSchema;
