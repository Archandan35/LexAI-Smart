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
    role_code: 'string',
    extra_roles: 'array',
    grants: 'array',
    denies: 'array',
    status: 'string',
    salt: 'string',
    password_hash: 'string',
    created_at: 'datetime',
    updated_at: 'datetime',
    last_login_at: 'datetime',
  },
  required: ['name', 'role_code'],
  defaults: {
    extra_roles: [],
    grants: [],
    denies: [],
    status: 'Active', // matches the app's existing convention (capitalised)
  },
  relations: [
    { field: 'role_code', references: 'roles', on: 'code' },
  ],
  indexes: ['email', 'username', 'role_code', 'status'],
};

export default UsersSchema;
