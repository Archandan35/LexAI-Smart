import { useEffect, useState, useCallback } from 'react';
import { contactTypeLogic } from '@/logic/contactTypeLogic.js';

let cached = null;

export function useContactTypes() {
  const [types, setTypes] = useState(cached?.types || []);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await contactTypeLogic.list();
      const names = (Array.isArray(data) ? data : []).map((t) => t.name);
      cached = { types: names, raw: data };
      setTypes(names);
    } catch { setTypes([]); }
    setLoading(false);
  }, []);

  useEffect(() => { if (!cached) refresh(); }, [refresh]);

  return { types, loading, refresh };
}

export default useContactTypes;
