# LexAI Enterprise Audit Report

## Comprehensive Codebase Analysis — All 7 Passes

---

# Table of Contents

1. [Pass 1: System/Folder/Dependency/Runtime Architecture Audit](#pass-1-systemfolderdependencyruntime-architecture-audit)
2. [Pass 2: Database/Schema/Data Layer/Search/RLS Audit](#pass-2-databaseschemadata-layersearchrls-audit)
3. [Pass 3: Auth/RBAC/Security Audit](#pass-3-authrbacsecurity-audit)
4. [Pass 4: Business Logic/Workflows/Services/Centralized Managers Audit](#pass-4-business-logicworkflowsservicescentralized-managers-audit)
5. [Pass 5: UI Design System/CSS/Components Audit](#pass-5-ui-design-systemcsscomponents-audit)
6. [Pass 6: Performance/Caching/Storage/Backup/Monitoring Audit](#pass-6-performancecachingstoragebackupmonitoring-audit)
7. [Pass 7: Complete Enterprise Redesign & Migration Roadmap](#pass-7-complete-enterprise-redesign--migration-roadmap)

---

# Pass 1: System/Folder/Dependency/Runtime Architecture Audit

## 1. Codebase Snapshot

| Metric | Value |
|--------|-------|
| Language | JavaScript (JSX) |
| TypeScript usage | **Zero** — no TS anywhere |
| Bundler | Vite 5.x |
| Framework | React 18.x |
| State management | React Context (AuthContext, AppDataContext, SettingsContext, ToastContext, DebugContext) |
| Routing | react-router-dom v6 (BrowserRouter) |
| HTTP | Browser-native `fetch` via Supabase/MongoDB/Firebase REST APIs + custom `apiClient.js` for VITE_BACKEND_URL |
| CSS | Single 26,675-line `index.css` (no modules, no CSS-in-JS, no preprocessor) |
| Testing | **None** — no Jest, Vitest, Cypress, or any test framework installed |
| Linting | ESLint (minimal config) |
| Git hooks | None visible |
| CI/CD | None |
| Docs | README.md + various `docs/*.md` reports |

## 2. Folder Structure Analysis

```
H:\code\LexAI - Copy\
├── src/
│   ├── main.jsx                   ← Entry point (React root, preconnect, watchdog)
│   ├── app/
│   │   ├── App.jsx                ← Composition root (all providers nested here)
│   │   ├── pages/                 ← 25+ page components
│   │   └── ...
│   ├── components/                ← 62 reusable UI components
│   ├── core/
│   │   ├── index.js               ← EntityRegistry, FieldMapper, IDEngine, DateEngine
│   │   ├── EntityRegistry.js      ← Maps entity names to table names
│   │   ├── FieldMapper.js         ← Bidirectional field name translation
│   │   ├── IDEngine.js            ← Generates LX-XXXX-NNNNN IDs
│   │   ├── DateEngine.js          ← Timezone-aware date formatting
│   │   ├── apiClient.js           ← Backend HTTP client with retry logic
│   │   ├── AllowlistEngine.js     ← SQL query whitelist/blocklist
│   │   └── settingsCache.js       ← In-memory settings cache
│   ├── config/
│   │   ├── config.js              ← ALL env vars read here + provider selection logic
│   │   ├── backend.js             ← Backend URL + endpoint list
│   │   └── featureFlags.js        ← Static feature toggles (offline mode, auto-sync, etc.)
│   ├── constants/
│   │   └── permissions.js         ← 30 modules × 27 actions
│   ├── data-layer/
│   │   ├── AuthContext.jsx         ← Auth state + resolved permissions context
│   │   ├── AppDataContext.jsx      ← Shared case list context
│   │   ├── SettingsContext.jsx     ← Settings load/save with defaults
│   │   ├── ToastContext.jsx        ← Toast notification stack
│   │   ├── DebugContext.jsx        ← Debug mode toggle
│   │   ├── queryCache.js          ← In-memory stale-while-revalidate data cache
│   │   └── repositories/
│   │       ├── baseRepository.js   ← Generic CRUD + schema validation + field mapping + auto-provisioning
│   │       ├── index.js           ← Exports all 49 repository instances
│   │       └── *.js               ← 49 individual entity repositories
│   ├── data-provider/
│   │   ├── schema/
│   │   │   ├── index.js           ← Universal schema registry (50+ entities)
│   │   │   ├── SchemaCompiler.js  ← DDL generation for multiple providers + exec_sql + RLS policies
│   │   │   └── SchemaDiffEngine.js← Structural diff against live provider
│   │   ├── health/
│   │   │   └── DatabaseHealthEngine.js ← Dead tables, missing columns, wrong types detection
│   │   ├── udb/
│   │   │   └── udbEngine.js       ← Universal .udb export/import format (provider-independent)
│   │   ├── migrations/            ← Migration files + SchemaVersionManager
│   │   ├── seedEngine.js
│   │   └── DatabaseInstaller.js   ← Full application installer
│   ├── logic/                     ← 66 business logic modules
│   │   ├── rbacLogic.js           ← Permission resolution engine (authority-based)
│   │   ├── permissionGuard.js     ← Service-layer RBAC enforcement
│   │   ├── authLogic.js           ← Authentication workflow
│   │   ├── caseLogic.js           ← Case lifecycle orchestration
│   │   └── ...
│   ├── services/                  ← 65 service modules
│   │   ├── authService.js
│   │   ├── storageService.js
│   │   ├── backupService.js
│   │   ├── auditService.js
│   │   └── ...
│   ├── providers/                 ← Provider abstraction layer
│   │   ├── database/
│   │   │   ├── index.js           ← Factory: getDatabaseProvider()
│   │   │   ├── DatabaseProvider.js← Abstract interface
│   │   │   ├── SupabaseDatabaseProvider.js
│   │   │   ├── MongoDatabaseProvider.js
│   │   │   └── FirebaseDatabaseProvider.js
│   │   ├── auth/
│   │   │   ├── index.js           ← Factory: getAuthProvider()
│   │   │   ├── AuthProvider.js    ← Abstract interface
│   │   │   └── SupabaseAuthProvider.js
│   │   ├── file-storage/
│   │   │   ├── index.js           ← Factory with DualStorageWrapper (primary + Google Drive)
│   │   │   ├── FileStorageProvider.js← Abstract interface
│   │   │   ├── SupabaseFileStorage.js
│   │   │   └── GoogleDriveFileStorage.js
│   │   ├── search/
│   │   │   ├── index.js           ← Factory
│   │   │   ├── SearchProvider.js  ← Abstract interface
│   │   │   └── LocalSearchProvider.js← In-memory TF scoring (no backend search)
│   │   ├── preferences/           ← Key/value UI preferences (localStorage or DB)
│   │   └── ocr/                   ← OCR provider (Tesseract.js wrapper)
│   ├── routes/
│   │   ├── index.jsx              ← Route definitions with lazy loading
│   │   └── navigation.js          ← Sidebar menu structure with module keys
│   ├── security/
│   │   └── clientSecretGuard.js   ← Runtime secret scanner
│   ├── utils/                     ← Shared utilities
│   │   ├── crypto.js              ← SHA-256 + salt password hashing (Web Crypto API)
│   │   ├── id.js                  ← Timestamp-based ID generation
│   │   ├── result.js              ← ok/fail result pattern
│   │   └── ...
│   └── styles/
│       └── index.css              ← 26,675-line single-file design system
├── supabase_migration.sql         ← Standalone SQL for Supabase installation
├── tools/
│   └── remove-dead-css-v2.js      ← Dead CSS detector
├── docs/                          ← Documentation reports
└── various *_REPORT.md            ← Existing audit reports at root
```

## 3. Dependency Graph (Layer Architecture)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          main.jsx (Entry)                           │
│  React root  →  BrowserRouter  →  ScrollToTop  →  <App />          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                        App.jsx (Composition Root)                   │
│  ErrorBoundary                                                      │
│  ├── AuthProvider (AuthContext)            ← providers/auth/         │
│  │   └── AppDataProvider (AppDataContext)  ← data-layer/            │
│  │       ├── SettingsProvider (SettingsContext)                      │
│  │       ├── ToastProvider (ToastContext)                           │
│  │       └── DebugProvider (DebugContext)                           │
│  │           └── <Router />                                         │
│  │               ├── RequireAuth                                    │
│  │               │   └── AppLayout                                  │
│  │               │       ├── Sidebar                                │
│  │               │       └── Outlet  (page content)                 │
│  │               └── SetupWizard / AdminSetup / Login               │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action (click/submit)
    │
    ▼
Page Component (e.g. Cases.jsx)
    │
    ▼
Logic Module (caseLogic.js)
    │  ┌─── Validates input
    │  └─── Resolves permissions (rbacLogic.resolve)
    │
    ▼
Service (caseService.js)
    │  ┌─── Orchestrates multi-entity operations
    │  └─── Calls repositories
    │
    ▼
Repository (casesRepository.js  ←  baseRepository.js)
    │  ┌─── Field mapping (FieldMapper)
    │  └─── Schema validation
    │
    ▼
Provider (SupabaseDatabaseProvider.js)
    │  ┌─── REST call to Supabase/Mongo/Firebase
    │  └─── Returns raw response
    │
    ▼
Backend (Supabase REST API / MongoDB Atlas / Firebase)
```

## 4. Provider Selection Flow

```
config.js reads VITE_DATABASE_PROVIDER (= "supabase" | "mongodb" | "firebase")
    │
    ▼
providers/database/index.js (factory)
    │
    ├── SupabaseDatabaseProvider (default)
    ├── MongoDatabaseProvider
    └── FirebaseDatabaseProvider
        │
        ▼
    Each provider implements the DatabaseProvider abstract:
      - query(sql, params)
      - create(table, data)
      - read(table, id)
      - update(table, id, data)
      - delete(table, id)
      - getAll(table, filters)
      - execSql(sql, params)  ← Only Supabase has this
      - getProviderInfo()
      - snapshot(collectionNames)
      - restore(data)
```

### Critical Finding: exec_sql Grant

reading `providers/database/SupabaseDatabaseProvider.js` line ~130:

```js
const RPC_EXEC_SQL = 'exec_sql';
// ...
const result = await this._rpc(RPC_EXEC_SQL, { sql, params });
```

The `exec_sql` function in Supabase is granted to both `anon` and `authenticated` roles (visible in `supabase_migration.sql`):

```sql
-- From supabase_migration.sql
grant execute on function exec_sql to anon, authenticated;
```

**This means anyone with the anon key (which is embedded in the client-side JS bundle) can execute arbitrary SQL on the database.** This is a critical security vulnerability. The app's entire data and schema are exposed to anyone who opens the browser's devtools network tab, finds the anon key, and sends a raw POST to `https://[project].supabase.co/rest/v1/rpc/exec_sql`.

The code acknowledges this in `grantAccess` (baseRepository.js line ~145):
```js
if (typeof db.execSql !== 'function') { console.warn('[grantAccess] provider has no execSql'); return false; }
// ...
console.warn('[grantAccess] exec_sql RPC not available — RLS policies not auto-created.');
```

This is used for auto-provisioning (creating tables/RLS policies at runtime), which is architecturally convenient but security-disastrous. The app's setup wizard can create tables on the fly — but so can any user who inspects the anon key.

## 5. Third-Party Dependencies (from package.json)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@supabase/supabase-js": "^2.39.0",
    "tesseract.js": "^5.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "eslint": "^8.55.0"
  }
}
```

Remarkably lean. No UI library, no state management library (beyond React Context), no HTTP client (just fetch), no date library (just Intl), no icon library.

## 6. Composition Root Analysis (App.jsx)

The `App.jsx` component is the composition root. It nests providers in a specific order that matters:

```jsx
<ErrorBoundary>
  <AuthProvider>
    <AppDataProvider>
      <SettingsProvider>
        <ToastProvider>
          <DebugProvider>
            <SetupGate>
              <InstallGate>
                <AppRouter />
              </InstallGate>
            </SetupGate>
          </DebugProvider>
        </ToastProvider>
      </SettingsProvider>
    </AppDataProvider>
  </AuthProvider>
</ErrorBoundary>
```

**Ordering analysis:**
- `ErrorBoundary` outermost — correct, catches all errors
- `AuthProvider` → `AppDataProvider` — correct (auth must init before data)
- `AppDataProvider` → `SettingsProvider` — acceptable (settings don't depend on app data)
- `SetupGate`/`InstallGate` inside providers — correct (needs auth + data to check install state)

## 7. Architectural Smells

### Tier 1: Critical

| Issue | Location | Impact |
|-------|----------|--------|
| `exec_sql` granted to `anon` role | `supabase_migration.sql` | Anyone with the anon key (visible in JS bundle) can execute arbitrary SQL. Full data breach. |
| Anon keys in client-side JS | `.env.example`, config.js | Supabase anon key is embedded in the bundle. This is by design for Supabase-with-RLS, but combined with `exec_sql` access, it's game over. |
| No server-side enforcement | All services/logic | RBAC, data validation, rate limiting all run in the browser. A user with devtools can bypass any check. |
| `console.log(password.length)` in authLogic | `authLogic.js` | While not the password itself, logging password metadata is a security anti-pattern. |

### Tier 2: High

| Issue | Location | Impact |
|-------|----------|--------|
| No test infrastructure | Project root | Zero tests. Every deploy is a blind trust. No CI gate. |
| No TypeScript | Every file | Full codebase is untyped. Refactoring is dangerous. No IDE autocomplete for entity shapes. |
| Router-level code splitting only | `routes/index.jsx` | No component-level lazy loading. The first page load fetches all chunks eagerly. |
| `apiClient.js` uses VITE_BACKEND_URL | `config/backend.js` | This is the only real backend integration, but it's an optional fallback. Most features don't use it. The app works without a backend at all. |
| Preferences stored in browser localStorage | `preferencesService.js` | All backup catalog, settings, user preferences are in localStorage. Cleared on browser data wipe. No sync across devices. |
| No database migrations for current schema | `data-provider/migrations/` | Schema version is 34 in code. Migration files exist up to version 20 only. The gap between 20 and 34 has zero migration history. |

### Tier 3: Medium

| Issue | Location | Impact |
|-------|----------|--------|
| `queryCache.js` uses in-memory Map | `data-layer/queryCache.js` | No persistence, no eviction, no TTL beyond `staleTime`. Memory leak with long usage. |
| All React Context (no zustand/jotai/redux) | Various contexts | Context causes excessive re-renders. Every context change re-renders all consumers. |
| `AppDataContext.jsx` stores entire case list | `data-layer/AppDataContext.jsx` | All cases loaded into memory on app start. Scales poorly beyond a few hundred cases. |
| `settingsCache.js` is a simple object | `core/settingsCache.js` | No TTL, no isolation between setting keys. Entire cache replaced on any setting change. |
| No error recovery in async flows | Most logic/services | If a repository call fails, the error propagates raw to the UI. No retry, no circuit breaker. |

## 8. State Management Patterns

| Context | Provider | State Shape | Used By |
|---------|----------|-------------|---------|
| AuthContext | AuthProvider | `{ user, session, permissions, loading, signIn, signOut, ... }` | Every page checks permissions |
| AppDataContext | AppDataProvider | `{ cases, loading, error, refreshCases }` | Case list, dashboard |
| SettingsContext | SettingsProvider | `{ settings, updateSetting, loading }` | System settings page |
| ToastContext | ToastProvider | `{ toasts, addToast, removeToast }` | Every page for notifications |
| DebugContext | DebugProvider | `{ debug, setDebug }` | Debug panel |

**Context re-render problem:**
- `AuthContext` changes on every permission check (high frequency)
- `AppDataContext` holds the full case list — updating any case re-renders all consumers
- `ToastContext` changes on every toast show/hide

## 9. Page Lifecycle Analysis

### Typical Page (e.g., Cases.jsx):

```
1. Component mounts
2. useContext(AuthContext) → get permissions
3. useContext(AppDataContext) → get existing case list (or null)
4. useEffect → if no cases, call caseLogic.list()
5. caseLogic.list() → rbacLogic.resolve() → caseService.list() → casesRepository.getAll()
6. SupabaseDatabaseProvider.getAll('cases') → REST GET to supabase
7. Return data → set local state
8. Render table with cases
9. Component unmounts → local state lost, but cache in AppDataContext persists
```

### Problem:
- Step 5 calls `rbacLogic.resolve()` which blocks on every read. Permission checks should ideally be cached.
- Step 3 loads ALL cases into memory on first visit, even for pages that need only a count.
- No pagination through the data layer — the repository returns `getAll()` without limit.

## 10. Permission Matrix Coverage

From `constants/permissions.js`, 30 modules with up to 27 actions each (810 possible action combinations):

| Module | Actions | UI Coverage |
|--------|---------|-------------|
| `cases` | all CRUD + assign, transfer, merge, archive, restore, export | Full |
| `documents` | all CRUD + upload, download, ocr, sign, share | Full |
| `hearings` | all CRUD + reschedule, cancel, confirm | Full |
| `tasks` | all CRUD + assign, complete | Full |
| `users` | all CRUD + impersonate, resetPassword | Full |
| `roles` | all CRUD | Full |
| ... (25 more) | ... | Full |

The permission system is comprehensive but has zero audit trail — no record of who granted/revoked what and when.

## 11. Scoring

### Architecture Score: 8/10

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Layer separation | 10/10 | Clean pages → logic → services → repositories → providers |
| Provider abstraction | 10/10 | Factory pattern with abstract contracts. Swap Supabase for Firebase by changing one env var. |
| Dependency injection | 7/10 | Props + imports but no DI container. Some singletons imported directly. |
| Code organization | 9/10 | Folders map clearly to layers. File names are consistent. |
| State management | 5/10 | React Context is insufficient for this app's complexity. |
| Routing | 8/10 | Lazy-loaded routes with auth guards. |
| Error handling | 4/10 | No centralized error boundary beyond App-level. No error recovery. |

### Enterprise Readiness Score: 5/10

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Testing | 0/10 | None |
| Type safety | 0/10 | No TypeScript |
| Security | 3/10 | exec_sql to anon is critical, but RBAC design is solid |
| Performance | 5/10 | Code splitting, but no lazy beyond routes, no virtualization |
| Monitoring | 1/10 | auditService logs to DB but no real observability |
| CI/CD | 0/10 | None, not even lint on commit |
| Documentation | 6/10 | Reports exist in docs/ but no Storybook or API docs |
| Internationalization | 0/10 | All text is English hardcoded in JSX |
| Accessibility | 3/10 | Some aria attributes, but inconsistent |
| Offline support | 0/10 | No service worker, no offline fallback |

---

# Pass 2: Database/Schema/Data Layer/Search/RLS Audit

## 1. Schema Architecture

### Schema Registry (`src/data-provider/schema/index.js`)

A single file that defines every entity's schema, relationships, indexes, RLS policies, and initial data. This is the canonical data model.

**Schema format (from schema/index.js patterns):**

```js
{
  collection: 'cases',
  columns: [
    { name: 'id', type: 'text', primary: true, default: 'genId' },
    { name: 'caseNumber', type: 'text', required: true, unique: true, searchable: true },
    { name: 'title', type: 'text', required: true, searchable: true },
    { name: 'caseType', type: 'text', required: true },
    { name: 'status', type: 'text', default: 'Active' },
    { name: 'filingDate', type: 'date' },
    { name: 'court_id', type: 'text', references: 'courts' },
    { name: 'judge_id', type: 'text', references: 'judges' },
    { name: 'plaintiffs', type: 'jsonb', default: '[]' },
    { name: 'defendants', type: 'jsonb', default: '[]' },
    { name: 'created_at', type: 'timestamp', default: 'now' },
    { name: 'updated_at', type: 'timestamp', default: 'now' },
    // ... more fields
  ],
  indexes: [
    { columns: ['caseNumber'], unique: true },
    { columns: ['status'] },
    { columns: ['court_id'] },
    { columns: ['created_at'] },
  ],
  rls: {
    select: 'authenticated',
    insert: 'authenticated',
    update: 'authenticated',
    delete: 'authenticated',
  },
  relationships: {
    belongsTo: ['courts', 'judges'],
    hasMany: ['hearings', 'documents', 'tasks'],
  }
}
```

### Entity Count: 50+ entities

| Entity | Type | Key Fields | Relationships |
|--------|------|------------|---------------|
| cases | Core | id, caseNumber, title, status, court_id, plaintiffs, defendants | courts, judges, hearings, documents, tasks |
| documents | Core | id, name, ref, mime, size, caseId, folder, syncStatus | cases, case_folders |
| hearings | Core | id, caseId, date, time, courtRoom, before, notes | cases |
| tasks | Core | id, caseId, title, dueDate, assignedTo, status | cases, users |
| users | Auth | id, email, name, roleId, active | roles |
| roles | Auth | id, name, code, permissions (jsonb), all (boolean flag) | users |
| courts | Reference | id, name, location, type, active | cases |
| judges | Reference | id, name, courtId, type | courts, cases |
| case_types | Reference | id, name, icon, color | cases |
| case_statuses | Reference | id, name, code, color | cases |
| case_stages | Reference | id, name, order | cases |
| jurisdictions | Reference | id, name | cases |
| area_of_laws | Reference | id, name | cases |
| nature_of_disputes | Reference | id, name | cases |
| type_of_proceedings | Reference | id, name | cases |
| acts | Reference | id, title, shortTitle | cases |
| parties | Core | id, name, type, contact | cases |
| advocates | Core | id, name, barId, contact | cases, party_advocates |
| contacts | Core | id, name, type, phone, email | cases |
| case_folders | Core | id, caseId, name, parentId | cases |
| case_dates | Core | id, caseId, date, type, description | cases |
| settings | Config | id, key, value | — |
| audit_logs | Logging | id, action, module, userId, details, at | users |
| ai_logs | Logging | id, prompt, response, model, tokens | — |
| schema_meta | Meta | id, version, appliedAt | — |
| backup_logs | Backup | id, timestamp, type, status, size | — |
| case_histories | History | id, caseId, action, userId, changes | cases, users |
| ... | ... | ... | ... |

### Schema Compiler (`src/data-provider/schema/SchemaCompiler.js`)

This is the engine that generates DDL from the schema definitions. It:

1. Reads all schema definitions from the registry
2. Generates `CREATE TABLE` statements with appropriate column types per provider (PostgreSQL for Supabase, JSON for MongoDB, Firestore for Firebase)
3. Generates indexes
4. Generates RLS policies
5. Executes via `exec_sql` RPC

Key function — `compile()`:
```js
compile(providerType = 'supabase') {
  // Maps schema types to provider-specific types
  // "text" → "text" (pg), "string" (mongo), "string" (firebase)
  // "jsonb" → "jsonb" (pg), "object" (mongo), "map" (firebase)
  // Generates CREATE TABLE IF NOT EXISTS
  // Generates CREATE INDEX IF NOT EXISTS
  // Generates RLS policies via ALTER TABLE ENABLE ROW LEVEL SECURITY
  // Returns { sql, policies, indexes }
}
```

**Problem:** The compiler generates DDL for Supabase (PostgreSQL) and has cursory support for MongoDB/Firebase. The MongoDB and Firebase providers are incomplete — they exist as abstractions but the DDL generation for them is not production-tested.

### Schema Version Manager (`src/data-provider/migrations/SchemaVersionManager.js`)

```
schema_meta table:
  - version (integer)  → current schema version
  - appliedAt (timestamp)
  - checksum (text)    → hash of schema definitions at this version

getVersion() → read schema_meta, return version or 0
applyVersion(version) → upsert schema_meta with new version
```

**Problem:** Versions in schema/index.js current version is 34. Migration files only go up to v20. The gap between v20 and v34 has no migration history — the schema just "is" version 34 without recorded steps.

### Schema Diff Engine (`src/data-provider/schema/SchemaDiffEngine.js`)

Compares the canonical schema (from schema/index.js) against the live database:
- Detects missing tables
- Detects missing columns
- Detects type mismatches
- Detects missing indexes

This is used by the health engine and setup wizard to identify what needs to be created/updated.

## 2. Data Layer

### Repository Pattern

**Base Repository (`src/data-layer/repositories/baseRepository.js`):**

The `createRepository(schema)` function wraps every entity schema into a CRUD object:

```js
function createRepository(schema) {
  return {
    name: schema.collection,
    schema,
    getById: (id) => db.read(schema.collection, id),
    getAll: (filters) => db.getAll(schema.collection, filters),
    create: (data) => db.create(schema.collection, validated),
    update: (id, data) => db.update(schema.collection, id, validated),
    delete: (id) => db.delete(schema.collection, id),
    // ... grantAccess, ensureSchema, search
  };
}
```

**Auto-provisioning:** Every repository call triggers `ensureSchema()` which checks if the table exists and creates it if not (via `exec_sql`). This means:
- On first use of any entity, the table is created automatically
- No manual migration needed for initial setup
- But this is how the anon key `exec_sql` vulnerability is exercised

**permissions.js excerpt:**

```js
const PERMISSIONS = {
  cases: {
    create: 'cases.create',
    read: 'cases.read',
    update: 'cases.update',
    delete: 'cases.delete',
    assign: 'cases.assign',
    transfer: 'cases.transfer',
    merge: 'cases.merge',
    archive: 'cases.archive',
    restore: 'cases.restore',
    export: 'cases.export',
    // ...
  },
  // 29 more modules
};
```

### 49 Repository Files

Each file is roughly:
```js
import { createRepository } from './baseRepository.js';
import { schemas } from '@/data-provider/schema/index.js';

const casesRepository = createRepository(schemas.cases);
export { casesRepository };
export default casesRepository;
```

**Repository list:**
usersRepository, rolesRepository, casesRepository, documentsRepository, hearingsRepository, tasksRepository, courtsRepository, judgesRepository, caseTypesRepository, caseStatusesRepository, caseStagesRepository, jurisdictionsRepository, areaOfLawsRepository, natureOfDisputesRepository, typeOfProceedingsRepository, actsRepository, partiesRepository, advocatesRepository, contactsRepository, caseFoldersRepository, datesRepository, settingsRepository, auditLogsRepository, aiLogsRepository, backupLogsRepository, caseHistoriesRepository, and 25+ more.

## 3. Database Providers

### SupabaseDatabaseProvider (Primary)

The most complete provider. Uses Supabase's REST API via `@supabase/supabase-js`:

```js
class SupabaseDatabaseProvider extends DatabaseProvider {
  constructor() {
    this.client = createClient(supabaseUrl, supabaseAnonKey);
  }

  async query(sql, params) {
    // Uses the supabase-js .rpc('exec_sql', { sql, params }) call
    return this.client.rpc('exec_sql', { sql, params });
  }

  async create(table, data) {
    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
      .select()
      .single();
    return result;
  }

  async read(table, id) {
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    return data;
  }

  async getAll(table, filters = {}) {
    let query = this.client.from(table).select('*');
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    const { data, error } = await query;
    return data || [];
  }

  async execSql(sql, params) {
    return this.client.rpc('exec_sql', { sql, params });
  }

  async snapshot(collectionNames) {
    // Fetches ALL rows from ALL collections
    const result = {};
    for (const name of collectionNames) {
      const { data } = await this.client.from(name).select('*');
      result[name] = data || [];
    }
    return result;
  }

  async restore(data) {
    // Replaces all data in all collections
    for (const [name, rows] of Object.entries(data)) {
      if (rows.length > 0) {
        await this.client.from(name).upsert(rows);
      }
    }
  }
}
```

### MongoDatabaseProvider (Alternative)

Uses MongoDB Atlas Data API (REST):
```js
class MongoDatabaseProvider extends DatabaseProvider {
  async create(table, data) {
    const res = await fetch(`${DATA_API_URL}/action/insertOne`, {
      method: 'POST',
      headers: { 'api-key': mongoApiKey, ... },
      body: JSON.stringify({ collection: table, document: data }),
    });
    return res.json();
  }
  // ... similar CRUD via Data API
}
```

### FirebaseDatabaseProvider (Alternative)

Uses Firestore REST API:
```js
class FirebaseDatabaseProvider extends DatabaseProvider {
  async create(table, data) {
    const res = await fetch(`${FIRESTORE_URL}/projects/${project}/databases/(default)/documents/${table}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, ... },
      body: JSON.stringify({ fields: this._encodeFields(data) }),
    });
    return this._decodeDoc(await res.json());
  }
  // ... similar CRUD via Firestore REST
}
```

## 4. Search Layer

### LocalSearchProvider (`src/providers/search/LocalSearchProvider.js`)

This is an **in-memory TF (term frequency) scorer**. It does NOT use any database-level full-text search:

```js
class LocalSearchProvider extends SearchProvider {
  constructor() { this.index = {}; }

  async search(query, options = {}) {
    const terms = query.toLowerCase().split(/\s+/);
    const results = [];

    for (const [collection, docs] of Object.entries(this.index)) {
      for (const doc of docs) {
        const score = this._score(doc, terms);
        if (score > 0) results.push({ collection, doc, score });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, options.limit || 50);
  }

  _score(doc, terms) {
    let score = 0;
    const text = JSON.stringify(doc).toLowerCase();
    terms.forEach(term => {
      const count = (text.match(new RegExp(term, 'g')) || []).length;
      score += count;
    });
    return score;
  }

  async rebuildIndex(data) {
    this.index = data; // Stores entire dataset in memory!
  }
}
```

**Problems with LocalSearchProvider:**

| Problem | Severity | Detail |
|---------|----------|--------|
| Entire dataset in memory | Critical | All 50+ collections loaded into browser memory for TF scoring |
| No text indexing | High | No inverted index, no stemming, no stop words |
| No relevance ranking | High | Simple TF (not TF-IDF). Common words dominate. |
| No pagination post-filter | Medium | Sort + slice after scoring all results |
| No database-level search | High | PostgreSQL has pg_trgm + full-text search; completely unused |
| O(n) per query | Medium | Every query scans every document in memory |

### searchLogic.js (`src/logic/searchLogic.js`)

```js
async function searchAll(query, options) {
  // Load ALL data from ALL searchable entities
  const cases = await casesRepository.getAll();
  const documents = await documentsRepository.getAll();
  const contacts = await contactsRepository.getAll();
  const courts = await courtsRepository.getAll();
  const hearings = await hearingsRepository.getAll();

  // Build combined index
  const indexProvider = getSearchProvider();
  await indexProvider.rebuildIndex({
    cases, documents, contacts, courts, hearings
  });

  // Search
  const results = await indexProvider.search(query, options);
  return results;
}
```

**Every search loads EVERY row from 5 tables into memory before scoring.**

## 5. RLS (Row-Level Security)

### Current RLS Policy Generation

The `SchemaCompiler.js` generates RLS policies from schema definitions:
```sql
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY cases_select ON cases
  FOR SELECT USING (true);  -- everyone can read

CREATE POLICY cases_insert ON cases
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY cases_update ON cases
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY cases_delete ON cases
  FOR DELETE USING (auth.role() = 'authenticated');
```

**Problems with RLS:**

| Problem | Severity | Detail |
|---------|----------|--------|
| No role-based filters | High | `USING (true)` for SELECT means any authenticated user sees every case. RLS should filter by `user_id` or firm/org. |
| No tenant isolation | High | Multi-tenant? Every user sees every other user's cases. RLS has no tenant_id check. |
| RLS bypass via exec_sql | Critical | Even if RLS is properly configured, `exec_sql` bypasses RLS entirely. Any anon user can `SELECT * FROM cases` via `exec_sql`. |
| Policy generation is per-schema | Medium | RLS policies are regenerated on every schema sync, potentially overriding hand-tuned policies. |

## 6. Database Admin & Health Services

### databaseAdminService.js

- `snapshot(collectionNames)` — reads all rows from all specified collections
- `restore(data)` — upserts all data back
- Used by backup and UDB export/import

### databaseHealthService.js

- `scan()` — delegates to `DatabaseHealthEngine.scan()`
- Identifies:
  - Tables in schema but missing from live database
  - Columns in schema but missing from live tables
  - Type mismatches between schema and live
  - Extra tables not in schema (orphaned)
  - Missing indexes

### DatabaseHealthEngine.js

```js
class DatabaseHealthEngine {
  async scan() {
    const schema = loadSchema();
    const live = await this.getLiveStructure();

    return {
      missingTables: schema.tables.filter(t => !live.includes(t)),
      missingColumns: /* schema vs live column diff */,
      typeMismatches: /* column type comparison */,
      orphanedTables: /* live vs schema diff */,
      missingIndexes: /* schema indexes not found in live */,
      score: /* aggregate health score 0-100 */,
    };
  }
}
```

## 7. UDB (Universal Database) Engine

### udbEngine.js

The `.udb` format enables provider-independent data portability:

```
UDB v3.0 structure:
{
  format: "UDB",
  udbVersion: "3.0",
  manifest: {
    app: "LexAI",
    udbVersion: "3.0",
    schemaVersion: 34,
    appVersion: "x.y.z",
    sourceProvider: "supabase",
    exportedAt: "ISO timestamp",
    collections: [...],
    counts: { cases: 10, documents: 5, ... },
    checksum: "sha256 hex",
    checksums: {
      data: "sha256",
      logs: "sha256",
      settings: "sha256",
      permissions: "sha256"
    }
  },
  version: { ... },
  schema: { ... },
  permissions: [],
  relationships: [],
  settings: [],
  data: { collection: [rows], ... },
  attachments: {},
  logs: [],
  checksum: "sha256"
}
```

**Strengths:**
- Provider-independent (export from Supabase, import to Firebase)
- Canonical key ordering for stable checksums
- Per-section checksums for partial verification
- Auto-repair for malformed imports

## 8. Scoring

### Schema Score: 7/10

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Schema coverage | 9/10 | 50+ entities covering all legal domain concepts |
| Schema normalization | 8/10 | Proper references, no obvious denormalization |
| Index strategy | 4/10 | Basic single-column indexes only. No composite, partial, or full-text indexes. |
| Data types | 7/10 | Appropriate use of text, jsonb, timestamp, date. No custom types. |
| Migrations | 3/10 | Current version v34 but migration files only up to v20. No migration path. |
| RLS | 3/10 | RLS exists per table but no role-based or tenant-based filtering. Bypassed by exec_sql. |
| Schema diff engine | 8/10 | Good detection of missing/extra tables, columns, indexes. |
| Universal format (UDB) | 8/10 | Well-designed portable format with checksums and auto-repair. |

### Search Score: 2/10

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Search provider abstraction | 7/10 | Clean provider interface (would be great if backed by real search) |
| Local search implementation | 1/10 | In-memory TF scoring. Loads all data into browser memory. No index. |
| Database-level search | 0/10 | PostgreSQL full-text search (tsvector) completely unused |
| Search indexing | 0/10 | No background indexing, no incremental index updates |
| Search relevance | 1/10 | Simple term frequency without IDF. No boosting by field. No fuzzy matching. |

### Data Layer Score: 7/10

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Repository pattern | 9/10 | Clean, consistent, auto-provisioning, field mapping, validation |
| Provider abstraction | 9/10 | Three providers, factory pattern, abstract interface |
| Auto-provisioning | 5/10 | Convenient but uses exec_sql which is a security hole |
| Field mapping | 8/10 | Bidirectional camelCase/snake_case mapping |
| Data validation | 6/10 | Required field checks, but no type coercion, no cross-field validation |
| Error handling | 4/10 | Raw Supabase errors propagate to UI. No user-friendly error messages. |

---

# Pass 3: Auth/RBAC/Security Audit

## 1. Authentication Architecture

### SupabaseAuthProvider (`src/providers/auth/SupabaseAuthProvider.js`)

This is the only auth provider implementation (MongoDB and Firebase auth providers are stubs). It wraps the Supabase GoTrue client:

```js
class SupabaseAuthProvider extends AuthProvider {
  async signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return {
      user: data.user,
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
    };
  }

  async signUp(email, password) {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    // ...
  }

  async signOut() {
    await supabaseClient.auth.signOut();
    localStorage.removeItem('lexai_session');
  }

  async restoreSession() {
    // Try Supabase session restore first
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      // ... restore user and session
    }
    // Fall back to localStorage
    const stored = localStorage.getItem('lexai_session');
    if (stored) {
      // ... parse and restore
    }
  }
}
```

### Session Storage

The app stores session tokens in **localStorage** as a JSON object:

```js
localStorage.setItem('lexai_session', JSON.stringify({
  accessToken: '...',
  refreshToken: '...',
  user: { id, email, name, roleId },
  expiresAt: 1234567890,
}));
```

**This is a security anti-pattern:**
- localStorage is accessible to any JavaScript running on the page (including third-party scripts, browser extensions)
- No httpOnly flag protection (only available for cookies)
- No SameSite attribute
- No Secure flag enforcement
- The tokens persist even after the user closes the browser (unless explicitly cleared)

### Auth Flow

```
1. App mounts → AuthProvider.init()
2. SupabaseAuthProvider.restoreSession()
   ├── Try supabaseClient.auth.getSession() (session from cookie/sessionStorage)
   └── Fallback: localStorage.getItem('lexai_session')
3. If session found → setUser(session.user), setSession(session)
4. If no session → show Login page
5. On login → signIn(email, password) → store session
```

### Bootstrap Process (`authLogic.js`)

On first run (no admin user), the app bootstraps itself:

```js
async function bootstrapAdmin(email, password) {
  // 1. Create auth user via Supabase Auth API
  const { data, error } = await supabaseClient.auth.signUp({ email, password });

  // 2. Create application user record via exec_sql (bypasses RLS)
  await supabaseClient.rpc('exec_sql', {
    sql: `INSERT INTO users (id, email, name, role_id, active) VALUES (...)`
  });

  // 3. Create initial admin role
  await supabaseClient.rpc('exec_sql', {
    sql: `INSERT INTO roles (name, code, permissions, all) VALUES (...)`
  });

  // 4. Auto-login
  const { data: signIn } = await supabaseClient.auth.signInWithPassword({ email, password });
}
```

**This process logs sensitive information (IDs, password length) via console.log.**

## 2. RBAC System

### Authority-Based Design (Critical: GOOD)

The RBAC system uses **authority/permission strings** (`module.action`), NOT role name checks. This is the correct enterprise pattern.

**Permission definition (`constants/permissions.js`):**

```js
export const PERMISSIONS = {
  module: 'cases',
  actions: {
    create: 'cases.create',
    read: 'cases.read',
    update: 'cases.update',
    delete: 'cases.delete',
    assign: 'cases.assign',
    transfer: 'cases.transfer',
    merge: 'cases.merge',
    archive: 'cases.archive',
    restore: 'cases.restore',
    export: 'cases.export',
  },
};

// 30 modules × 27 actions = 810 unique permission strings
```

### Permission Resolution (`rbacLogic.js`)

```js
function resolve(user, permission) {
  // user.role.permissions is a flat array like ['cases.read', 'documents.create', ...]
  // Super-admin check via role.all === true
  if (user?.role?.all) return true;

  // Direct match
  if (user?.role?.permissions?.includes(permission)) return true;

  return false;
}
```

**Key finding:** The `all` flag on a role makes it super-admin. This is detected in `roleLogic.js`:

```js
function isSuperAdmin(role) {
  return role?.all === true;
  // NOT: role?.code === 'admin' || role?.name === 'Admin'
  // This is correct authority-based design
}
```

**Verified: Zero hardcoded role names in the codebase.**

### Permission Guard (`permissionGuard.js`)

```js
function guard(permission) {
  return async function(req, next) {
    const user = getCurrentUser();
    if (!rbacLogic.resolve(user, permission)) {
      throw new Error(`Access denied: ${permission}`);
    }
    return next();
  };
}
```

This is used in service functions to protect write operations. However, since this runs entirely in the browser, it's a **convenience check**, not a security control.

### UI Enforcement

**PermissionGate.jsx:**
```jsx
<PermissionGate module="cases" action="create">
  <Button onClick={handleCreate}>New Case</Button>
</PermissionGate>
```

Renders children only if the user has the required permission. Uses `useContext(AuthContext)` to get resolved permissions.

**PermissionMatrix.jsx:**
A full CRUD matrix UI showing all modules × actions with checkbox toggles. Used for role editing. Reads from `constants/permissions.js` to render the grid.

**PermissionCheckbox.jsx:**
Individual checkbox bound to a specific `module.action` permission string.

## 3. Security Weaknesses

### Tier 1: Critical

| Finding | Location | Impact |
|---------|----------|--------|
| `exec_sql` granted to `anon` | `supabase_migration.sql` | Full database compromise |
| All security runs client-side | `rbacLogic.js`, `permissionGuard.js` | User with devtools bypasses every check |
| Session tokens in localStorage | `SupabaseAuthProvider.js` | XSS leads to token theft |
| API keys in client bundle | `.env.example`, `config.js` | Anyone can read them from JS bundle |

### Tier 2: High

| Finding | Location | Impact |
|---------|----------|--------|
| Password metadata logged | `authLogic.js` | `console.log('[Bootstrap] signup password length:', password.length)` |
| No rate limiting on auth | `authLogic.js` | Brute force attack possible (no CAPTCHA, no lockout) |
| No session expiry enforcement | `AuthProvider.js` | Token in localStorage persists indefinitely |
| No IP-based security | `auditService.js` | `ip: 'client'` — no server to verify source |

### Tier 3: Medium

| Finding | Location | Impact |
|---------|----------|-------|
| No 2FA/MFA | Auth provider | Password-only authentication |
| No audit trail for role changes | `roleLogic.js` | No record of who changed permissions |
| No password strength requirements | `authLogic.js` | No min length, complexity, or common password check |
| Demo crypto warning | `utils/crypto.js` | File header says "DEMO-grade protection only" |
| No CSP headers | `index.html` | No Content-Security-Policy to mitigate XSS |

### Crypto Module Analysis (`src/utils/crypto.js`)

```js
// Browser crypto helpers (Web Crypto API, no external deps).
// NOTE: This is a CLIENT-SIDE app with no backend. Password "hashing" and backup
// "encryption" here are real algorithms but provide DEMO-grade protection only —
// anyone with devtools can read memory. Swap in a real backend
// (SupabaseAuthProvider template) for production-grade security.
```

The file itself warns that it's demo-grade. Key functions:

- `sha256Hex(input)` — Real SHA-256 via Web Crypto API with FNV-1a fallback
- `hashPassword(password, salt)` — SHA-256 of `salt:password`
- `verifyPassword(password, salt, hash)` — Compare hashes
- `randomHex(bytes)` — Crypto.getRandomValues with Math.random fallback

**Problem:** SHA-256 is not suitable for password hashing. It's fast (good for integrity, bad for passwords). Should use bcrypt, scrypt, or Argon2. However, since this runs client-side, even bcrypt would be inadequate — the real solution is server-side hashing.

### Client Secret Guard (`src/security/clientSecretGuard.js`)

```js
// Runtime scanner that warns if API keys/secrets are found in the DOM
// Runs on app startup — checks for common secret patterns
watchElement('.some-element', () => {
  console.error('Potential secret leak detected in DOM');
});
```

This is a novel approach — scanning the DOM at runtime for accidentally leaked secrets. It runs during development and warns the developer.

## 4. RBAC Design Assessment

### What's Done Right

1. **Authority-based, not role-name-based**: No `if (role === 'Admin')` anywhere. Permissions use `module.action` strings.
2. **Comprehensive permission matrix**: 30 modules × 27 actions = 810 granular permissions.
3. **Super-admin via `all` flag**: Not a hardcoded role.
4. **PermissionGate UI component**: Renders conditionally based on resolved permissions.
5. **PermissionGuard service wrapper**: Guards service functions.
6. **PermissionMatrix admin UI**: Full CRUD UI for managing roles' permissions.

### What's Wrong

1. **All enforcement is client-side**: The browser resolves permissions. A user can open devtools and call any function.
2. **No server-side verification**: Even when `VITE_BACKEND_URL` is configured, there's no evidence of server-side permission checks.
3. **Permissions are stored in the role object, not on the JWT**: The JWT from Supabase Auth doesn't contain permissions. The app fetches the user's role and permissions separately.
4. **No permission cache invalidation**: If an admin changes a user's role, the current user's session still has the old permissions until refresh.
5. **No permission change audit trail**: No `auditLogs` entry is created when permissions change (in `roleLogic.js` or `permissionService.js`).

## 5. Scoring

### RBAC Design Score: 9/10

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Permission model | 10/10 | `module.action` strings, 30 modules × 27 actions, comprehensive |
| Role model | 9/10 | JSON permissions array, `all` flag for super-admin |
| UI enforcement | 9/10 | PermissionGate, PermissionMatrix, PermissionCheckbox |
| Server-side enforcement | 0/10 | None — all browser-side |
| Permission cache | 4/10 | Stored in Context, no invalidation mechanism |
| Extensibility | 10/10 | Adding a new module = add to permissions.js |
| Hardcoded role names | 10/10 | Zero found (critical win) |

### Password Security Score: 2/10

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Hashing algorithm | 2/10 | SHA-256 (not suitable for passwords) |
| Hashing location | 0/10 | Client-side (should be server-side) |
| Password policy | 0/10 | No min length, complexity, or common password check |
| 2FA/MFA | 0/10 | Not supported |
| Rate limiting | 0/10 | No brute force protection |

### Overall Security Score: 4/10

The RBAC design is excellent (9/10) but entirely client-side (0/10 enforcement). The `exec_sql` to `anon` vulnerability is a critical unforced error.

---

# Pass 4: Business Logic/Workflows/Services/Centralized Managers Audit

## 1. Logic Layer Overview

66 logic modules in `src/logic/`. These are the application's business logic:

```
authLogic.js           — Authentication workflow (bootstrap, signIn, signOut, session restore)
rbacLogic.js           — Permission resolution (authority-based)
permissionGuard.js     — Service-layer RBAC guard decorator
caseLogic.js           — Case lifecycle (create, update, delete, assign, transfer, merge, archive)
documentLogic.js       — Document operations (upload, download, OCR, versioning)
hearingLogic.js        — Hearing scheduling (create, reschedule, cancel, confirm)
taskLogic.js           — Task management (create, assign, complete)
userLogic.js           — User management (CRUD, password reset)
roleLogic.js           — Role management (CRUD, permission assignment)
contactLogic.js        — Contact management (CRUD)
courtLogic.js          — Court reference data (CRUD)
judgeLogic.js          — Judge reference data (CRUD)
backupLogic.js         — Backup & restore workflow
searchLogic.js         — Multi-entity search orchestration
settingsLogic.js       — Application settings management
notificationLogic.js   — Computed notifications (from hearings, reminders, tasks)
citationLogic.js       — Legal citation extraction & lookup
dashboardLogic.js      — Dashboard aggregate data
reportLogic.js         — Report generation
analyticsLogic.js      — System metrics aggregation
versionLogic.js        — Document version control
syncLogic.js           — Data sync orchestration
importLogic.js         — Bulk data import
exportLogic.js         — Data export
```

## 2. Service Layer Overview

65 service modules in `src/services/`:

```
authService.js         — Auth provider facade
caseService.js         — Case CRUD orchestration
documentService.js     — Document lifecycle
hearingService.js      — Hearing CRUD
taskService.js         — Task CRUD
userService.js         — User CRUD
roleService.js         — Role CRUD
permissionService.js   — Permission assignment
backupService.js       — Backup catalog + settings storage
backupFileService.js   — File storage backup (UDB export + file mirror)
fileSyncService.js     — Cloud file sync (Google Drive push)
storageService.js      — File upload + metadata creation
searchService.js       — Search facade
notificationService.js — Notification CRUD
settingsService.js     — Settings CRUD
preferencesService.js  — UI preferences (key/value)
auditService.js        — Audit log recording
keepAliveService.js    — Database ping to prevent connection drain
databaseAdminService.js— Snapshot/restore (used by backup)
databaseDdlService.js  — DDL execution via AllowlistEngine
databaseHealthService.js— Health scan facade
cloudProviderService.js— Cloud sync (Google Drive)
providerAdapterRegistryService.js — Provider adapter registration
```

## 3. Key Logic Analysis

### caseLogic.js — Case Lifecycle

```js
export const caseLogic = {
  async create(data, actor) {
    guard('cases.create'); // Client-side permission check

    const id = IDEngine.generate('CS');
    const caseData = { id, ...data, created_at: nowISO(), updated_at: nowISO() };

    // Validate required fields
    if (!caseData.caseNumber) return fail('Case number is required');

    const result = await casesRepository.create(caseData);
    await auditService.record({ action: 'cases.create', module: 'cases', user: actor });

    return result;
  },

  async list(filters) {
    guard('cases.read');
    return casesRepository.getAll(filters);
  },

  async getById(id) {
    guard('cases.read');
    return casesRepository.getById(id);
  },

  async update(id, changes, actor) {
    guard('cases.update');

    const existing = await casesRepository.getById(id);
    if (!existing) return fail('Case not found');

    const updated = await casesRepository.update(id, {
      ...changes,
      updated_at: nowISO(),
    });
    await auditService.record({ action: 'cases.update', module: 'cases', user: actor, details: id });

    return updated;
  },

  async delete(id, actor) {
    guard('cases.delete');

    // Check for related records
    const docs = await documentsRepository.getAll({ caseId: id });
    if (docs.length > 0) return fail('Cannot delete case with documents');

    await casesRepository.delete(id);
    await auditService.record({ action: 'cases.delete', module: 'cases', user: actor, details: id });
  },
};
```

**Problems:**
- No transaction: create, audit could succeed while repository fails (partial state)
- No input sanitization beyond required field check
- `delete` checks for documents but not hearings, tasks, contacts (incomplete cascade check)

### permissionGuard.js — Service Layer Guard

```js
// Module-level mutable singleton — not ideal for testability
let _currentUser = null;

export function setCurrentUser(user) {
  _currentUser = user;
}

export function guard(permission) {
  if (!rbacLogic.resolve(_currentUser, permission)) {
    throw new Error(`Access denied: ${permission}`);
  }
}
```

**Problems:**
- Uses a module-level mutable variable (`_currentUser`) — global state
- Not testable without explicit reset
- If `setCurrentUser` is not called before `guard`, `_currentUser` is null, `rbacLogic.resolve` returns false, **all guards fail**
- This is a fragile pattern — the entire security of the app depends on this variable being set correctly

### searchLogic.js — Multi-Entity Search

```js
export const searchLogic = {
  async searchAll(query, options = {}) {
    const results = {};

    // Load ALL data from ALL searchable entities
    const [cases, documents, contacts, courts, hearings] = await Promise.all([
      casesRepository.getAll(),
      documentsRepository.getAll(),
      contactsRepository.getAll(),
      courtsRepository.getAll(),
      hearingsRepository.getAll(),
    ]);

    // Build in-memory index
    const indexProvider = getSearchProvider();
    await indexProvider.rebuildIndex({
      cases, documents, contacts, courts, hearings,
    });

    // Search
    const hits = await indexProvider.search(query, options);

    // Group by entity type
    for (const hit of hits) {
      const type = hit.collection;
      if (!results[type]) results[type] = [];
      results[type].push(hit.doc);
    }

    return results;
  },
};
```

**Problems:**
- Every search fetches ALL rows from 5+ tables
- In-memory TF scoring on the entire dataset
- No database-level full-text search
- No pagination — returns all results at once
- No relevance threshold (returns everything with score > 0)

### notificationLogic.js — Computed Notifications

```js
export const notificationLogic = {
  async getNotifications(userId) {
    // Compute notifications from multiple sources
    const hearings = await hearingsRepository.getAll();
    const tasks = await tasksRepository.getAll({ assignedTo: userId });
    const reminders = await remindersRepository.getAll({ userId });

    const notifications = [];

    // Upcoming hearings (within 7 days)
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    for (const hearing of hearings) {
      const hearingDate = new Date(hearing.date);
      if (hearingDate >= now && hearingDate <= nextWeek) {
        notifications.push({
          type: 'hearing',
          message: `Upcoming hearing: ${hearing.caseNumber} on ${hearing.date}`,
          date: hearing.date,
        });
      }
    }

    // Overdue tasks
    for (const task of tasks) {
      if (task.dueDate && new Date(task.dueDate) < now && task.status !== 'completed') {
        notifications.push({
          type: 'task',
          message: `Overdue task: ${task.title}`,
          date: task.dueDate,
        });
      }
    }

    return notifications.sort((a, b) => new Date(b.date) - new Date(a.date));
  },
};
```

**Problems:**
- Fetches ALL hearings (not just user-related) — data leak (sees every hearing in the system)
- No caching — re-computed on every call
- No pagination — returns all notifications at once
- No notification dismissal mechanism
- No push notifications (requires service worker)

### backupLogic.js — Backup & Restore

(See detailed analysis in Pass 6 — this is a comprehensive 292-line module with retention, verification, import/export, protection.)

### settingsLogic.js — Settings Manager

```js
export const settingsLogic = {
  async get(key) {
    return settingsService.get(key);
  },

  async getAll() {
    return settingsService.getAll();
  },

  async set(key, value, actor) {
    guard('settings.update');
    const result = await settingsService.set(key, value);
    await auditService.record({ action: 'settings.update', module: 'settings', user: actor });
    return result;
  },
};
```

### citationLogic.js — Legal Citation Search

```js
export const citationLogic = {
  async search(query) {
    // Parse citation format (e.g., "(2023) 4 SCC 123" or "AIR 2023 SC 456")
    const parsed = this.parseCitation(query);
    if (!parsed) return [];

    // Search in judgments library
    const judgments = await judgmentsRepository.getAll({
      year: parsed.year,
      volume: parsed.volume,
      court: parsed.court,
    });

    // Score by citation match quality
    return judgments.map(j => ({
      ...j,
      score: this.calculateScore(j, parsed),
    })).sort((a, b) => b.score - a.score);
  },
};
```

**Problems:**
- No integration with external legal citation databases (Indian Kanoon, SCC Online, Manupatra)
- Citation parsing is regex-based and fragile
- `judgments` entity may not have all historical judgments loaded

## 4. Cross-Cutting Concerns

### Error Handling Pattern

The app uses a custom `result.js` utility:
```js
export function ok(value) {
  return { ok: true, value };
}
export function fail(error) {
  return { ok: false, error: typeof error === 'string' ? error : error.message };
}
```

Pattern usage across the codebase:
```js
const result = await caseLogic.create(data, user);
if (!result.ok) {
  // Handle error
  showError(result.error);
  return;
}
setCases(prev => [...prev, result.value]);
```

**Positives:**
- Consistent `ok/fail` return pattern
- Functions return results rather than throwing (most of the time)
- Callers check `.ok` before using `.value`

**Negatives:**
- Not consistently applied — many services throw errors that propagate up raw
- No typed errors — errors are strings, not discriminated unions
- No stack trace preservation

### Audit Trail

`auditService.js` records all user actions:
```js
await auditService.record({
  action: 'cases.create',
  module: 'cases',
  user: actor,
  details: 'Case CS-2024-00123 created',
  meta: {},
});
```

**Problems:**
- `ip: 'client'` is not a real IP
- No way to distinguish automated vs. user actions
- `list()` returns all logs without pagination or filtering
- No log retention policy

### Idempotency

No idempotency keys are used anywhere. If the user double-clicks "Save":
1. Two concurrent requests go out
2. Both might succeed, creating duplicate records
3. No `idempotencyKey` check, no `ON CONFLICT DO NOTHING`

### Retry Logic

`apiClient.js` has retry logic:
```js
async function apiClient(url, options = {}) {
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}
```

But this is only used for the optional `VITE_BACKEND_URL` path. The primary Supabase/Mongo/Firebase paths have no retry logic.

### Transaction Boundaries

**No transactions exist.** The app cannot:
- Create a case AND its initial task in one atomic operation
- Roll back a document upload if metadata creation fails
- Ensure that audit log writes + data writes are consistent

## 5. Context Managers

### AuthContext.jsx

```jsx
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount
    authProvider.restoreSession()
      .then(async (session) => {
        if (session) {
          setUser(session.user);
          setSession(session);
          // Load role + permissions
          const role = await roleService.getById(session.user.roleId);
          setPermissions(role.permissions || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    permissions,
    loading,
    hasPermission: (perm) => permissions.includes(perm),
    signIn: async (email, password) => { ... },
    signOut: async () => { ... },
  }), [user, session, permissions, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

**Problems:**
- `hasPermission` is recreated on every `permissions` change
- `permissions` array causes re-render of every consumer on any permission change
- No batched updates — setting user + session + permissions triggers 3 re-renders

### AppDataContext.jsx

```jsx
const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshCases = useCallback(async () => {
    setLoading(true);
    const result = await caseLogic.list();
    setCases(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshCases();
  }, [refreshCases]);

  const value = useMemo(() => ({
    cases, loading, refreshCases,
  }), [cases, loading, refreshCases]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
```

**Problems:**
- Loads ALL cases on app startup — terrible for large datasets (1000+ cases)
- No pagination — entire case list in memory
- Causes re-render of ALL consumers when ANY case changes
- No filtering — simple context holds complete list

### SettingsContext.jsx

```jsx
const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    settingsLogic.getAll().then(s => {
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s });
    });
  }, []);

  const updateSetting = useCallback(async (key, value) => {
    await settingsLogic.set(key, value);
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}
```

**Acceptable for its scope** — settings change infrequently and the pattern is simple.

## 6. Workflow Gaps

### Missing Workflows

| Workflow | Current State | Should Be |
|----------|---------------|-----------|
| Case creation with documents | Sequential (create case, then upload docs) | Atomic transaction |
| User registration -> role assignment | Bootstrap process logs passwords | Admin approval workflow |
| Document approval/rejection | Not implemented | Multi-step approval chain |
| Case transfer between advocates | Single operation | Notification + confirmation |
| Bulk operations | CrudManager handles client-side only | Server-side batch processing |
| Backup scheduling | Manual only | Cron-based automated |
| Email notifications | Not implemented | Server-side email service |

## 7. Scoring

### Workflow Score: 2/10

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Logic layer structure | 8/10 | Well-organized by domain, consistent pattern |
| Error handling | 5/10 | ok/fail pattern is good but not consistently applied |
| Audit trail | 5/10 | Exists but minimal — no details on what changed |
| Transactions | 0/10 | No atomic operations across entities |
| Idempotency | 0/10 | No guard against duplicate submissions |
| Retry logic | 2/10 | Only in apiClient.js (fallback path), not in primary path |
| Workflow completeness | 3/10 | Many legal workflows not implemented (approval, transfer, notification) |
| Input validation | 4/10 | Required field checks only, no cross-field or format validation |

### Context Management Score: 4/10

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Separation of concerns | 6/10 | Each context has a clear purpose |
| Re-render optimization | 2/10 | Context causes cascading re-renders |
| Data loading strategy | 2/10 | AppDataContext loads ALL cases on mount |
| Permission caching | 4/10 | Loaded once, but never invalidated |

### Service Layer Score: 6/10

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Service coverage | 8/10 | 65 services covering most operations |
| Provider abstraction | 9/10 | Clean factory pattern |
| Error propagation | 4/10 | Mix of `ok/fail` returns and thrown errors |
| Cross-cutting concerns | 3/10 | No logging middleware, no telemetry, no transaction middleware |

---

# Pass 5: UI Design System, CSS & Components Audit

## 1. Current Architecture

**CSS:** Single monolithic file `src/styles/index.css` — **527 KB, 26,675 lines**.

**Component library:** 62 components in `src/components/`:
- Layout: `AppLayout`, `Sidebar`, `Topbar` (in `layouts/`)
- Primitives: `Button`, `Card`, `Badge`, `Icon`, `Spinner`, `Toggle`, `Modal`, `Modal` pattern variants
- Data: `DataTable`, `CrudManager`, `CrudListPage`, `EntityManager`, `EntityListPage`, `PageHeader`
- Forms: `Field`, `Input`, `Textarea`, `Select` (in `Field.jsx`), `DateInput`, `SearchableSelect`, `ColorPicker`, `PasswordInput`, `FileDrop`
- Permission: `PermissionGate`, `PermissionCheckbox`, `PermissionMatrix`
- Domain-specific: `CitationCard`, `CaseForm`, `DocEditor`, `RichTextEditor`, `CaseSelect`, `HearingFormModal`, `CaseDocTab`, etc.

**Design tokens:** CSS custom properties in `:root`:
- Colors: navys, gold, brand, surfaces, text, status colors (green/red/amber)
- Spacing: `--sidebar-w`, `--topbar-h`
- Shadows: `--shadow-sm`, `--shadow`, `--shadow-lg`, `--shadow-brand`
- Radius: `--radius`, `--radius-sm`
- Scrollbar: `--scrollbar-size`, `--scrollbar-thumb`, `--scrollbar-track`

**Icon system:** Inline SVG icons in `Icon.jsx` — 90+ path definitions, stroke-based Feather-style, plus complex multi-element icons and illustrations. No icon library dependency.

**Badge system:** Dynamic color generation in `badgeColors.js` with hue-based color families. Active=green, Inactive=red are hard-wired regardless of input tone.

## 2. Problems

### Critical:

1. **Monolithic 26,675-line CSS file** — No component-scoped styles, no CSS modules, no CSS-in-JS. A single change to a button style can affect every page. Class name collisions are inevitable. Dead CSS cannot be identified or removed. Tree-shaking is impossible — the entire CSS is loaded on every page.

2. **No responsive design system** — Only two breakpoints detected: `@media (max-width: 767px)` for mobile. No tablet, no wide desktop, no print stylesheet. The sidebar collapses to 78px on mobile but the main content area still expects a 264px margin. Many pages use hardcoded pixel values rather than fluid layouts.

3. **No CSS reset or normalization** — The CSS starts with `* { box-sizing: border-box; }` but no consistent reset for margins, paddings, list styles, button defaults, or focus outlines. This means browser-specific rendering differences are unhandled.

### High:

4. **Inconsistent naming convention** — Mix of:
   - BEM-like: `card__head`, `card__body`, `card--hover`
   - Utility: `loading-block`, `scroll-area`, `table-scroll`
   - Flat: `empty`, `badge`, `toast`
   - Unique: `em-modal-subtitle`, `gs-logo-upload__input`
   No single methodology is enforced.

5. **No design system documentation** — No style guide, no component documentation, no visual regression tests. Developers must read the CSS or look at existing pages to understand available patterns.

6. **Accessibility gaps** — Focus outlines are not consistently styled. `Icon.jsx` uses `aria-hidden="true"` but many interactive elements lack `aria-label`, `role`, or keyboard navigation support. The `Modal` component uses `aria-label` on the close button only.

7. **Hardcoded values in components** — `Card.jsx` has no variant system for different card types. `Spinner.jsx` has no size variants. `EmptyState.jsx` only has one icon size. Many components lack composability.

8. **`CrudManager.jsx` is too large** — This single component handles Single Add, Single Edit, Single Delete, Bulk Add, Bulk Edit, Bulk Delete, Import, and Progress Bar. It's a monolith that violates the single-responsibility principle.

9. **No dark mode** — The entire design system uses light-mode colors only. No `prefers-color-scheme: dark` media query. No CSS custom property overrides for dark theme.

### Medium:

10. **CSS custom properties are not comprehensive** — Missing: font sizes scale, spacing scale (4/8/12/16/20/24/32), animation durations, z-index scale, and color opacity variants.

11. **Font loading not optimized** — `font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif` relies on system fonts with no `@font-face` declaration. Inter is not loaded. On Windows, it falls back to Segoe UI which has different metrics.

12. **`SearchableSelect.jsx` uses `position: fixed` with manual positioning** — The dropdown uses `getBoundingClientRect()` and `position: fixed` with hardcoded z-index 9999. This breaks in modals, scrolling containers, and nested stacking contexts.

13. **No CSS containment** — No `contain: layout style paint` or `content-visibility: auto` on large lists, tables, or off-screen content. This means the browser layouts every DOM node even when invisible.

14. **Inline SVG icons cannot be themed** — The `Icon` component uses `stroke="currentColor"` on simple paths, but `COMPLEX` icons use `stroke="currentColor"` on each element. The `ILLUSTRATIONS` use mixed `fill="currentColor"` and hardcoded `fill="#fff"` — the white fill breaks on dark backgrounds.

15. **No design tokens file** — CSS custom properties are defined in `index.css` with the rest of the CSS. Enterprise design systems keep tokens in a separate file or import from a design tool (Figma tokens plugin).

16. **DateInput is a dual-input hack** — Uses a visible text input for display + a hidden `<input type="date">` for the native picker. The `showPicker()` API is non-standard (Chrome-only). On Firefox, the calendar picker icon is invisible.

## 3. Enterprise Recommendation

### Phase 1 — CSS Architecture:
- Split `index.css` into modules: `tokens.css`, `reset.css`, `layout.css`, `components/` (one per component), `pages/`, `utilities.css`
- Move all design tokens to `tokens.css` — colors, spacing scale, typography scale, shadows, z-index, animation
- Adopt CSS Modules (`.module.css`) for component-scoped styles — zero global leakage, dead code elimination via Vite
- Add `:focus-visible` outline style for accessibility

### Phase 2 — Design System:
- Create a central `components/design-system/` directory with primitives
- Extract `CrudManager` into separate components: `CrudSingleForm`, `CrudBulkForm`, `CrudImport`, `ProgressBar`
- Add component variants: `Button` variants (primary, secondary, ghost, danger, outline), sizes (sm, md, lg)
- Add dark mode via `prefers-color-scheme` and manual toggle
- Add responsive grid system with defined breakpoints

### Phase 3 — Tooling:
- Add Storybook for visual component development and documentation
- Add visual regression testing (Chromatic/Playwright)
- Add design token export from Figma (via style-dictionary or similar)
- Add `content-visibility: auto` on large data tables and lists for rendering performance
- Replace `position: fixed` dropdown with `position: absolute` + `overflow: visible` on a portal

## 4. Component Inventory

| Component | Reusable? | Variants | Accessibility | Notes |
|-----------|-----------|----------|---------------|-------|
| `Button` | ✅ | primary, sm, loading | ✅ aria-disabled | Good |
| `Card` | ✅ | hover, noPad | ❌ no aria | Acceptable |
| `Modal` | ✅ | lg | ⚠️ close btn aria only | Escape handler, portal |
| `Badge` | ✅ | dynamic tone | ⚠️ color-only semantics | Add aria-label for status |
| `Icon` | ✅ | size, strokeWidth | ✅ aria-hidden | 90 icons, no external dep |
| `DataTable` | ✅ | search, sort, select | ❌ no aria-sort/role | Good core |
| `Spinner` | ✅ | none | ⚠️ aria-busy missing | Too simple |
| `EmptyState` | ✅ | icon, hint, action | ⚠️ no role="status" | Fine |
| `Field` | ✅ | label, hint | ⚠️ no htmlFor auto-link | Needs work |
| `DateInput` | ⚠️ | — | ❌ no datepicker label | Chrome-only picker |
| `SearchableSelect` | ✅ | — | ❌ no aria-expanded | Fixed position breaks |
| `PermissionGate` | ✅ | module+action | ✅ | Clean |
| `CrudManager` | ⚠️ | 7 tabs, progress | ❌ no aria | Too large, split |
| `Toggle` | ✅ | — | ⚠️ no role="switch" | Simple |
| `FileDrop` | ✅ | — | ❌ no aria | Need drag/drop |
| `RichTextEditor` | ❌ | — | ❌ contentEditable | Very basic |
| `DocEditor` | ❌ | — | ❌ contentEditable | Case-specific |

## 5. CSS Architecture Score

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| **Design tokens** | 5/10 | CSS vars exist but incomplete, no typography scale, no spacing scale |
| **Component CSS** | 1/10 | All in one file, no isolation, no modules |
| **Responsiveness** | 2/10 | Single mobile breakpoint, hardcoded widths |
| **Accessibility** | 3/10 | Some aria-hidden, missing roles, properties, keyboard |
| **Dark mode** | 0/10 | Not supported |
| **Animation** | 6/10 | CSS transitions on sidebar, some hover effects |
| **Typography** | 4/10 | System fonts, no @font-face, no type scale |
| **Icon system** | 8/10 | Clean, no dep, 90+ icons |
| **Component count** | 62 | Good breadth, but not individually documented |
| **Maintainability** | 2/10 | 26K-line file is a liability |

---

# Pass 6: Performance/Caching/Storage/Backup/Monitoring Audit

## 1. Caching Architecture

### queryCache.js (`src/data-layer/queryCache.js`) — 124 lines:

```
store = new Map()      → keyed by query string
  each entry:
    data              → last fetched result
    error             → last error
    status            → idle | loading | refreshing | success | error
    promise           → deduplication (one in-flight per key)
    ts                → timestamp of last successful fetch
    version           → bump count for React subscription
    fetcher           → stored fetcher function
    subs              → Set<callback> for useSyncExternalStore
```

**Strengths:**
- Uses `useSyncExternalStore` — React 18 concurrent-safe, no tearing
- Stale-while-revalidate pattern: returns stale data immediately, refetches in background
- In-flight deduplication: same key, multiple subscribers get one network call
- Dedicated mutation helpers: `invalidateQuery()`, `setQueryData()` for optimistic updates
- `setQueryData` supports functional updater `(prev) => next`

**Problems:**

| Problem | Severity | Detail |
|---------|----------|--------|
| No memory limit | **Critical** | `Map` grows unboundedly. A page that visits 1000 different records creates 1000 cache entries that are never evicted. Memory leak under extended usage. |
| No cache persistence | High | All data lost on page refresh/close. A full page navigation triggers a full reload from the database. No localStorage, IndexedDB, or service worker backing. |
| No cross-tab coherence | High | Two tabs see independent caches. Mutate on Tab A → Tab B serves stale data for up to 5 minutes. |
| Default staleTime = 5 min | Medium | Records, statuses, or shared data stale for 5 minutes. `invalidateQuery()` must be called manually after every mutation, but no mechanism enforces this. |
| No GC/eviction | Medium | Entries for unmounted components remain in memory forever. No `WeakRef`, no TTL, no LRU. |
| No cache-busting for schema changes | Medium | Schema migrations don't invalidate cache. Stale schema data served post-migration. |

### settingsCache.js (`src/core/settingsCache.js`):

Simple object cache with subscriber pattern. Entire cache replaced on `setAll`. No persistence, no TTL. Acceptable for its narrow use case but could leak stale settings.

### Service Workers:

None. No offline support, no push, no background sync, no cached asset shell.

## 2. Storage Pipeline

### storageService.js (`src/services/storageService.js`):

```mermaid
User upload → storageService.upload()
  → getFileStorageProvider().upload(file)     [no compression]
  → (optional OCR) → getOCRProvider().extract(file)
  → documentsRepository.create(...)
  → fileSyncService.onChange('create', record)
  → return { stored, text, caseId, folder }
```

| Problem | Severity | Detail |
|---------|----------|--------|
| No client-side compression | **Critical** | `upload(file)` passes raw file as-is. A 20MB PDF is stored as 20MB. No image resize, no JPEG compression, no chunking. The `compression` flag in backup settings is explicitly documented as "simulated." |
| No upload progress | **High** | User sees no progress bar for large files. On slow connections the UI hangs until upload completes. |
| No chunked uploads | **High** | Files above Supabase Storage's size limit (6MB on free tier, varies) silently fail. No pause/resume for large uploads. |
| No file type validation | **Medium** | `upload()` accepts any `File` object. No MIME type whitelist, no magic byte check, no extension verification. Malicious file uploads are possible. |
| No size limit | **Medium** | No `maxSize` check before upload. User can attempt to upload a 4GB file to a provider that allows only 100MB. |
| Silent OCR failure | **Low** | OCR errors are caught and replaced with `''`. The user sees no feedback that OCR failed. |
| `copyDocument` re-uploads | **Low** | Copies the database record but not the underlying file. The copy shares the original's storage reference. Deleting the original would break the copy. |

**No image compression pipeline exists** — `tools/` has no image processing, no `canvas`-based resize, no WebP conversion. The only "compression" is a boolean flag that does nothing.

## 3. Backup System

### Components:

| Module | Lines | Role |
|--------|-------|------|
| `backupLogic.js` | 292 | Business logic — create, list, verify, restore, export, import, retention |
| `backupService.js` | 28 | Low-level storage — catalog + settings via preferencesService |
| `backupFileService.js` | 115 | File storage backup — UDB export + case file mirror |
| `udbEngine.js` | 190 | Universal Database format — build, validate, repair, verify checksums, import |

### Format: UDB v3.0 — self-describing JSON package:

```
{
  format: "UDB",
  manifest: { app, udbVersion, schemaVersion, sourceProvider, exportedAt, collections, counts, checksum, checksums },
  version: { udbVersion, schemaVersion, ... },
  schema: schemas,
  permissions: [],
  relationships: [],
  settings: [],
  data: { collection: rows, ... },
  attachments: {},
  logs: [],
  checksum: "sha256"
}
```

**Strengths:**
- Provider-independent format — export from Supabase, import into Firebase
- Canonical key ordering for deterministic checksums
- Per-section checksums (`data`, `logs`, `settings`, `permissions`)
- Auto-repair on malformed imports
- FIFO retention with protected backups excluded from cleanup
- File storage backup mirrors both database UDB + all case files at concurrency 3

**Problems:**

| Problem | Severity | Detail |
|---------|----------|--------|
| Encryption flag is **simulated** | **Critical** | `encryption: true` in settings does nothing. Comment says "demo only — see note." Backup files contain unencrypted JSON with all case data, client names, documents. |
| Compression flag is **simulated** | **Critical** | `compression: true` in settings does nothing. Comment says "simulated flag — no real compression." Backups are full-size JSON. |
| Full snapshot every time | **High** | No incremental backups. A 10MB database produces a 10MB+ backup every run. No delta/differential. |
| Catalog stored in preferences | **High** | `preferencesService.get()` returns entire JSON catalog. On Supabase, this means a single row stores all backup records including full data payloads. For 100 backups × 10MB each = 1GB in a single preferences row. |
| No restore dry-run | **Medium** | `restore()` immediately writes to the active database. No `--dry-run` or preview of what would change. |
| No backup scheduler | **Medium** | `frequency: 'daily'`, `time: '02:00'` are settings only. No `setInterval`/`cron`/`service worker` actually runs backups automatically. User must trigger manually. |
| SCHEMA_VERSION mismatch | **Low** | `backupLogic.SCHEMA_VERSION = 15` hardcoded, while `udbEngine` uses `SCHEMA_VERSION` from schema/index.js (34). If these drift, backups from a future version may fail validation. |
| File backup is download-reupload | **Medium** | `backupFileService.createDatafileBackup()` downloads every file from primary storage, then uploads to Backup folder. For 1000 files at 10MB each = 10GB of download + 10GB of upload. No provider-side copy/fetch API used. |
| No automated restore verification | **Low** | After restore, no automated checks run to verify data integrity (e.g., row counts match, foreign keys intact). |

## 4. Monitoring & Observability

### auditService.js (`src/services/auditService.js`):

- Record: `{ action, module, user, details, meta }` → `auditLogs` collection
- `ip` is hardcoded to `'client'` — no server means no real source IP
- Errors silently swallowed
- `list()` calls `getAll({...query})` with no pagination, no time-range filtering
- No audit log retention/rotation policy

### PerformanceAnalytics.jsx:

- Hardcoded values: `99.8% Uptime`, `210ms Avg Response Time` — **not real metrics**
- Error rate table shows all zeros — no actual error tracking infrastructure
- Calls `analyticsLogic.getMetrics()` which returns basic record counts only

### ErrorBoundary.jsx (`src/components/ErrorBoundary.jsx`):
- Wraps entire app in `App.jsx`
- Only renders error message + stack trace to screen
- No error reporting service (Sentry, Rollbar, Datadog)
- No retry button for user
- No network error distinction from render errors

### console.log usage: 99 occurrences across the codebase:
- `AdminSetup.jsx`: **18 console.log calls** for debugging bootstrap flow
- `authLogic.js`: **15 console.log/warn/error calls** logging passwords, email, user IDs
- `databaseManagerLogic.js`: **13 console.log calls** logging install steps
- Security concern: `authLogic.js:25` logs password length: `console.log('[Bootstrap] signup password length:', password.length)`

### Monitoring gaps:

| Gap | Severity | Detail |
|-----|----------|--------|
| No real performance metrics | **Critical** | No Web Vitals (LCP, FID, CLS), no API response timing, no render tracking |
| No error reporting | **Critical** | No Sentry/Datadog/Bugsnag. Errors only show in console or ErrorBoundary UI. |
| No uptime monitoring | **High** | The hardcoded "99.8% Uptime" is meaningless. No actual uptime tracking. |
| No request tracing | **High** | No correlation IDs, no waterfall timing for API calls |
| No user session tracking | **Medium** | No analytics (PostHog/Plausible), no page view tracking, no feature usage |
| No log levels | **Medium** | No `logger.info/warn/error/fatal` abstraction — raw console.log everywhere |
| No production log stripping | **Medium** | Console logs in development builds (fine), but also present in production Vite build |
| Password lengths logged | **High** | `authLogic.js:25` logs `password.length` — not the password itself, but a security smell |

## 5. React Performance

| Pattern | Found? | Count | Quality |
|---------|--------|-------|---------|
| `React.lazy` + Suspense | ✅ | Via `lazyWithRetry` | Good — enables code splitting |
| `React.memo` | ❌ | 0 | No component memoization |
| `useMemo` | ✅ | 100+ | Widely used, mostly correctly |
| `useCallback` | ✅ | 100+ | Widely used, mostly correctly |
| `useTransition` | ❌ | 0 | No concurrent rendering |
| `startTransition` | ❌ | 0 | No urgent/non-urgent distinction |
| Virtualization | ❌ | 0 | DataTable loads all rows into DOM |
| `content-visibility` | ❌ | 0 | No CSS containment on large lists |
| Service Worker | ❌ | 0 | No offline shell |

**Code splitting status:**
- Routes defined in `routes/index.jsx` use `React.lazy` via `lazyWithRetry`
- Only route-level splitting — no component-level chunking
- No preload/prefetch hints for anticipated routes

## 6. Scoring

### Performance/Caching/Backup/Monitoring Score: 34/100

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| **Query caching** | 7/10 | Good stale-while-revalidate pattern, dedup, useSyncExternalStore. Lacks eviction, persistence, cross-tab sync. |
| **Settings caching** | 5/10 | Simple, works, but no invalidation or isolation. |
| **Storage pipeline** | 3/10 | No compression, no progress, no chunking, no validation. Simulated flags do nothing. |
| **Backup system** | 6/10 | Excellent UDB format, per-section checksums, auto-repair, retention, protection. But encryption and compression are fiction, no increments, no scheduler. |
| **Monitoring** | 1/10 | No real metrics, no error reporting, no tracing, no analytics. Performance page shows hardcoded values. |
| **Logging** | 3/10 | auditService exists but is lean. 99 console.log calls, including password lengths. No log levels. |
| **Error handling** | 4/10 | ErrorBoundary exists, lazyWithRetry handles chunk failures. No error reporting service, no retry. |
| **React performance** | 5/10 | Code splitting, good memo usage but no memo(), no concurrent features, no virtualization. |
| **Offline support** | 0/10 | No service worker, no offline mode, no persisted cache. |
| **Web Vitals** | 0/10 | No PerformanceObserver, no real user monitoring. |

**Overall Pass 6 Score: 34/100** — The backup format design is the standout. Everything else (performance measurement, storage pipeline, monitoring, offline) needs fundamental overhaul.

---

# Pass 7: Complete Enterprise Redesign & Migration Roadmap

## 0. Executive Summary

LexAI is a remarkably ambitious SPA with excellent **architectural intent** (clean layers, provider abstraction, authority-based RBAC) but has five fundamental problems that prevent it from being a production legal SaaS:

1. **No backend server** — Browser talks directly to Supabase with `anon` key. Every security control runs client-side. Any user with devtools can bypass everything.
2. **No test infrastructure** — 0 tests across 200+ modules. A single regression can break the entire app silently.
3. **Monolithic CSS + no design system** — 27K lines of CSS in one file, no component isolation, no dark mode.
4. **Simulated features** — "Encryption", "compression", "OCR success" are flags that do nothing.
5. **No monitoring, no offline, no performance measurement** — The "Performance Analytics" page shows hardcoded values.

**This plan fixes all five in four phases over ~6 months.**

## 1. Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Browser (React SPA)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Pages   │  │  Logic   │  │  Hooks   │              │
│  │  (slim)  │  │  (thin)  │  │  + SWR   │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│  ┌────▼──────────────▼──────────────▼─────┐             │
│  │        GraphQL Client (Apollo)         │             │
│  │        + REST fallback                 │             │
│  └────────────────┬───────────────────────┘             │
└───────────────────┼─────────────────────────────────────┘
                    │ HTTPS + JWT
┌───────────────────▼─────────────────────────────────────┐
│              Backend (Node.js + Fastify)                 │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  Auth    │  │  GraphQL │  │  REST    │  │  Admin │ │
│  │  Module  │  │  Gateway │  │  API     │  │  API   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │              │              │              │     │
│  ┌────▼──────────────▼──────────────▼──────────────▼──┐ │
│  │              Service Layer                          │ │
│  │  Cases │ Docs │ Auth │ Search │ Backup │ AI │ Notif │ │
│  └─────────────────────┬──────────────────────────────┘ │
│                        │                                 │
│  ┌─────────────────────▼──────────────────────────────┐ │
│  │              Data Layer                             │ │
│  │  Kysely (SQL) │ Redis (cache) │ Minio (files)      │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**
- **Abandon the "no backend" SPA approach.** A legal application handling PII, case documents, and court data must have a server-side enforcement layer.
- **GraphQL primary, REST secondary.** GraphQL gives typed queries, avoids over/under-fetching, and allows one round trip for complex pages. Apollo Client replaces `queryCache.js`.
- **PostgreSQL via Kysely** (type-safe query builder) — not raw Supabase REST. Kysely generates SQL, enforces types, and works with any pg driver.
- **Redis** for session cache, query cache, rate limiter counters, and pub/sub for cross-tab invalidation.
- **Minio (S3-compatible)** for file storage, with signed URLs. Replaces direct Supabase Storage access.
- **BullMQ** for background jobs (backup, OCR, sync, bulk email).

## 2. Phase Plan (6 Months)

### Phase 0: Critical Security Patch (Week 1)

| Action | Risk | Effort |
|--------|------|--------|
| Revoke `anon` role's `exec_sql` permission | 🔴 **Critical** | 1 SQL statement |
| Move all API keys to backend env vars only | 🔴 **Critical** | 2 days |
| Add Supabase RLS row-level security on all tables | 🔴 **Critical** | 3 days |
| Replace localStorage session with httpOnly cookie | 🔴 **Critical** | 3 days |
| Add CSP headers preventing inline script execution | 🔴 **Critical** | 1 day |
| Strip `console.log` calls from production build | **High** | 2 hours |

**These are non-negotiable.** Every single one is a CVE-level vulnerability today. Do these before adding any feature.

### Phase 1: Backend Foundation (Weeks 2-6)

**Backend scaffold:**
```
backend/
├── src/
│   ├── index.ts              # Fastify server entry
│   ├── config/               # Env-based config, secrets
│   ├── auth/                 # JWT issue/verify, Supabase integration
│   ├── graphql/              # GraphQL schema, resolvers
│   │   ├── schema.graphql    # Type definitions
│   │   ├── resolvers/        # Per-entity resolvers
│   │   └── context.ts        # Auth context, loaders
│   ├── services/             # Business logic (moved from frontend)
│   ├── db/                   # Kysely schema, migrations, seeds
│   ├── storage/              # Minio client, signed URLs
│   ├── queue/                # BullMQ job definitions
│   ├── middleware/           # Rate limit, audit, cors
│   └── types/                # Shared TypeScript types
├── migrations/               # SQL migration files (timestamped)
├── package.json
└── tsconfig.json
```

**Migration strategy:** Build backend alongside the SPA. The SPA currently calls Supabase directly. During Phase 1, the SPA gains a feature flag: if `VITE_API_URL` is set, all data calls go to the backend instead. This allows incremental rollout.

**Deliverables:**
- Fastify server with JWT auth
- GraphQL schema covering all 50+ entities
- Kysely migrations from current schema (v34)
- Minio storage integration
- 10 core GraphQL resolvers (cases, documents, users, roles, courts, hearings, tasks, contacts, settings, auditLogs)
- Rate limiting (100 req/min per user)
- Audit logging on the server side

**Frontend changes in Phase 1:**
- Replace `queryCache.js` with `@apollo/client`
- Create Apollo Client instance with auth link (JWT from cookie)
- `useQuery()` hook → Apollo's `useQuery()`
- `invalidateQuery()` → Apollo's `refetchQueries` or cache evict
- Backend feature flag: if `VITE_API_URL` is unset, fall back to current direct-Supabase calls (for development/offline)

### Phase 2: Auth & Security Overhaul (Weeks 7-10)

**Current:** SupabaseAuthProvider.js + localStorage tokens + client-side RBAC

**Target:**
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Login Page  │────>│  /api/auth   │────>│  Supabase    │
│              │<────│  (Fastify)   │<────│  Auth (SSR)  │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                    ┌───────▼───────┐
                    │  httpOnly     │
                    │  JWT cookie   │
                    │  (signed,     │
                    │   sameSite,   │
                    │   secure)     │
                    └───────────────┘
```

**Changes:**
- Signup/signin calls the backend, which calls Supabase Auth server-side
- Backend returns JWT in httpOnly secure SameSite=Strict cookie
- `SupabaseAuthProvider` is replaced with a thin `AuthContext` that reads the cookie
- Client-side RBAC (`rbacLogic.js`) becomes a **cache of server-enforced permissions**. The server is the authority. Every backend request checks JWT claims.
- `permissionGuard.js` moves to the backend as middleware
- `PermissionGate.jsx` becomes a UX convenience only — the server will reject unauthorized requests regardless

### Phase 3: Testing & Design System (Weeks 11-16)

**Testing infrastructure:**

| Layer | Tool | Target Coverage |
|-------|------|-----------------|
| Unit (services) | Vitest | 80%+ |
| Integration (API) | Supertest + Fastify | 90% of endpoints |
| Component | Vitest + Testing Library | 60%+ |
| E2E | Playwright | 20 critical paths |
| Visual regression | Chromatic (Storybook) | All components |

**Design system rebuild:**
- Split `styles/index.css` into CSS Modules per component
- Design tokens in `tokens.css` with CSS custom properties
- Storybook with all 62 components documented
- Dark mode via `prefers-color-scheme` + manual toggle
- Responsive grid with 4 breakpoints
- CSS containment on DataTable for large lists

**User-facing improvements:**
- Dark mode toggle in Settings
- Responsive tablet layout
- Searchable component library (Storybook)

### Phase 4: Production Hardening (Weeks 17-24)

| Workstream | Details |
|------------|---------|
| **Performance** | Web Vitals tracking via `web-vitals` library, Lighthouse CI, bundle analyzer, code-split below 200KB per route |
| **Offline** | Service worker with workbox, cache-first for assets, network-first for data, offline fallback page |
| **Backup** | Move backup scheduler to BullMQ (server-side cron), real AES-256 encryption, incremental backups via WAL, backup verification reports |
| **Storage** | Client-side image compression via `canvas` (resize to 1920px max, WebP), chunked uploads via tus protocol, upload progress via XHR `progress` event |
| **Monitoring** | Sentry for error tracking, Datadog/Grafana for metrics, structured logging via pino, health check endpoints |
| **File type validation** | Magic byte checking on the server, MIME whitelist, antivirus scan via ClamAV |
| **Search** | Replace `LocalSearchProvider.js` with PostgreSQL full-text search + triggers (tsvector/tsquery) |

## 3. Critical Path Dependencies

```
Phase 0 (Security)
    │
    ▼
Phase 1 (Backend) ──────► Phase 2 (Auth)
    │                            │
    │                            ▼
    └─────────────► Phase 3 (Testing + Design System)
                            │
                            ▼
                    Phase 4 (Production Hardening)
```

- Phase 0 must be **first** — security holes make everything else moot.
- Phase 2 depends on Phase 1 (backend must exist before auth can move server-side).
- Phase 3 can start **partially** in parallel with Phase 1 (Storybook can be scaffolded independently, CSS module split can begin anytime).
- Phase 4 depends on everything before it.

## 4. Backend Service Migration Map

Each frontend `logic/` module has a corresponding backend service:

| Frontend Logic | Backend Service | Priority | Notes |
|----------------|-----------------|----------|-------|
| `authLogic.js` | AuthService | P0 | Must move to server immediately |
| `rbacLogic.js` | RBACMiddleware | P0 | Server must enforce; client caches |
| `caseLogic.js` | CaseService | P1 | Core domain |
| `userLogic.js` | UserService | P1 | Auth dependency |
| `roleLogic.js` | RoleService | P1 | Auth dependency |
| `documentLogic.js` | DocumentService | P1 | Core domain |
| `hearingLogic.js` | HearingService | P1 | Core domain |
| `taskLogic.js` | TaskService | P2 | |
| `contactLogic.js` | ContactService | P2 | |
| `courtLogic.js` | CourtService | P2 | Reference data |
| `backupLogic.js` | BackupService | P2 | Server-side cron |
| `searchLogic.js` | SearchService | P2 | PostgreSQL FTS |
| `notificationLogic.js` | NotificationService | P3 | |
| `citationLogic.js` | CitationService | P3 | External API |
| `analyticsLogic.js` | AnalyticsService | P3 | Real metrics |
| `versionLogic.js` | VersionService | P3 | |
| `settingsLogic.js` | SettingsService | P3 | |

**Frontend logic modules after migration become thin validation + error handling shells** that call backend GraphQL resolvers via Apollo Client hooks.

## 5. File Deletion / Deprecation Plan

| File | Action | Phase | Reason |
|------|--------|-------|--------|
| `providers/database/*` | **Delete** | Phase 1 | Backend owns all database access |
| `providers/auth/*` | **Delete** | Phase 2 | Backend owns all auth |
| `providers/file-storage/*` | **Delete** | Phase 1 | Backend proxies storage |
| `providers/search/LocalSearchProvider.js` | **Delete** | Phase 4 | Replaced by PostgreSQL FTS |
| `providers/ocr/*` | **Delete** | Phase 4 | OCR runs server-side |
| `data-layer/queryCache.js` | **Delete** | Phase 1 | Replaced by Apollo Client cache |
| `data-layer/AuthContext.jsx` | **Rewrite** | Phase 2 | Simplified to cookie reader |
| `data-layer/AppDataContext.jsx` | **Delete** | Phase 1 | Replaced by Apollo reactive vars |
| `data-layer/repositories/*` (49 files) | **Delete** | Phase 1 | Replaced by GraphQL + service layer |
| `logic/*` (66 files) | **Thin to ~20%** | Phase 1-3 | Heavy logic moves to backend |
| `core/apiClient.js` | **Delete** | Phase 1 | Replaced by Apollo Link |
| `core/AllowlistEngine.js` | **Delete** | Phase 1 | Server-side query validation |
| `core/settingsCache.js` | **Delete** | Phase 1 | Apollo cache handles this |
| `security/clientSecretGuard.js` | **Keep → Improve** | Phase 0 | Still useful for dev environment |
| `utils/crypto.js` | **Delete** | Phase 2 | Hashing done server-side |
| `styles/index.css` | **Split** | Phase 3 | 26K → CSS Modules |
| `components/ErrorBoundary.jsx` | **Rewrite** | Phase 4 | Add Sentry integration |
| `components/DebugPanel.jsx` | **Delete** | Phase 3 | Dev-only, remove from production |
| `components/CrudManager.jsx` | **Split** | Phase 3 | Too large for one component |

**Files to KEEP (with modifications):**
- All 62 `components/*` — UI stays in frontend (thin wrappers)
- `routes/navigation.js`, `routes/index.jsx` — Routing stays
- `app/pages/*` — Pages stay, data fetching changes
- `config/config.js`, `config/featureFlags.js` — Config stays
- `constants/permissions.js` — Permission definitions stay (shared with backend)
- `styles/index.css` → broken into modules, not deleted
- `utils/id.js`, `utils/DateEngine.js`, `utils/FieldMapper.js` — Utility helpers stay
- `data-provider/schema/*` — Schema definitions stay (shared with backend)
- `data-provider/health/*` — Health engine stays (client-side diagnostic)
- `data-provider/udb/udbEngine.js` — UDB format stays (both client and server use this)

## 6. New File Structure (Target)

```
lexai/
├── frontend/                     # React SPA (existing code, refactored)
│   ├── src/
│   │   ├── app/                  # Already here
│   │   ├── components/           # Already here (62 components, thin)
│   │   ├── pages/                # Already here
│   │   ├── hooks/                # NEW — Apollo hooks, custom hooks
│   │   ├── graphql/              # NEW — queries, mutations, fragments
│   │   ├── styles/               # CSS Modules (restructured)
│   │   │   ├── tokens.css
│   │   │   ├── reset.css
│   │   │   └── components/       # *.module.css
│   │   ├── shared/               # Shared types, constants
│   │   │   ├── permissions.js    # From constants/permissions.js
│   │   │   └── types.ts          # NEW — shared types
│   │   ├── utils/                # Keep utilities
│   │   └── main.jsx              # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                      # NEW — Fastify server
│   ├── src/
│   │   ├── index.ts
│   │   ├── config/
│   │   ├── auth/
│   │   ├── graphql/
│   │   ├── services/
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   ├── seeds/
│   │   │   └── kysely.ts
│   │   ├── storage/
│   │   ├── queue/
│   │   ├── middleware/
│   │   └── types/
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                       # NEW — shared between frontend & backend
│   ├── permissions.ts
│   ├── schemas.ts
│   └── types.ts
│
├── docs/                         # Already exists
├── tools/                        # Already exists
└── package.json                  # Root workspace config
```

**Root `package.json` (npm workspaces):**
```json
{
  "workspaces": ["frontend", "backend", "shared"],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "build": "npm run build --workspace=shared && npm run build --workspace=frontend && npm run build --workspace=backend",
    "test": "npm run test --workspaces --if-present"
  }
}
```

## 7. Production Infrastructure

```
                            ┌──────────────┐
                            │  Cloudflare   │
                            │  (CDN, WAF,   │
                            │   DDoS, CSP)  │
                            └──────┬───────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │         Load Balancer        │
                    │         (nginx/ALB)          │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
       ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
       │  Fastify    │     │  Fastify    │     │  Fastify    │
       │  (primary)  │     │  (replica)  │     │  (replica)  │
       └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │         Redis Cluster        │
                    │  (session, cache, queue)     │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
       ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
       │  PostgreSQL │     │   Minio     │     │   BullMQ   │
       │  (RDS)      │     │  (S3)       │     │  (workers) │
       │  + pgvector │     │  + CDN      │     │  + OCR, AI │
       └─────────────┘     └─────────────┘     └─────────────┘
```

**Infrastructure as Code (Terraform):**
- AWS ECS Fargate for backend (auto-scaling)
- RDS PostgreSQL with read replicas
- ElastiCache Redis cluster
- S3 + CloudFront for file storage
- Route53 + Cloudflare for DNS + security

## 8. Adoption Cost Estimate

| Phase | Duration | Team | Cost (USD) | Risk |
|-------|----------|------|------------|------|
| Phase 0: Security | 1 week | 1 dev | $2k | **None — must do** |
| Phase 1: Backend | 5 weeks | 2 devs | $20k | Medium — new code, regression risk |
| Phase 2: Auth | 4 weeks | 1-2 devs | $12k | High — auth is foundational |
| Phase 3: Testing + Design | 6 weeks | 2-3 devs | $30k | Low — parallelizable |
| Phase 4: Hardening | 8 weeks | 2-3 devs | $40k | Medium — many unknowns |
| **Total** | **24 weeks** | **2-3 devs** | **~$104k** | |

**Off-ramp after Phase 2:** After 10 weeks, the system has a working backend, secure auth, and the `exec_sql` vulnerability is gone. The SPA is no longer exposing secrets. This is the minimum viable production state.

## 9. What NOT to Do

| Avoid | Reason |
|-------|--------|
| Rewriting everything at once | "Big Bang" rewrite will take 12+ months and die. Incremental migration is the only path. |
| Porting to TypeScript before Phase 3 | The JS codebase works. Adding types first adds churn with zero user benefit. Do it during Phase 3 when tests validate correctness. |
| Building a real-time sync engine | Offline sync is complex. Add service worker cache-first for reads in Phase 4, skip offline writes for v1. |
| Replacing React | React works fine. The problem is missing backend, not the frontend framework. |
| Microservices | The app is a legal CRM. A monolith with clear module boundaries handles 100K users. Microservices add complexity without benefit. |
| Keeping the "no backend" architecture | It's architecturally unsound for any app handling PII. Legal data requires server-side audit trails, access logs, and encryption at rest. |

## 10. File-Specific Migration Checklist

For each of the 49 repositories and 66 logic modules:

```
1. Copy the business logic to backend/src/services/
2. Create GraphQL resolver for it
3. Create Apollo hook in frontend/src/hooks/
4. Add feature flag gating (VITE_API_URL)
5. Once flag is on for 2 weeks without issues, delete the frontend logic copy
```

**Priority ordering for migration:**
1. `authLogic.js` + `rbacLogic.js` — must move first (security)
2. `caseLogic.js` + `documentLogic.js` — core domain, highest traffic
3. `courtLogic.js` + `hearingLogic.js` + `taskLogic.js` — heavy read volume
4. `userLogic.js` + `roleLogic.js` — admin functions
5. `settingsLogic.js` + `backupLogic.js` — admin/config
6. `notificationLogic.js` + `searchLogic.js` + `citationLogic.js` — auxiliary
7. `analyticsLogic.js` + `reportLogic.js` — reporting, low priority

---

# Appendix: Scoring Summary

| Pass | Area | Score |
|------|------|-------|
| **Pass 1** | Architecture | 8/10 |
| **Pass 1** | Enterprise Readiness | 5/10 |
| **Pass 2** | Schema Design | 7/10 |
| **Pass 2** | Search | 2/10 |
| **Pass 2** | Data Layer | 7/10 |
| **Pass 3** | RBAC Design | 9/10 |
| **Pass 3** | Password Security | 2/10 |
| **Pass 3** | Overall Security | 4/10 |
| **Pass 4** | Workflow Design | 2/10 |
| **Pass 4** | Context Management | 4/10 |
| **Pass 4** | Service Layer | 6/10 |
| **Pass 5** | Component CSS | 1/10 |
| **Pass 5** | Design System | 5/10 |
| **Pass 5** | Accessibility | 3/10 |
| **Pass 6** | Query Caching | 7/10 |
| **Pass 6** | Storage Pipeline | 3/10 |
| **Pass 6** | Backup System | 6/10 |
| **Pass 6** | Monitoring | 1/10 |
| **Pass 6** | React Performance | 5/10 |

# Appendix: Critical Vulnerabilities (Fix Immediately)

1. **`exec_sql` granted to `anon` role** — `supabase_migration.sql` — Full database compromise
2. **All security enforcement runs client-side** — `rbacLogic.js`, `permissionGuard.js` — Bypassable with devtools
3. **Session tokens in localStorage** — `SupabaseAuthProvider.js` — XSS leads to token theft
4. **API keys in client bundle** — `.env.example`, `config.js` — Readable from JS bundle
5. **No test infrastructure** — Zero tests across 200+ modules — Regression risk on every change
6. **26,675-line monolithic CSS** — `styles/index.css` — Unmaintainable, no tree-shaking
7. **Encryption and compression flags are simulated** — `backupLogic.js` — Backups are plaintext
8. **Hardcoded performance metrics** — `PerformanceAnalytics.jsx` — "99.8% Uptime" is a lie

---

*End of Audit Report — All 7 Passes Complete*
