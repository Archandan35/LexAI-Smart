import { useEffect, useState, useCallback } from 'react';
import { judgeLogic } from '@/logic/judgeLogic.js';

let cached = null;

export function useJudges() {
  const [judges, setJudges] = useState(cached?.judges || []);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await judgeLogic.list();
      const names = (Array.isArray(data) ? data : []).filter((j) => j.status !== 'Inactive').map((j) => j.name);
      cached = { judges: names, raw: data };
      setJudges(names);
    } catch { setJudges([]); }
    setLoading(false);
  }, []);

  useEffect(() => { if (!cached) refresh(); }, [refresh]);

  return { judges, loading, refresh };
}

export default useJudges;
