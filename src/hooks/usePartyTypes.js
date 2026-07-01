import { useEffect, useState, useCallback } from 'react';
import { partyTypeLogic } from '@/logic/partyTypeLogic.js';

export function usePartyTypes() {
  const [partyTypes, setPartyTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await partyTypeLogic.list();
      const list = Array.isArray(data) ? data : [];
      setPartyTypes(list);
    } catch {
      // list failed — keep existing data instead of clearing
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { partyTypes, loading, refresh };
}

export default usePartyTypes;
