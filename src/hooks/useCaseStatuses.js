import { useMemo } from 'react';
import { caseStatusLogic } from '@/logic/caseStatusLogic.js';
import { useQuery } from '@/data-layer/queryCache.js';

export function useCaseStatuses() {
  const { data, loading, refresh } = useQuery('case_statuses', () => caseStatusLogic.list());
  const items = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const statuses = useMemo(() => items.map((s) => s.name), [items]);

  return { statuses, items, loading, refresh };
}

export default useCaseStatuses;
