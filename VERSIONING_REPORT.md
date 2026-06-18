# Schema Versioning Report (Critical Task 3)

## Summary
Added a provider-agnostic `schema_meta` record and a version manager with
`getVersion / upgrade / rollback`, backed by an ordered, reversible migration
registry. Upgrades and rollbacks never destroy data.

## schema_meta
`{ id, version, provider, appVersion, installedAt, updatedAt, history[] }` — one
row per backend. `history` records each install/upgrade/rollback.

## Functions
- `getVersion()` — installed version, or 0 if none. **Self-heals** a pre-versioning install (collections already populated, no `schema_meta`) by stamping the current version, so existing local users never see a wizard.
- `upgrade(target)` — runs ordered forward steps `(current, target]`, then stamps.
- `rollback(target)` — runs inverse steps `down` from current to target, then stamps.
- Migration steps live in `versions.js` (baseline = current `SCHEMA_VERSION`; future schema changes append a reversible step).

## Files Created
- `src/data-provider/schema/schemaMeta.schema.js`
- `src/data-layer/repositories/schemaMetaRepository.js`
- `src/data-provider/migrations/versions.js`
- `src/data-provider/migrations/SchemaVersionManager.js`

## Files Modified
- `src/data-provider/schema/index.js` — registered `schema_meta` (first, no relations).
- `src/data-layer/repositories/index.js` — registered `schemaMetaRepository`.
- `src/services/databaseAdminService.js` — `targetVersion/getVersion/getMeta/upgrade/rollback`.

## Files Removed
- None.

## Risk Level
**Medium** — idempotent and additive; self-heal avoids disrucsting existing installs.

## Rollback Plan
Remove `schema_meta` from `schema/index.js` + `repositories/index.js`, delete the four created files, and drop the version methods from `databaseAdminService`. The `schema_meta` row is inert if unused.

## Completion
**100%** — version lifecycle implemented; registry framework ready for future steps (baseline step shipped).
