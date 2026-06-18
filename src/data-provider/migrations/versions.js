import { SCHEMA_VERSION } from '@/data-provider/schema/index.js';

// Ordered, reversible migration steps. Each step:
//   { version, description, up({provider}), down({provider}) }
// `up` transforms an existing install FORWARD to `version`; `down` reverses it.
// Steps must be additive and non-destructive (never drop data on upgrade).
//
// The current schema is the BASELINE. When the universal schema changes, bump
// SCHEMA_VERSION and append a new step here with the data transform — existing
// installations then upgrade incrementally without a reinstall.
export const MIGRATIONS = [
  {
    version: SCHEMA_VERSION,
    description: 'Baseline universal schema',
    async up() { /* baseline — collections created by the installer */ },
    async down() { /* baseline cannot be rolled back below itself */ },
  },
  // Example shape for a future migration (kept commented as a template):
  // {
  //   version: SCHEMA_VERSION + 1,
  //   description: 'Add cases.priority',
  //   async up({ provider }) {
  //     const rows = await provider.list('cases', {});
  //     for (const r of rows) if (r.priority == null) await provider.update('cases', r.id, { priority: 'normal' });
  //   },
  //   async down({ provider }) {
  //     const rows = await provider.list('cases', {});
  //     for (const r of rows) if ('priority' in r) await provider.update('cases', r.id, { priority: undefined });
  //   },
  // },
];

export const BASELINE_VERSION = MIGRATIONS[0].version;

export default MIGRATIONS;
