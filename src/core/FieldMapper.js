// FieldMapper — maps LexAI canonical field names ↔ provider-specific column names.
//
// LexAI fields (used everywhere in code):   id, name, createdAt, updatedAt
// Provider fields (actual database columns): id, full_name, created_at, modified_at
//
// The mapping store can be configured:
//   FieldMapper.setFieldMapping('users', 'name', 'full_name');
//   FieldMapper.setFieldMapping('users', 'createdAt', 'created_at');
//
// After that, FieldMapper.toProvider('users', { name: 'Alice', createdAt: '2024-01-01' })
// returns { full_name: 'Alice', created_at: '2024-01-01' }.
//
// And FieldMapper.toLexAI('users', { full_name: 'Alice', created_at: '2024-01-01' })
// returns { name: 'Alice', createdAt: '2024-01-01' }.

let _fieldMappings = {}; // { entityName: { lexAIField: providerField } }

export const FieldMapper = {
  // Set a field mapping for an entity.
  setFieldMapping(entityName, lexAIField, providerField) {
    if (!_fieldMappings[entityName]) _fieldMappings[entityName] = {};
    _fieldMappings[entityName][lexAIField] = providerField;
  },

  // Set multiple field mappings at once.
  setFieldMappings(entityName, mappings) {
    if (!_fieldMappings[entityName]) _fieldMappings[entityName] = {};
    Object.assign(_fieldMappings[entityName], mappings);
  },

  // Get provider column name for a LexAI field.
  toProviderField(entityName, lexAIField) {
    return _fieldMappings[entityName]?.[lexAIField] || lexAIField;
  },

  // Get LexAI field name from a provider column name.
  toLexAIField(entityName, providerField) {
    const map = _fieldMappings[entityName];
    if (!map) return providerField;
    const entry = Object.entries(map).find(([, v]) => v === providerField);
    return entry ? entry[0] : providerField;
  },

  // Translate an entire record from LexAI fields to provider fields.
  toProvider(entityName, record = {}) {
    const map = _fieldMappings[entityName];
    if (!map) return { ...record };
    const out = {};
    for (const [key, val] of Object.entries(record)) {
      out[map[key] || key] = val;
    }
    return out;
  },

  // Translate an entire record from provider fields to LexAI fields.
  toLexAI(entityName, record = {}) {
    if (!record) return record;
    const map = _fieldMappings[entityName];
    if (!map) return { ...record };
    const reverseMap = {};
    for (const [k, v] of Object.entries(map)) reverseMap[v] = k;
    const out = {};
    for (const [key, val] of Object.entries(record)) {
      out[reverseMap[key] || key] = val;
    }
    return out;
  },

  // Translate a query filter from LexAI fields to provider fields.
  filterToProvider(entityName, filter = {}) {
    const map = _fieldMappings[entityName];
    if (!map) return { ...filter };
    const out = {};
    for (const [key, val] of Object.entries(filter)) {
      out[map[key] || key] = val;
    }
    return out;
  },

  // Get all field mappings for an entity.
  getMappings(entityName) {
    return { ...(_fieldMappings[entityName] || {}) };
  },

  // Clear all mappings (for testing / re-initialization).
  reset() {
    _fieldMappings = {};
  },
};

export default FieldMapper;
