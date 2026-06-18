# LexAI — Universal Database Architecture

This document describes the database architecture added on top of LexAI's existing
clean-architecture layering. **No existing feature, page, route, component, service,
business rule, permission, or style was removed** — the refactor is additive and
the app continues to run on the `local` provider exactly as before.

## The one switch (Rule 5)

Change a single environment variable to change databases — nothing else:

```env
VITE_DATABASE_PROVIDER=local      # → supabase | firebase | mongodb
```

On the next boot the **migration engine** ensures the schema exists on that backend,
and the app keeps working. Data moves between backends via the universal `.udb`
export/import (see below).

## Layer map (top → bottom)

```
Pages (app/pages)                 never import services/providers/SDKs
  └─ Hooks / Logic                logic → services
       └─ Services (services/)    services → repositories      ← "services use repositories"
            └─ Repositories (data-layer/repositories/)   uniform per-entity API
                 └─ data-provider/                        schema · migrations · seed · udb
                      └─ providers/database/              Local · Supabase · Firebase · Mongo
                           └─ backend                     localStorage / PostgREST / Firestore / Atlas
```

The dependency arrow always points down. Only `providers/database/*` may speak a
vendor dialect — and even those use plain `fetch`/REST, so **no DB SDK is imported
anywhere in `src/`** (Rule 4).

## Phase 1 — Universal Schema Layer  ·  `src/data-provider/schema/`

One provider-agnostic schema file per entity (`users`, `roles`, `permissions`,
`cases`, `documents`, `settings`, `auditLogs`, …) plus `index.js`. Each schema is a
plain object:

```js
export const UsersSchema = {
  collection: 'users', primaryKey: 'id', core: true,
  fields: { id: 'string', name: 'string', email: 'string', roleCode: 'string',
            status: 'string', createdAt: 'datetime', updatedAt: 'datetime' },
  required: ['name', 'roleCode'], defaults: { status: 'Active' },
  relations: [{ field: 'roleCode', references: 'roles', on: 'code' }],
};
```

`index.js` exposes `schemas`, `collectionNames`, `coreCollections`, `relationships()`,
`applyDefaults()`, `validateRecord()`, and `SCHEMA_VERSION`.

## Phase 2 — Migration Engine  ·  `src/data-provider/migrations/`

`MigrationEngine` picks a strategy by the active provider and drives it against the
live provider through `ensureCollection` / `collectionExists`:

| Strategy | Behaviour |
|----------|-----------|
| `LocalMigration` | creates the localStorage collection arrays |
| `MongoMigration` / `FirebaseMigration` | lazy — collections appear on first write; ensure = reachability probe |
| `SupabaseMigration` | probes tables; for missing ones returns the exact `CREATE TABLE` SQL (the anon key can't run DDL) |

API: `ensureSchema()`, `validateSchema()`, `repairSchema()`. `ensureSchema({coreOnly})`
runs automatically at boot inside `authLogic.ensureSeeded()`. A new
**`FirebaseDatabaseProvider`** (Firestore REST, SDK-free) was added and registered,
so `firebase` is now a real, switchable option.

## Phase 3 — Repository Layer  ·  `src/data-layer/repositories/`

A uniform per-entity API over the active provider:

```
create · update · delete · getById · getAll · query · count · bulkCreate · bulkDelete · clear
```

Every collection has a repository (`usersRepository`, `casesRepository`, …) built from
`createRepository(collection)`. **All services were refactored to use repositories**,
and `databaseService` now delegates to the repository registry — so every data path,
including the few generic logic callers, funnels through one place. Hardcoded
collection strings are gone from the service layer.

## Phase 4 — Database Manager  ·  System Settings → **Database Manager** (`/admin/database`)

A new admin page (reusing existing CSS classes only — no inline/JSX CSS) exposing:

- **Provider** — current provider, connection status, schema & UDB versions, row totals
- **Schema** — status, present/missing collections, **Create / Repair / Validate Schema**
- **Data** — per-collection counts, **Seed Demo Data / Factory Reset / Clear Database**
- **Import / Export** — **Export Database** / **Import Database** (`.udb`)
- **Backup** — **Local Download** (works) + Google Drive / Mega / Terabox (need a backend; surfaced honestly)
- **Provider SQL** — the one-time `CREATE TABLE` script when on Supabase

Flow: `DatabaseManager.jsx → databaseManagerLogic → databaseAdminService → migration/seed/udb engines`.
The page never touches a provider directly.

## Phase 5 — Universal `.udb` format  ·  `src/data-provider/udb/udbEngine.js`

A `.udb` is a single self-describing JSON package whose sections mirror the canonical
layout — `manifest`, `schema`, `permissions`, `relationships`, `settings`, `data`,
`attachments`, `logs` — with a SHA-256 checksum over the canonical payload.

Because export/import both go through the provider's generic `snapshot()` / `restore()`,
**any provider can export a `.udb` and any provider can import it**:

```
Supabase ──export──▶ .udb ──import──▶ Firebase
Firebase ──export──▶ .udb ──import──▶ MongoDB
```

LexAI operates entirely on the **universal schema**, never a provider-specific one, so
moving from Supabase today to Firebase tomorrow to MongoDB later is a one-variable
change plus (optionally) a `.udb` import to carry the data across.

## Default credentials (local demo)

Seed Super Admin — `superadmin` / `admin@lexai.local` / `Admin@123` (created idempotently
by `authLogic.ensureSeeded`).

## New / changed files (summary)

- **Added:** `data-provider/schema/*` (19 + index), `data-provider/migrations/*` (Base + 4 strategies + engine),
  `data-provider/seedEngine.js`, `data-provider/udb/udbEngine.js`,
  `data-layer/repositories/*` (base + 19 + index), `services/databaseAdminService.js`,
  `logic/databaseManagerLogic.js`, `app/pages/DatabaseManager.jsx`,
  `providers/database/FirebaseDatabaseProvider.js`.
- **Extended (additive):** `providers/database/DatabaseProvider.js` (+count/bulk/schema/snapshot hooks),
  `LocalDatabaseProvider`, `Supabase`/`Mongo` providers (schema probes), `providers/database/index.js`
  (firebase registered), `config.js` + `.env.example` (firebase creds), `styles/index.css` (`.code-block`).
- **Refactored onto repositories (behaviour preserved):** `userService`, `roleService`, `auditService`,
  `caseService`, `draftingService`, `caseFolderService`, `caseHistoryService`, `caseActivityService`,
  `caseStageService`, `reminderService`, `envService`, `searchService`, `storageService`,
  `storageStatsService`, `fileSyncService`, `databaseService`; `authLogic` (boot-time `ensureSchema`);
  `routes/index.jsx` + `SystemSettings.jsx` (Database Manager link/route).
```
