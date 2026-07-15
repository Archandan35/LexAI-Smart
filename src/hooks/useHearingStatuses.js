import { useMemo } from 'react';
import { hearingStatusLogic } from '@/logic/hearingStatusLogic.js';
import { useQuery } from '@/data-layer/queryCache.js';

export function useHearingStatuses() {
  const { data, loading, refresh } = useQuery('hearing_statuses', () => hearingStatusLogic.list());
  const statuses = useMemo(() => (Array.isArray(data) ? data : []).map((s) => s.name), [data]);

  return { statuses, loading, refresh };
}

export default useHearingStatuses;
