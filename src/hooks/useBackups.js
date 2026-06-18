import { useState, useCallback, useEffect } from 'react';
import { backupLogic } from '@/logic/backupLogic.js';

export function useBackups() {
  const [backups, setBackups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setBackups(backupLogic.list());
    setStats(backupLogic.stats());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { backups, stats, loading, refresh };
}

export default useBackups;
