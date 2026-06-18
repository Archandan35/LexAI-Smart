# LexAI — Database Architecture Audit Report

**Date:** 2026-06-18
**Scope:** Full `src/` deep scan ahead of the Universal Database Architecture refactor.
**Verdict:** The project already follows a clean, layered architecture with a provider-factory pattern. The data layer is **well abstracted but incomplete** — it lacks a schema layer, a migration/installer layer, a repository layer, a Firebase provider, and a provider-independent backup/`.udb` engine. Collection names are hardcoded as raw strings in ~15 service files, and the backup service bypasses the provider abstraction by touching `localStorage` directly.

This report is the baseline for Phases 1–5. **No code is changed by this document.**

---

## 1. Existing Structure

```
src/
├── app/
│   ├── App.jsx                     # ToastProvider → AuthProvider → AppDataProvider → Router
│   └── pages/                      # 33 route pages (see §2)
│
├── components/                     # 40 shared UI components (Button, Card, Modal, DataTable, …)
├── layouts/                        # AppLayout, Sidebar, Topbar
│
├── data-layer/                     # React context providers (app-wide state)
│   ├── AppDataContext.jsx          # shared case list (via caseLogic)
│   ├── AuthContext.jsx             # current user + resolved permissions (via rbacLogic)
│   └── ToastContext.jsx            # toast notifications
│
├── hooks/                          # 12 hooks (useCases, useUsers, useRoles, usePermissions, …)
│
├── logic/                          # 26 business-logic modules (caseLogic, backupLogic, rbacLogic, …)
│
├── services/                       # 26 services — the ONLY layer allowed to touch providers
│
├── providers/                      # vendor adapters behind uniform contracts
│   ├── ai/        (AIProvider, MockAIProvider, OpenAIProvider, index)
│   ├── auth/      (AuthProvider, LocalAuthProvider, SupabaseAuthProvider, index)
│   ├── citation/  (CitationProvider, IndianKanoonProvider, LocalCitationProvider, index)
│   ├── database/  (DatabaseProvider, LocalDatabaseProvider, SupabaseDatabaseProvider, MongoDatabaseProvider, index)
│   ├── ocr/       (OCRProvider, MockOCRProvider, index)
│   ├── search/    (SearchProvider, LocalSearchProvider, index)
│   └── storage/   (StorageProvider, LocalStorageProvider, SupabaseStorageProvider, GoogleDriveStorageProvider, index)
│
├── database/
│   └── seed.js                     # demo fixtures (cases, drafts, judgments, documents, hearings, notes, causeListTemplates)
│
├── config/        (config.js — ONLY reader of import.meta.env; featureFlags.js)
├── constants/     (acts, caseFolders, courts, draftTypes, envCatalog, messages, permissions)
├── routes/        (index.jsx, navigation.js)
├── utils/         (crypto, exportData, exportDoc, format, id, result, text, caseFormat)
└── styles/index.css                # SINGLE global stylesheet (all CSS lives here)
```

### Layer contract (from `ARCHITECTURE.md`, verified in code)

| Layer | Folder | May import | May NOT import |
|-------|--------|------------|----------------|
| Pages | `app/pages` | components, hooks, logic, constants, utils | services, providers, SDKs |
| Components | `components`, `layouts` | components, utils, constants, contexts | services, providers |
| Hooks | `hooks` | logic, utils | providers |
| Logic | `logic` | services, utils, constants | providers (uses services) |
| Services | `services` | provider factories (`providers/*/index.js`) | pages, logic |
| Providers | `providers/<kind>` | external SDKs/REST, config, seed | pages, logic, services |
| Config | `config` | env | everything (leaf) |

**Dependency arrow points strictly downward.** This audit confirms the rule holds (see §5 for the few caveats).

---

## 2. Existing Database Flow

Canonical flow per the architecture:

```
Page ──► Hook ──► Logic ──► Service ──► databaseService ──► DatabaseProvider ──► Database
                                          (façade)            (vendor adapter)
```

### Traced flows for major modules

**Cases (CaseVault / CaseDetail / Dashboard)**
```
CaseVault.jsx ─► useCases() ─► caseLogic ─► caseService
   caseService.listCases() ─► databaseService.list('cases') ─► getDatabaseProvider().list('cases') ─► localStorage 'lexai.db.v1'
```

**Drafting (DraftingStudio)**
```
DraftingStudio.jsx ─► draftingLogic ─► draftingService ─► databaseService.{list,create,update}('drafts') ─► provider
```

**Documents (DocumentReview / CaseVault)**
```
DocumentReview.jsx ─► documentReviewLogic ─► storageService ─► databaseService.*('documents') ─► provider
                                              + getStorageProvider()/getOCRProvider() for file bytes & OCR
```

**Users (UserManagement)**
```
UserManagement.jsx ─► useUsers() ─► userLogic ─► userService ─► databaseService.*('users') ─► provider
```

**Roles / Permissions (RoleManagement / PermissionManager / PermissionCenter)**
```
RoleManagement.jsx ─► useRoles() ─► roleLogic ─► roleService ─► databaseService.*('roles')
PermissionManager.jsx ─► usePermissions() ─► rbacLogic + permissionService ─► roleService + userService
   (permissions are stored on roles.permissions[] and on users.grants[]/users.denies[] — no standalone 'permissions' collection)
```

**Audit Logs (AuditLogs)**
```
AuditLogs.jsx ─► auditService ─► databaseService.*('auditLogs') ─► provider
   (auditService is invoked as a side-effect from most logic modules)
```

**Env / API Manager (EnvApiManager)**
```
EnvApiManager.jsx ─► envLogic ─► envService ─► databaseService.*('envVars' | 'configHistory') + auditService
```

**Backup & Recovery (BackupManagement / BackupHistory / BackupSettings)** — ⚠️ *deviates from the flow*
```
BackupManagement.jsx ─► backupLogic ─► backupService ─► localStorage 'lexai.db.v1' / 'lexai.backups.v1' / 'lexai.backup.settings.v1'
   (backupService DOES NOT go through databaseService / the provider — it reads the local blob directly)
```

**Auth (Login)**
```
Login.jsx ─► AuthContext ─► authLogic ─► authService ─► getAuthProvider()
   LocalAuthProvider additionally calls getDatabaseProvider() to look up the 'users' collection
```

---

## 3. Existing Collections / Tables (entities)

Every collection string referenced through `databaseService` across the service layer:

| Collection | Owner service | Seeded? | Notes |
|------------|---------------|---------|-------|
| `cases` | caseService | ✅ | core entity |
| `drafts` | draftingService | ✅ | linked by `caseId` |
| `documents` | caseService, storageService, searchService, storageStatsService, fileSyncService | ✅ | file metadata + OCR text |
| `hearings` | caseService | ✅ | linked by `caseId` |
| `notes` | caseService | ✅ | linked by `caseId` |
| `judgments` | (citation index via seed) | ✅ | local citation corpus |
| `causeListTemplates` | causeListLogic | ✅ | cause-list rendering |
| `caseFolders` | caseFolderService, storageStatsService | ❌ | created on demand |
| `caseHistory` | caseHistoryService | ❌ | per-case timeline |
| `caseActivity` | caseActivityService | ❌ | audit-style per-case activity |
| `caseStages` | caseStageService | ❌ | stage definitions |
| `reminders` | reminderService | ❌ | per-case reminders |
| `users` | userService | ❌ ⚠️ | **not in seed** — see §6 |
| `roles` | roleService | ❌ ⚠️ | **not in seed** — see §6 |
| `auditLogs` | auditService | ❌ | append-only security log |
| `envVars` | envService | ❌ | managed env overrides |
| `configHistory` | envService | ❌ | masked config-change log |

**Permissions** are *not* a standalone collection: they live as `roles.permissions[]` (+ `roles.all`, `roles.inheritsHierarchy`) and per-user `users.grants[]` / `users.denies[]`, resolved at runtime by `rbacLogic`. The permission catalog itself is a static constant (`constants/permissions.js`).

**Backup-only `localStorage` keys (outside the provider):**
- `lexai.db.v1` — the entire application database blob (also the LocalDatabaseProvider's store)
- `lexai.backups.v1` — backup catalog (records incl. payload)
- `lexai.backup.settings.v1` — backup retention/schedule settings

**Other `localStorage` keys (acceptable UI/session state):**
`lexai.session.v1` (auth session), `lexai.storage.v1` (LocalStorageProvider file bytes), `lexai.notifs.dismissed.v1`, `lexai.docview.v1`, `lexai.draftfolders.v1`, `lexai.autosave.v1`, `lexai.casefilters.v1`.

---

## 4. Existing Database Providers

| Provider | File | Status | Mechanism |
|----------|------|--------|-----------|
| `DatabaseProvider` (base) | `providers/database/DatabaseProvider.js` | ✅ | Abstract contract: `list/get/create/update/remove` + case convenience methods |
| `LocalDatabaseProvider` | `providers/database/LocalDatabaseProvider.js` | ✅ | `localStorage` (`lexai.db.v1`), seeded from `database/seed.js` |
| `SupabaseDatabaseProvider` | `providers/database/SupabaseDatabaseProvider.js` | ✅ | PostgREST `/rest/v1/<collection>` via `fetch` (no SDK) |
| `MongoDatabaseProvider` | `providers/database/MongoDatabaseProvider.js` | ✅ | MongoDB Atlas Data API over HTTPS `fetch` |
| `FirebaseDatabaseProvider` | — | ❌ **MISSING** | Registry comment claims firebase "follows the same contract" but no file exists |
| `sqlite` / `postgres` providers | — | ❌ | Mentioned in `.env.example` & registry comment; not implemented |

**Registry (`providers/database/index.js`):**
```js
const registry = {
  local:    () => new LocalDatabaseProvider(),
  supabase: () => new SupabaseDatabaseProvider(),
  mongodb:  () => new MongoDatabaseProvider(),
  // sqlite / postgres / firebase follow the same contract.  ← firebase NOT wired
};
```
Selection driven by `config.providers.database` (← `VITE_DATABASE_PROVIDER`). Singleton, with `resetDatabaseProvider()` for hot-swap.

**Current `DatabaseProvider` contract (the uniform surface):**
```
list(collection, query)   get(collection, id)   create(collection, record)
update(collection, id, patch)   remove(collection, id)
+ getCase/saveCase/updateCase/deleteCase convenience wrappers
```
All three concrete providers correctly return **truthful write results** (no false-success on RLS-filtered / no-match / quota-failed writes) — a good existing invariant to preserve.

---

## 5. Rule-Compliance Snapshot (current state)

| Rule | Status | Evidence |
|------|--------|----------|
| **R4** — no page/component/hook/logic/service imports a DB SDK directly | ✅ **Pass** | No `supabase`/`firebase`/`mongodb`/`mongoose`/`postgres` import anywhere outside `providers/database/`. SDK-free (REST/`fetch`-based) adapters. |
| **R4** — only providers import provider SDKs | ✅ Pass | All `@/providers/*` imports are confined to the `services/` layer (+ one provider→provider call: `LocalAuthProvider` reads `getDatabaseProvider()` for users — allowed). |
| **R5** — switch provider by changing one env var | ⚠️ **Partial** | True for `local`/`supabase`/`mongodb` *read/write*. **But:** `firebase` has no provider; backup/restore is hardwired to `localStorage`; no auto schema creation, so a fresh Supabase/Mongo/Firebase has empty tables and the app breaks until tables exist. |
| **R3** — CSS only in global files, no inline/JSX CSS | ✅ Pass (to preserve) | All styling flows through `styles/index.css` class names. New work must reuse existing classes. |
| **R1/R2** — don't break/delete working logic | ✅ baseline | Everything currently works on the `local` provider. |

---

## 6. Existing Problems (gap list for Phases 1–5)

1. **Hardcoded collection names.** Raw strings (`'cases'`, `'users'`, `'auditLogs'`, …) are scattered across ~15 service files. A typo silently creates a new empty collection. → *Phase 1 (schema) + Phase 3 (repositories) centralize these.*

2. **No schema layer.** There is no single source of truth for entities, their fields/types, or which collections must exist. Field shapes are implicit in `seed.js` and scattered create-calls. → *Phase 1.*

3. **No migration / installer layer.** Nothing runs `ensureSchema()` at startup. Fresh Supabase / Mongo / Firebase backends start with **no tables/collections**, so the app fails on first read/write. There is no `validateSchema()` / `repairSchema()`. → *Phase 2.*

4. **Missing Firebase provider.** `firebase` is selectable in `.env.example` and referenced in the registry comment, but `FirebaseDatabaseProvider.js` does not exist → selecting it silently falls back to `local`. Violates R5 for Firebase. → *Phase 2.*

5. **No repository layer.** Services call the generic `databaseService` with raw collection strings and ad-hoc queries. There is no per-entity API (`getById/getAll/query/count/bulkCreate/bulkDelete`); bulk delete is emulated with `for`-loops (`caseLogic.bulkRemove`). → *Phase 3.*

6. **Thin provider contract.** `DatabaseProvider` exposes only `list/get/create/update/remove`. Missing `count`, `bulkCreate`, `bulkDelete`, and a richer `query` (operators/sort/limit). → *Phase 2/3 extend the contract uniformly across all providers.*

7. **Backup engine is provider-specific.** `backupService` reads/writes `localStorage` (`lexai.db.v1`) **directly**, bypassing the provider. Backups therefore only work on the `local` provider; they cannot snapshot Supabase/Mongo/Firebase. → *Phase 5 makes export/import provider-agnostic (read all collections through the provider).* 

8. **No universal `.udb` package format.** A flat single-JSON snapshot exists (`backupLogic.buildSnapshot` → `{format:'UDB', schemaVersion, checksum, counts, data}`), but not the structured multi-part format (`manifest.json` / `schema.json` / `permissions.json` / `relationships.json` / `settings.json` + `data/` `attachments/` `logs/`) required for true cross-provider portability. → *Phase 5.*

9. **No seed/installer engine for auth & RBAC entities.** `seed.js` omits `users`, `roles`, `permissions`, `auditLogs`, `caseFolders`, `caseStages`, `reminders`, `envVars`, `configHistory`. There is no provider-agnostic "seed demo data" / "factory reset" engine. → *Phase 2 (seed engine) + Phase 4 (UI buttons).*

10. **No Database Manager UI.** `SystemSettings` links subsystems but offers no surface to view provider/connection/schema status or run Create/Repair/Validate/Seed/Reset/Clear/Import/Export. → *Phase 4.*

11. **Cloud backup destinations unimplemented.** Only local file download + `localStorage` exist. Google Drive / Mega / Terabox targets are referenced but not built. → *Phase 5 (pluggable backup destinations behind the storage-provider pattern).*

---

## 7. Target Architecture (what Phases 1–5 add)

```
                         ┌─────────────────────────────────────────────┐
   Pages / Hooks / Logic │            (UNCHANGED — same imports)        │
                         └───────────────────────┬─────────────────────┘
                                                  │ uses
   Services  ───────────────────────────────────►│ (refactored to call repositories)
                                                  │
   src/data-layer/  (Repository layer)            ▼
        usersRepository · rolesRepository · casesRepository · …  ◄── reads schema/
              create/update/delete/getById/getAll/query/count/bulkCreate/bulkDelete
                                                  │
   src/data-provider/                             ▼
        schema/        (Phase 1) ── single source of truth for every entity
        migrations/    (Phase 2) ── MigrationEngine.ensureSchema/validate/repair
                                     + Local/Supabase/Firebase/Mongo migrations + seed engine
                                                  │
   providers/database/  (existing, +Firebase, +extended contract)
        getDatabaseProvider()  ◄── VITE_DATABASE_PROVIDER  (the ONE switch — R5)
                                                  │
                                                  ▼
                          Local · Supabase · Firebase · MongoDB
```

**Switching databases stays a one-line change** (`VITE_DATABASE_PROVIDER=…`). Schema, repositories, services, pages, components, and CSS are untouched by a provider swap — the migration engine auto-creates/validates the schema on startup, and `.udb` export/import moves data between any two providers.

---

## 8. Constraints honored throughout the refactor

- **R1** No existing page/route/component/service/logic behaviour is removed or broken — repositories wrap the *existing* `databaseService` semantics; services keep their current public method names.
- **R2** Working business logic is refactored in place, never deleted.
- **R3** No inline/JSX CSS. The Database Manager UI reuses existing classes from `styles/index.css` (Card, Button, Badge, DataTable, PageHeader, etc.).
- **R4** Only `providers/database/*` import provider SDKs/REST. Schema, migrations, repositories, and services remain SDK-free.
- **R5** One env var (`VITE_DATABASE_PROVIDER`) selects everything; no other file edit is needed to change databases.

---

*End of audit. Proceeding to Phase 1 (Universal Schema Layer) on approval.*
