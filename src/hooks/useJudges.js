import { useMemo } from 'react';
import { judgeLogic } from '@/logic/judgeLogic.js';
import { useQuery } from '@/data-layer/queryCache.js';

export function useJudges() {
  const { data, loading, refresh } = useQuery('judges', () => judgeLogic.list());
  const judges = useMemo(
    () => (Array.isArray(data) ? data : []).filter((j) => j.status !== 'Inactive').map((j) => j.name),
    [data]
  );

  return { judges, loading, refresh };
}

export default useJudges;
