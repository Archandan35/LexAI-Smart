# Backup Engine Report (Critical Task 7)

## Summary
Added a unified, provider-agnostic `BackupManager` plus a pluggable backup-target
provider layer. Backups are built from the universal `.udb` snapshot, so they
work identically on any database provider.

## Capabilities
- **Manual Backup** — records a retention-aware catalog entry **and** delivers a `.udb` to the chosen destination.
- **Scheduled Backup** — frequency (hourly/daily/weekly/monthly) in backup settings; `runDue()` performs on-load catch-up (wired in `AppLayout`).
- **Restore Backup** — from a catalog entry (delegates to the de-leaked `backupLogic`).
- **Retention Rules** — FIFO + protected entries (delegated to `backupLogic`).

## Destinations (backup-target providers)
- **Local Download** — works (provider touches the DOM, not the UI).
- **Google Drive / Mega / Terabox** — pluggable targets; report unavailability honestly until a backend proxy holds their credentials (mirrors the storage-provider pattern).

## Files Created
- `src/providers/backup/BackupTargetProvider.js`
- `src/providers/backup/LocalDownloadTarget.js`
- `src/providers/backup/CloudBackupTargets.js`
- `src/providers/backup/index.js`
- `src/services/backupTargetService.js`
- `src/logic/BackupManager.js`

## Files Modified
- `src/layouts/AppLayout.jsx` — best-effort `runDue()` on session load.
- `src/logic/databaseManagerLogic.js` — backup/destination/schedule methods.
- `src/app/pages/DatabaseManager.jsx` — Backup section.

## Files Removed
- None.

## Risk Level
**Medium** — cloud destinations need a backend (secrets can't live in the bundle); SPA scheduling is best-effort (on-load catch-up, not a true cron).

## Rollback Plan
Remove the `runDue` effect in `AppLayout`, delete the six created files, and drop the backup methods from `databaseManagerLogic`/`DatabaseManager.jsx`. The existing Backup & Recovery pages (`backupLogic`) keep working independently.

## Completion
**Local backup + scheduled (on-load) + restore + retention = 100%.** Cloud destinations are wired end-to-end but inert pending a backend proxy (documented).
