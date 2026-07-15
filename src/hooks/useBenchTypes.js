import { useMemo } from 'react';
import { benchTypeLogic } from '@/logic/benchTypeLogic.js';
import { useQuery } from '@/data-layer/queryCache.js';

export function useBenchTypes() {
  const { data, loading, refresh } = useQuery('bench_types', () => benchTypeLogic.list());
  const benchTypes = useMemo(
    () => (Array.isArray(data) ? data : []).filter((b) => b.status !== 'Inactive').map((b) => b.name),
    [data]
  );

  return { benchTypes, loading, refresh };
}

export default useBenchTypes;
