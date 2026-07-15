import { useMemo } from 'react';
import { contactTypeLogic } from '@/logic/contactTypeLogic.js';
import { useQuery } from '@/data-layer/queryCache.js';

export function useContactTypes() {
  const { data, loading, refresh } = useQuery('contact_types', () => contactTypeLogic.list());
  const types = useMemo(() => (Array.isArray(data) ? data : []).map((t) => t.name), [data]);

  return { types, loading, refresh };
}

export default useContactTypes;
