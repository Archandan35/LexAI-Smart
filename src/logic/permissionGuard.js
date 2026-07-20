// permissionGuard — service-layer RBAC enforcement.
//
// The route guards, sidebar and PermissionGate components already protect the
// UI. But because this is a client-only SPA (the browser talks directly to the
// data provider), a determined user could call a service function directly and
// bypass the button that was hidden. To make the permission system the *single
// source of truth*, every sensitive service call goes through `requireCapability`
// / `requireModuleView` which re-check the authenticated user's resolved
// permissions before touching the provider.
//
// AuthContext pushes the current resolved `can` function here on every change,
// so service code can validate without a React hook.

let activeCan = () => false;
let activeIsSuperuser = false;
let activeUser = null;

export function syncPermissionGuard({ can, isSuperuser, user }) {
  activeCan = typeof can === 'function' ? can : () => false;
  activeIsSuperuser = !!isSuperuser;
  activeUser = user || null;
}

export function currentCan(perm) {
  return activeCan(perm);
}

export function currentIsSuperuser() {
  return activeIsSuperuser;
}

export function currentUser() {
  return activeUser;
}

// Throws a uniform, permission-scoped error when the caller lacks `perm`.
// Returns silently when allowed (or superuser).
//
// `onlyWhenAuthed` (default true): when no user is currently authenticated the
// guard is a no-op. This keeps first-install bootstrap and the pre-login
// session-restore window working, while still blocking every call made by an
// authenticated session that lacks the capability.
export function requireCapability(perm, { soft = false, onlyWhenAuthed = true } = {}) {
  if (activeIsSuperuser) return true;
  if (onlyWhenAuthed && !activeUser) return true;
  const allowed = activeCan(perm);
  if (allowed) return true;
  if (soft) return false;
  const err = new Error(`Permission denied: ${perm}`);
  err.code = 'PERMISSION_DENIED';
  err.perm = perm;
  throw err;
}

// Convenience: check a module.action pair.
export function requireAction(module, action, opts) {
  return requireCapability(`${module}.${action}`, opts);
}

// View-level guard for module access (used by service entry points that fetch
// data for an entire module, e.g. admin dashboards).
export function requireModuleView(module, opts = {}) {
  if (activeIsSuperuser) return true;
  if (opts.onlyWhenAuthed !== false && !activeUser) return true;
  const allowed = activeCan(`${module}.view`);
  if (allowed) return true;
  if (opts.soft) return false;
  const err = new Error(`Permission denied: ${module}.view`);
  err.code = 'PERMISSION_DENIED';
  err.perm = `${module}.view`;
  throw err;
}

// Soft variant — returns boolean instead of throwing. Useful for conditional
// branching inside services.
export function canPerform(perm) {
  if (activeIsSuperuser) return true;
  return activeCan(perm);
}

export default {
  syncPermissionGuard,
  currentCan,
  currentIsSuperuser,
  currentUser,
  requireCapability,
  requireAction,
  requireModuleView,
  canPerform,
};
