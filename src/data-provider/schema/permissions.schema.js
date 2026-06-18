// Universal schema — permissions catalog. The authoritative permission list is
// the static constant constants/permissions.js; this collection mirrors it so a
// backend can store/extend the catalog and the Database Manager can report it.
// rbacLogic still resolves effective permissions from roles + user overrides.
export const PermissionsSchema = {
  collection: 'permissions',
  label: 'Permissions',
  primaryKey: 'id',
  core: true,
  fields: {
    id: 'string',
    code: 'string', // e.g. "cases.create"
    module: 'string',
    action: 'string',
    label: 'string',
    description: 'string',
  },
  required: ['code'],
  defaults: {},
  relations: [],
  indexes: ['code', 'module'],
};

export default PermissionsSchema;
