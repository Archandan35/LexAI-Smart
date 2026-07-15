import { useMemo } from 'react';
import { userLogic } from '@/logic/userLogic.js';
import { useQuery } from '@/data-layer/queryCache.js';

export function useUsers() {
  const { data, loading, refresh } = useQuery('users', () => userLogic.list());
  const users = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  return { users, loading, refresh };
}

export default useUsers;
