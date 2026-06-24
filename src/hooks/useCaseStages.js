import { useEffect, useState, useCallback } from 'react';
import { caseStageLogic } from '@/logic/caseStageLogic.js';

// useCaseStages — dynamic stage list, kept in sync across forms.
export function useCaseStages() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await caseStageLogic.list();
      setStages(Array.isArray(data) ? data : []);
    } catch {
      setStages([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { stages, names: stages.map((s) => s.name), loading, refresh };
}

export default useCaseStages;
