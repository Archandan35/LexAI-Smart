import { useEffect, useState, useCallback } from 'react';
import { caseLogic } from '@/logic/caseLogic.js';

// useCases — list + mutate cases via the logic layer.
export function useCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await caseLogic.list();
    setCases(rows);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (data) => { await caseLogic.create(data); await refresh(); }, [refresh]);
  const update = useCallback(async (id, patch) => { await caseLogic.update(id, patch); await refresh(); }, [refresh]);
  const remove = useCallback(async (id) => { await caseLogic.remove(id); await refresh(); }, [refresh]);

  return { cases, loading, refresh, create, update, remove };
}

export default useCases;
