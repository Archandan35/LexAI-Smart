import { useMemo } from 'react';
import { jurisdictionLogic } from '@/logic/jurisdictionLogic.js';
import { useQuery } from '@/data-layer/queryCache.js';

export function useJurisdictions() {
  const { data, loading, refresh } = useQuery('jurisdictions', () => jurisdictionLogic.list());
  const jurisdictions = useMemo(
    () => (Array.isArray(data) ? data : []).filter((j) => j.status !== 'Inactive').map((j) => j.name),
    [data]
  );

  return { jurisdictions, loading, refresh };
}

export default useJurisdictions;
