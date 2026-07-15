import { useMemo } from 'react';
import { courtsLogic } from '@/logic/courtsLogic.js';
import { useQuery } from '@/data-layer/queryCache.js';

export function useCourts() {
  const { data, loading, refresh } = useQuery('courts', () => courtsLogic.list());
  const courts = useMemo(
    () => (Array.isArray(data) ? data : []).filter((h) => h.status !== 'Inactive').map((h) => h.name),
    [data]
  );

  return { courts, loading, refresh };
}

export default useCourts;
