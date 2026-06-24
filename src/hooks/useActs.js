import { useEffect, useState, useCallback } from 'react';
import { actLogic } from '@/logic/actLogic.js';

let cached = null;

export function useActs() {
  const [acts, setActs] = useState(cached?.acts || []);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await actLogic.list();
      const list = Array.isArray(data) ? data : [];
      cached = { acts: list };
      setActs(list);
    } catch { setActs([]); }
    setLoading(false);
  }, []);

  useEffect(() => { if (!cached) refresh(); }, [refresh]);

  return { acts, loading, refresh };
}

export default useActs;
