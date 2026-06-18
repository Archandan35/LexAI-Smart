import { useEffect, useState, useCallback } from 'react';
import { roleLogic } from '@/logic/roleLogic.js';

export function useRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setRoles(await roleLogic.list());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { roles, loading, refresh };
}

export default useRoles;
