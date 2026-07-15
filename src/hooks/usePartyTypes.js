import { useMemo } from 'react';
import { partyTypeLogic } from '@/logic/partyTypeLogic.js';
import { useQuery } from '@/data-layer/queryCache.js';

export function usePartyTypes() {
  const { data, loading, refresh } = useQuery('party_types', () => partyTypeLogic.list());
  const partyTypes = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  return { partyTypes, loading, refresh };
}

export default usePartyTypes;
