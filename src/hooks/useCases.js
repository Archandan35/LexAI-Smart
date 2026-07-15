import { useCallback } from 'react';
import { caseLogic } from '@/logic/caseLogic.js';
import { useQuery, invalidateQuery } from '@/data-layer/queryCache.js';

export const CASES_KEY = 'cases';

// useCases — list + mutate cases via the logic layer, cached app-wide.
export function useCases() {
  const { data, loading, refresh } = useQuery(CASES_KEY, () => caseLogic.list());
  const cases = data || [];

  const create = useCallback(async (payload) => { await caseLogic.create(payload); await invalidateQuery(CASES_KEY); }, []);
  const update = useCallback(async (id, patch) => { await caseLogic.update(id, patch); await invalidateQuery(CASES_KEY); }, []);
  const remove = useCallback(async (id) => { await caseLogic.remove(id); await invalidateQuery(CASES_KEY); }, []);

  return { cases, loading, refresh, create, update, remove };
}

export default useCases;
