import { useMemo } from 'react';
import { caseStageLogic } from '@/logic/caseStageLogic.js';
import { useQuery } from '@/data-layer/queryCache.js';

// useCaseStages — dynamic stage list, kept in sync across forms.
export function useCaseStages() {
  const { data, loading, refresh } = useQuery('case_stages', () => caseStageLogic.list());
  const stages = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const names = useMemo(() => stages.map((s) => s.name), [stages]);

  return { stages, names, loading, refresh };
}

export default useCaseStages;
