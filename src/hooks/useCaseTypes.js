import { useEffect, useState, useCallback } from 'react';
import { caseTypeLogic } from '@/logic/caseTypeLogic.js';

let cached = null;

export function useCaseTypes() {
  const [caseTypes, setCaseTypes] = useState(cached?.caseTypes || []);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await caseTypeLogic.list();
      const list = Array.isArray(data) ? data : [];
      cached = { caseTypes: list };
      setCaseTypes(list);
    } catch {
      setCaseTypes([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (!cached) refresh(); }, [refresh]);

  return { caseTypes, loading, refresh };
}

export default useCaseTypes;
