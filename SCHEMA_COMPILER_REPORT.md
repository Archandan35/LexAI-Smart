# Schema Compiler Report (Critical Task 1)

## Summary
Added a single-source schema compiler that turns the universal schema descriptors
into provider-specific artifacts. No schema shape is duplicated anywhere else —
the Supabase migration now delegates its DDL generation to the compiler.

## Capabilities
- **Input:** any universal schema (Users/Roles/Cases/Documents/Settings/… all 20).
- **Supabase:** `CREATE TABLE`, `CREATE INDEX`, additive `ALTER TABLE ... ADD COLUMN` diffs.
- **Firebase:** collection definitions, Firestore **security-rule** validation blocks, `firestore.indexes.json`-shaped index defs.
- **MongoDB:** **mongoose schema definitions** (emitted as source — mongoose is Node-only and is never imported in the browser), `$jsonSchema` validators, index specs.
- **Local:** collection init descriptors (fields + defaults).
- `SchemaCompiler.installArtifact(provider)` returns a ready-to-use install bundle per provider.

## Files Created
- `src/data-provider/schema/SchemaCompiler.js`

## Files Modified
- `src/data-provider/migrations/SupabaseMigration.js` — `sqlFor()`/`installSql()` now delegate to `SchemaCompiler` (removed the duplicated `PG_TYPES`/hand-built DDL).

## Files Removed
- None.

## Risk Level
**Low** — additive module + a delegation refactor. Build verified.

## Rollback Plan
Delete `SchemaCompiler.js` and restore the previous inline `PG_TYPES`/`sqlFor` block in `SupabaseMigration.js` (git revert of that file).

## Completion
**100%** — all four providers emit artifacts. Note (by design, browser-honest): mongoose/Postgres DDL are *emitted*; execution is the installer's job.
