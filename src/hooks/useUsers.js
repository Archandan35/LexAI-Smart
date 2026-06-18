import { useEffect, useState, useCallback } from 'react';
import { userLogic } from '@/logic/userLogic.js';

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setUsers(await userLogic.list());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { users, loading, refresh };
}

export default useUsers;
