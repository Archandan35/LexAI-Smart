import { useAuth } from '@/data-layer/AuthContext.jsx';

// usePermissions — convenience wrapper exposing the resolved permission API.
// can('cases.delete') | has('cases','delete') | canViewModule('backup')
export function usePermissions() {
  const { can, has, canViewModule, isSuperuser, perms } = useAuth();
  return { can, has, canViewModule, isSuperuser, sourceOf: perms.sourceOf, permissions: perms.permissions };
}

export default usePermissions;
