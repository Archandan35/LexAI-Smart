import { useMemo } from 'react';
import { actLogic } from '@/logic/actLogic.js';
import { useQuery } from '@/data-layer/queryCache.js';

export function useActs() {
  const { data, loading, refresh } = useQuery('acts', () => actLogic.list());
  const acts = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  return { acts, loading, refresh };
}

export default useActs;
