export const ChangelogEntriesSchema = {
  collection: 'changelog_entries',
  label: 'Changelog Entries',
  primaryKey: 'id',
  core: true,
  fields: {
    id: 'string',
    release_id: 'string',
    type: 'string',
    category: 'string',
    title: 'string',
    description: 'string',
    author: 'string',
    related_issue: 'string',
    sort_order: 'number',
    created_at: 'datetime',
    created_by: 'string',
  },
  required: ['release_id', 'type', 'category', 'title'],
  defaults: {
    sort_order: 0,
  },
  relations: [
    {
      type: 'belongs_to',
      entity: 'changelog_releases',
      field: 'release_id',
      target: 'id',
    },
  ],
  indexes: ['release_id', 'type', 'category'],
};

export default ChangelogEntriesSchema;
