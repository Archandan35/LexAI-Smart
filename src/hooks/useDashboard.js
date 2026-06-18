import { useEffect, useState } from 'react';
import { caseLogic } from '@/logic/caseLogic.js';

export function useDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      const res = await caseLogic.dashboard();
      if (on) { setData(res.ok ? res.data : null); setLoading(false); }
    })();
    return () => { on = false; };
  }, []);

  return { data, loading };
}

export default useDashboard;
