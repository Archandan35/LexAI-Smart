import { caseLogic } from '@/logic/caseLogic.js';
import { useQuery } from '@/data-layer/queryCache.js';

export function useDashboard() {
  const { data, loading, refresh } = useQuery('dashboard', async () => {
    const res = await caseLogic.dashboard();
    return res.ok ? res.data : null;
  });

  return { data: data ?? null, loading, refresh };
}

export default useDashboard;
