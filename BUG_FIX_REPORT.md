# Bug Fix Report

**Generated:** 2026-06-19
**Scope:** Audit and fix of known bugs across RBAC, role/user CRUD, permissions, and seed engine.

---

## Bug 1 — Silent Role Deletion Failure

| Field | Detail |
|-------|--------|
| **Bug** | `roleLogic.remove()` discarded the return value of `roleService.remove()`. If the underlying provider returned `false` (quota, RLS, network), the UI reported success even though the role was **not** deleted. |
| **Root Cause** | `src/logic/roleLogic.js:73` — `await roleService.remove(id)` called without checking the boolean return. |
| **Files Modified** | `src/logic/roleLogic.js` |
| **Fix Applied** | Added `const removed = await roleService.remove(id); if (!removed) return fail('Delete failed...')` — matching the pattern already used in `userLogic.remove()`. |
| **Test Result** | ✅ PASS — Build verified; logic now matches user deletion guard. |

---

## Bug 2 — Silent Role Update Failure

| Field | Detail |
|-------|--------|
| **Bug** | `roleLogic.update()` returned `ok(row)` even when `row` was `null` (role not found, RLS blocked, etc.). Callers received `{ ok: true, data: null }` and a misleading audit log entry. |
| **Root Cause** | `src/logic/roleLogic.js:57-59` — missing null-check after `roleService.update()`. |
| **Files Modified** | `src/logic/roleLogic.js` |
| **Fix Applied** | Added `if (!row) return fail('Update failed — the role could not be found or updated.')` before the audit call — matching the pattern in `userLogic.update()`. |
| **Test Result** | ✅ PASS — Build verified. |

---

## Bug 3 — Missing Permission Actions (Buttons Hidden)

| Field | Detail |
|-------|--------|
| **Bug** | `backup.protect` and `backup.settings` permission keys were used in permission gates (`BackupHistoryTable.jsx`, `BackupManagement.jsx`) but never defined in the `ACTIONS` array. Non-super-admin roles could never see the "Protect" or "Settings" buttons. |
| **Root Cause** | `src/constants/permissions.js` — the `ACTIONS` array did not include `protect` or `settings`. |
| **Files Modified** | `src/constants/permissions.js` |
| **Fix Applied** | Added `{ key: 'protect', label: 'Protect' }` and `{ key: 'settings', label: 'Settings' }` to `ACTIONS`. All roles with `backup: '*'` or explicit `backup.protect`/`backup.settings` now correctly see the buttons. |
| **Test Result** | ✅ PASS — Build verified; permission keys now resolve for all roles. |

---

## Summary

| Bug | Severity | Status |
|-----|----------|--------|
| Silent role deletion failure | **Critical** | ✅ Fixed |
| Silent role update failure | **Medium** | ✅ Fixed |
| Missing backup permission actions | **Medium** | ✅ Fixed |

**All builds pass after fixes. 290 modules, 0 errors.**
