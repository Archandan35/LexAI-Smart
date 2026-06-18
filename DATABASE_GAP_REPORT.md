# LexAI — Database Gap Report

**Date:** 2026-06-18
**Scope:** Audit of the *current* Universal Database implementation against the 8 critical tasks, performed **before any new changes**.
**Method:** Full re-scan of `src/data-provider/`, `src/data-layer/repositories/`, `src/providers/database/`, the Database Manager stack, the backup stack, and a project-wide leakage grep.

---

## 0. Current state (what already exists)

| Area | Present | Files |
|------|---------|-------|
| Schema layer | ✅ 19 entity schemas + index | `data-provider/schema/*.schema.js`, `schema/index.js` |
| Migration engine | ✅ engine + 4 strategies | `data-provider/migrations/{MigrationEngine,Base,Local,Supabase,Firebase,Mongo}Migration.js` |
| Seed engine | ✅ demo + permissions + clear | `data-provider/seedEngine.js` |
| Repository layer | ✅ base + 19 repositories | `data-layer/repositories/*` |
| Providers | ✅ Local/Supabase/Firebase/Mongo (REST, no SDK) | `providers/database/*` |
| DB admin service | ✅ façade | `services/databaseAdminService.js` |
| Database Manager | ⚠️ partial | `app/pages/DatabaseManager.jsx`, `logic/databaseManagerLogic.js` |
| UDB engine | ⚠️ partial | `data-provider/udb/udbEngine.js` |
| Backup | ⚠️ local-only, bypasses provider | `services/backupService.js`, `logic/backupLogic.js` |

Build is green; app runs on `local`. R4 holds for **database SDKs** (none imported anywhere). The remaining work is depth, automation, and closing leakage.

---

## 1. Gap — Schema Compiler (Critical Task 1)

**Current:** Schemas are plain descriptor objects. `SupabaseMigration.sqlFor()` is the *only* place that turns a schema into a provider artifact (Postgres `CREATE TABLE`). There is **no SchemaCompiler**, no Firestore/Mongo/Local artifact generation, and the SQL logic is embedded in the migration strategy (not reusable, not a single source of truth).

**Missing:**
- `SchemaCompiler.js` with one entry point compiling any schema → provider-specific output.
- Supabase: `CREATE TABLE` / `ALTER TABLE` (additive column diffs) / `CREATE INDEX`.
- Firebase: collection definitions, validation rules, index definitions (`firestore.indexes.json` shape).
- MongoDB: mongoose-schema **definitions** (as data/source — mongoose is Node-only and must not be imported in the browser), `$jsonSchema` validators, index specs.
- Local: collection initialisation descriptors.

**Risk:** Medium. Browser cannot run mongoose or Postgres DDL directly — the compiler must *emit artifacts*; execution is the installer's job (Task 2).

---

## 2. Gap — Automatic Installer (Critical Task 2)

**Current:** `migrationEngine.ensureSchema()` runs at boot. For `local` it truly creates collections; for `mongo`/`firebase` it only probes (lazy create on first write); for `supabase` it **only generates SQL** and reports `needsManual`. There is **no Setup Wizard**, no "Install Database" one-click, no detection of a fresh/empty backend.

**Missing:**
- `DatabaseInstaller.js`: detect "no schema" → drive a full install per provider.
- Supabase auto-create via an `exec_sql` RPC path (so DDL *can* run from the browser when the project exposes the function); guided fallback when it doesn't.
- Firebase/Mongo: create collections (write-through) + indexes where the API allows + seed.
- A **Setup Wizard** UI surfaced on first run when the schema is absent.

**Risk:** High for Supabase/Mongo/Firebase (depends on backend-exposed capabilities); Low for Local. Honest fallbacks required.

---

## 3. Gap — Schema Versioning (Critical Task 3)

**Current:** A `SCHEMA_VERSION` constant exists in `schema/index.js` and is stamped into UDB exports. There is **no `schema_meta` table/collection**, no persisted installed version, no `getVersion()/upgrade()/rollback()`, and no migration-step registry.

**Missing:**
- `schema_meta` entity `{ version, provider, installedAt, updatedAt }`.
- A versioned migration registry with ordered upgrade steps + inverse rollback steps.
- `getVersion() / upgrade() / rollback()` that never destroy existing data.

**Risk:** Medium. Must be idempotent and non-destructive.

---

## 4. Gap — Database Health Engine (Critical Task 4)

**Current:** `migrationEngine.validateSchema()` reports only present/missing **collections**. There is **no health service** covering fields, indexes, relations, version mismatch, or provider mismatch, and no consolidated `scan/repair/validate`.

**Missing:**
- `DatabaseHealthService.js`: `scan()` (missing tables/collections/fields/indexes, broken relations, version mismatch, provider mismatch), `repair()`, `validate()`.
- Field-level checks (sample rows vs schema fields), relation integrity (orphan FKs), version/provider drift vs `schema_meta`.

**Risk:** Medium. Field/index introspection is limited on some browser APIs — degrade gracefully.

---

## 5. Gap — Database Manager completeness (Critical Task 5)

**Current sections:** Provider, Schema (Create/Repair/Validate), Data (Seed/Reset/Clear), Import/Export, Backup, Provider SQL.

**Missing:**
- **Overview**: database version (from `schema_meta`) vs schema version, health status badge.
- **Health**: schema issues list + repair suggestions; **Scan / Repair / Validate** buttons.
- **Migration**: **Install / Upgrade / Rollback** buttons.
- **Statistics**: explicit Users / Roles / Cases / Documents counts + **Storage Used**.

**Risk:** Low (UI only, reuses existing CSS classes — no inline/JSX CSS).

---

## 6. Gap — UDB Engine completeness (Critical Task 6)

**Current:** Single self-describing JSON with `manifest/schema/permissions/relationships/settings/data/attachments(empty)/logs` + one checksum. No explicit `version.json` section, no per-section integrity, and **no named** `validateUDB() / repairUDB() / verifyChecksums()`. Attachments are always empty.

**Missing:**
- Explicit `version` section (`{ udbVersion, schemaVersion, provider, appVersion }`).
- `validateUDB()` (structure + section presence), `repairUDB()` (fill missing sections, coerce shapes), `verifyChecksums()` (global + per-section).
- Attachment capture (best-effort from the storage provider) + manifest accounting.

**Risk:** Low–Medium. Must keep backward-compatible with v2 `.udb` already produced.

---

## 7. Gap — Backup Engine (Critical Task 7)

**Current:** `backupService` reads/writes `localStorage` (`lexai.db.v1`, `lexai.backups.v1`, `lexai.backup.settings.v1`) **directly** — so backups only work on `local` and the path bypasses the provider abstraction entirely. `backupLogic` handles snapshot/retention/restore/protect for that local blob. `databaseManagerLogic.backupTo()` downloads `.udb` locally and stubs the cloud targets.

**Missing:**
- `BackupManager.js`: unified manual + scheduled backups, restore, retention rules — built on the **provider-agnostic UDB snapshot**, not the local blob.
- Backup **destinations** behind an abstraction: Local Download (works), Google Drive / Mega / Terabox (need a backend; honest, pluggable stubs mirroring the storage-provider pattern).
- Scheduling (interval/retention) persisted in the provider-agnostic `settings` collection, not a `localStorage` key.

**Risk:** Medium. Cloud destinations require a backend for secrets; scheduling in a SPA is best-effort (on-load catch-up).

---

## 8. Gap — Provider leakage (Critical Task 8)

Project-wide grep for `localStorage` / provider names **outside** `src/providers/`:

**Real leakage (must fix):**
- `services/backupService.js` — direct `localStorage` for the DB blob, catalog, settings. **Critical**: bypasses the provider; the single biggest violation.
- UI-preference `localStorage` (client UI state, but still outside providers):
  - `app/pages/CaseVault.jsx` → `lexai.casefilters.v1`
  - `app/pages/DraftingStudio.jsx` → `lexai.draftfolders.v1`, `lexai.autosave.v1`
  - `components/DocumentManager.jsx` → `lexai.docview.v1`
  - `logic/notificationLogic.js` → `lexai.notifs.dismissed.v1`

**Not leakage (acceptable / by-design):**
- `config/config.js` — the single env reader (provider names are the whole point).
- `constants/envCatalog.js` — catalog of env-var *names* for the Env Manager.
- `data-provider/migrations/*` — provider-keyed migration *strategies* (no SDKs; call generic provider methods). Will be backed by the new SchemaCompiler.
- `app/pages/{DatabaseManager,StorageSettings,SystemSettings}.jsx`, `services/envService.js` — *display* the configured provider name / read config for the Env UI. No data access.
- Comments mentioning `localStorage` in `LocalMigration.js`, `settings.schema.js`, `crypto.js`.

**Fix plan:** route `backupService` through the provider (snapshot/restore) + store backup catalog/settings in the `settings`/UDB path; introduce a `preferences` provider + service so UI prefs no longer touch `localStorage` directly.

**Risk:** Medium for `backupService` (behavioural — must preserve existing backup UX); Low for UI prefs.

---

## 9. Consolidated gap matrix

| Task | Exists | Gap size | Risk | Browser constraint to be honest about |
|------|--------|----------|------|----------------------------------------|
| 1 SchemaCompiler | partial (Supabase SQL only) | Large | Med | mongoose can't run client-side → emit definitions |
| 2 Installer | partial (local only) | Large | High | Supabase DDL needs `exec_sql` RPC; else guided |
| 3 Versioning | none (constant only) | Med | Med | — |
| 4 Health engine | none (collection check only) | Large | Med | field/index introspection limited remotely |
| 5 DB Manager | partial | Med | Low | — |
| 6 UDB engine | partial | Med | Low–Med | keep v2 compatibility |
| 7 Backup engine | partial (local, leaky) | Large | Med | cloud destinations need backend |
| 8 Leakage | mostly clean; backup leaks | Med | Med | — |

---

## 10. Execution order (non-breaking, additive-first)

1. **SchemaCompiler** (pure, additive) → 2. **Versioning (`schema_meta`)** → 3. **Installer** (uses 1+2) → 4. **Health engine** (uses 1+2) → 5. **UDB completion** → 6. **BackupManager** + **leakage removal** (backupService onto provider; preferences provider) → 7. **Database Manager** wiring of all of the above → 8. reports + final acceptance test.

Every step keeps the build green and preserves all existing pages, routes, services, logic, permissions, and styling. Provider-specific code stays in `providers/` and the new `data-provider/` schema-compilation layer (which imports **no** SDK).

*End of gap report. Proceeding to implementation on this plan.*
