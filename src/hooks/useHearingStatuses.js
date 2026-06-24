import { useEffect, useState, useCallback } from 'react';
import { hearingStatusLogic } from '@/logic/hearingStatusLogic.js';

let cached = null;

export function useHearingStatuses() {
  const [statuses, setStatuses] = useState(cached?.statuses || []);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hearingStatusLogic.list();
      const names = (Array.isArray(data) ? data : []).map((s) => s.name);
      cached = { statuses: names, raw: data };
      setStatuses(names);
    } catch { setStatuses([]); }
    setLoading(false);
  }, []);

  useEffect(() => { if (!cached) refresh(); }, [refresh]);

  return { statuses, loading, refresh };
}

export default useHearingStatuses;
