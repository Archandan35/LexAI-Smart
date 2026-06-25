import { useEffect, useState, useCallback } from 'react';
import { courtsLogic } from '@/logic/courtsLogic.js';

let cached = null;

export function useCourts() {
  const [courts, setCourts] = useState(cached?.courts || []);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await courtsLogic.list();
      const names = (Array.isArray(data) ? data : []).filter((h) => h.status !== 'Inactive').map((h) => h.name);
      cached = { courts: names, raw: data };
      setCourts(names);
    } catch { setCourts([]); }
    setLoading(false);
  }, []);

  useEffect(() => { if (!cached) refresh(); }, [refresh]);

  return { courts, loading, refresh };
}

export default useCourts;
