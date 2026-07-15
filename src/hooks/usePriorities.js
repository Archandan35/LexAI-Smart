import { useMemo } from 'react';
import { priorityLogic } from '@/logic/priorityLogic.js';
import { useQuery } from '@/data-layer/queryCache.js';

export function usePriorities() {
  const { data, loading, refresh } = useQuery('priorities', () => priorityLogic.list());
  const priorities = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  return { priorities, loading, refresh };
}

export default usePriorities;
