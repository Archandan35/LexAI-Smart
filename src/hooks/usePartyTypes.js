import { useEffect, useState, useCallback } from 'react';
import { partyTypeLogic } from '@/logic/partyTypeLogic.js';

let cached = null;

export function usePartyTypes() {
  const [partyTypes, setPartyTypes] = useState(cached?.partyTypes || []);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await partyTypeLogic.list();
      const list = Array.isArray(data) ? data : [];
      cached = { partyTypes: list };
      setPartyTypes(list);
    } catch {
      setPartyTypes([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (!cached) refresh(); }, [refresh]);

  return { partyTypes, loading, refresh };
}

export default usePartyTypes;
