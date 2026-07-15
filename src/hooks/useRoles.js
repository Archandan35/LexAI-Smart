import { useMemo } from 'react';
import { roleLogic } from '@/logic/roleLogic.js';
import { useQuery } from '@/data-layer/queryCache.js';

export function useRoles() {
  const { data, loading, refresh } = useQuery('roles', () => roleLogic.list());
  const roles = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  return { roles, loading, refresh };
}

export default useRoles;
