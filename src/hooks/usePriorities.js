import { useEffect, useState, useCallback } from 'react';
import { priorityLogic } from '@/logic/priorityLogic.js';

let cached = null;

export function usePriorities() {
  const [priorities, setPriorities] = useState(cached?.priorities || []);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await priorityLogic.list();
      const list = Array.isArray(data) ? data : [];
      cached = { priorities: list, raw: list };
      setPriorities(list);
    } catch { setPriorities([]); }
    setLoading(false);
  }, []);

  useEffect(() => { if (!cached) refresh(); }, [refresh]);

  return { priorities, loading, refresh };
}

export default usePriorities;
