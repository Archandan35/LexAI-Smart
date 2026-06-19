// Modular migration steps — ordered dependency chain
// Each step is executed sequentially; version tracks the step number.
import { version as v1, description as d1, sql as s1 } from './001-migration-registry.js';
import { version as v2, description as d2, sql as s2 } from './002-security.js';
import { version as v3, description as d3, sql as s3 } from './003-registry-tables.js';
import { version as v4, description as d4, sql as s4 } from './004-mapping-tables.js';
import { version as v5, description as d5, sql as s5 } from './005-provider-tables.js';
import { version as v6, description as d6, sql as s6 } from './006-id-engine.js';
import { version as v7, description as d7, sql as s7 } from './007-supabase-auth.js';
import { version as v8, description as d8, sql as s8 } from './008-foreign-keys.js';
import { version as v9, description as d9, sql as s9 } from './009-rls.js';

export const migrationSteps = [
  { version: v1, description: d1, sql: s1 },
  { version: v2, description: d2, sql: s2 },
  { version: v3, description: d3, sql: s3 },
  { version: v4, description: d4, sql: s4 },
  { version: v5, description: d5, sql: s5 },
  { version: v6, description: d6, sql: s6 },
  { version: v7, description: d7, sql: s7 },
  { version: v8, description: d8, sql: s8 },
  { version: v9, description: d9, sql: s9 },
];

export const TOTAL_STEPS = migrationSteps.length;
export default migrationSteps;
