import { useMemo } from 'react';
import { caseTypeLogic } from '@/logic/caseTypeLogic.js';
import { useQuery } from '@/data-layer/queryCache.js';

export function useCaseTypes() {
  const { data, loading, refresh } = useQuery('case_types', () => caseTypeLogic.list());
  const caseTypes = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  return { caseTypes, loading, refresh };
}

export default useCaseTypes;
