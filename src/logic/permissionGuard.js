import { logger } from '@/utils/logger.js';

let activeCan = null;
let activeIsSuperuser = false;
let activeUser = null;
let initialized = false;

export function syncPermissionGuard({ can, isSuperuser, user }) {
  activeCan = typeof can === 'function' ? can : () => false;
  activeIsSuperuser = !!isSuperuser;
  activeUser = user || null;
  initialized = true;
}

export function isInitialized() {
  return initialized;
}

export function resetPermissionGuard() {
  activeCan = null;
  activeIsSuperuser = false;
  activeUser = null;
  initialized = false;
}

function ensureInitialized() {
  if (!initialized) {
    logger.warn('[permissionGuard] Called before syncPermissionGuard — permissions not yet loaded. Use with caution in bootstrap flows only.');
  }
}

export function currentCan(perm) {
  ensureInitialized();
  if (!activeCan) return false;
  return activeCan(perm);
}

export function currentIsSuperuser() {
  ensureInitialized();
  return activeIsSuperuser;
}

export function currentUser() {
  ensureInitialized();
  return activeUser;
}

export function requireCapability(perm, { soft = false, onlyWhenAuthed = true } = {}) {
  ensureInitialized();
  if (activeIsSuperuser) return true;
  if (onlyWhenAuthed && !activeUser) return true;
  if (!activeCan) return false;
  const allowed = activeCan(perm);
  if (allowed) return true;
  if (soft) return false;
  const err = new Error(`Permission denied: ${perm}`);
  err.code = 'PERMISSION_DENIED';
  err.perm = perm;
  throw err;
}

export function requireAction(module, action, opts) {
  return requireCapability(`${module}.${action}`, opts);
}

export function requireModuleView(module, opts = {}) {
  ensureInitialized();
  if (activeIsSuperuser) return true;
  if (opts.onlyWhenAuthed !== false && !activeUser) return true;
  if (!activeCan) return false;
  const allowed = activeCan(`${module}.view`);
  if (allowed) return true;
  if (opts.soft) return false;
  const err = new Error(`Permission denied: ${module}.view`);
  err.code = 'PERMISSION_DENIED';
  err.perm = `${module}.view`;
  throw err;
}

export function canPerform(perm) {
  ensureInitialized();
  if (activeIsSuperuser) return true;
  if (!activeCan) return false;
  return activeCan(perm);
}

export default {
  syncPermissionGuard,
  resetPermissionGuard,
  isInitialized,
  currentCan,
  currentIsSuperuser,
  currentUser,
  requireCapability,
  requireAction,
  requireModuleView,
  canPerform,
};
