import { useEffect, useState, useCallback } from 'react';
import { courtLogic } from '@/logic/courtLogic.js';

let cached = null;

export function useCourts() {
  const [courts, setCourts] = useState(cached?.courts || []);
  const [courtNames, setCourtNames] = useState(cached?.courtNames || []);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await courtLogic.list();
      const list = Array.isArray(data) ? data : [];
      cached = { courts: list, courtNames: list.map((c) => c.name) };
      setCourts(list);
      setCourtNames(list.map((c) => c.name));
    } catch {
      setCourts([]);
      setCourtNames([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (!cached) refresh(); }, [refresh]);

  return { courts, courtNames, loading, refresh };
}

export default useCourts;
