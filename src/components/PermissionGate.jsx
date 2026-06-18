import React from 'react';
import { usePermissions } from '@/hooks/usePermissions.js';

// PermissionGate — conditionally renders children based on a permission.
// Usage:
//   <PermissionGate module="casevault" action="delete"><Button .../></PermissionGate>
//   <PermissionGate perm="casevault.delete">…</PermissionGate>
// Renders `fallback` (default null) when not permitted. This is how we hide
// unauthorized buttons, table actions and bulk actions throughout the app.
export default function PermissionGate({ module, action, perm, anyOf, children, fallback = null }) {
  const { can } = usePermissions();
  let allowed;
  if (anyOf?.length) allowed = anyOf.some((p) => can(p));
  else allowed = can(perm || `${module}.${action}`);
  return allowed ? <>{children}</> : fallback;
}
