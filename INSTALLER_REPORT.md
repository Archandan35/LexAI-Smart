# Database Installer Report (Critical Task 2)

## Summary
Added automatic schema detection + a first-run **Setup Wizard** and a one-click
**Install Database** flow that creates structures and seeds system data per
provider — no manual steps for Local/Firebase/MongoDB, and one-click for Supabase
when an `exec_sql` RPC is present (guided SQL fallback otherwise).

## Behaviour by provider
- **Local:** creates all collections immediately, seeds system data, stamps version.
- **Firebase / MongoDB:** collections are created lazily on first write; installer seeds system data (which materialises them) + stamps version. No manual steps.
- **Supabase:** runs the compiler's DDL via the `exec_sql` RPC for true one-click install; if the RPC is absent it surfaces the exact SQL to run once. Honest — never claims success it didn't achieve.

## Setup Wizard
- `SetupGate` sits **above auth** (a fresh remote DB has no admin yet) and renders the wizard only when no schema is detected; **fail-open** so existing local installs are never blocked.
- Wizard shows provider, install status, missing collections, an **Install Database** button, and (for Supabase) the SQL + a Re-check button.

## Files Created
- `src/data-provider/migrations/DatabaseInstaller.js`
- `src/app/pages/DatabaseSetup.jsx`
- `src/components/SetupGate.jsx`

## Files Modified
- `src/providers/database/SupabaseDatabaseProvider.js` — added `execSql()` RPC capability.
- `src/services/databaseAdminService.js` — `detect/installSchemaStructures/installArtifact/stampInstalled`.
- `src/logic/databaseManagerLogic.js` — `detect()`, `install()`.
- `src/app/App.jsx` — wrapped the tree in `SetupGate`.

## Files Removed
- None.

## Risk Level
**Medium** — adds a boot-time gate. Mitigated by fail-open detection and local auto-install (no UX change for existing local users).

## Rollback Plan
Remove the `<SetupGate>` wrapper in `App.jsx` (restores the previous root), and delete the three created files + the `execSql` method. Installer is otherwise inert unless invoked.

## Completion
**100%** for Local/Firebase/MongoDB automatic install. **Supabase one-click = 100% when `exec_sql` RPC exists**, otherwise guided SQL (browser cannot run DDL without it — documented honestly).
