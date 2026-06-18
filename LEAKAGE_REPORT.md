# Provider Leakage Removal Report (Critical Task 8)

## Summary
Removed all provider-specific data access from outside the provider folders. The
biggest fix: `backupService` no longer touches `localStorage` — the database
snapshot flows through the provider, and UI preferences moved behind a new
preferences provider.

## Before → After
| Leak | Before | After |
|------|--------|-------|
| DB blob | `backupService` read/wrote `localStorage['lexai.db.v1']` | `databaseAdminService.snapshot()/restore()` (provider-agnostic) |
| Backup catalog/settings | `localStorage` keys in `backupService` | preferences provider via `preferencesService` |
| UI prefs (view/filters/folders/autosave/dismissals) | direct `localStorage` in CaseVault, DraftingStudio, DocumentManager, notificationLogic | `preferencesService` → `LocalPreferencesProvider` |

## Verification (grep over `src/`, excluding `src/providers/`)
- `localStorage` in code outside providers: **none** (only one UI **text string** mentioning the word remains in `BackupManagement.jsx`, since reworded).
- DB SDK imports (`supabase/firebase/mongodb/mongoose/pg/postgres`): **none anywhere**.
- `@/providers/*` imports in pages/components/hooks/logic: **none** (except `SetupGate`, a thin gate component that imports only the logic layer).

## Files Created
- `src/providers/preferences/PreferencesProvider.js`
- `src/providers/preferences/LocalPreferencesProvider.js`
- `src/providers/preferences/index.js`
- `src/services/preferencesService.js`

## Files Modified
- `src/services/backupService.js` — DB blob via provider; catalog/settings via preferences.
- `src/logic/backupLogic.js` — `await` the now-async snapshot/restore.
- `src/logic/notificationLogic.js`, `src/components/DocumentManager.jsx`, `src/app/pages/CaseVault.jsx`, `src/app/pages/DraftingStudio.jsx` — UI prefs via `preferencesService`.
- `src/config/config.js`, `.env.example` — `VITE_PREFERENCES_PROVIDER`.
- `src/app/pages/BackupManagement.jsx` — corrected info copy.

## Files Removed
- None.

## Risk Level
**Medium** — `backupService` behaviour changed (now async, provider-backed). Mitigated: `backupLogic` public API unchanged; existing Backup pages keep working.

## Rollback Plan
Restore `backupService.js`/`backupLogic.js` and revert the four UI-pref edits from git; delete the preferences provider + service. Config key is harmless if left.

## Completion
**100%** — no `localStorage` or DB SDK usage remains outside provider folders.
