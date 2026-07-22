import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { caseLogic } from '@/logic/caseLogic.js';

const AppDataContext = createContext(null);

const PAGE_SIZE = 50;

export function AppDataProvider({ children }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [initialised, setInitialised] = useState(false);

  const loadCases = useCallback(async (pageNum = 0, append = false) => {
    setLoading(true);
    try {
      const result = await caseLogic.list({ limit: PAGE_SIZE, offset: pageNum * PAGE_SIZE });
      const rows = Array.isArray(result) ? result : (result?.data || []);
      const count = result?.total ?? rows.length;
      setCases(prev => append ? [...prev, ...rows] : rows);
      setTotal(count);
      setHasMore((pageNum + 1) * PAGE_SIZE < count);
      setPage(pageNum);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialised) {
      setInitialised(true);
      loadCases(0, false);
    }
  }, [initialised, loadCases]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) loadCases(page + 1, true);
  }, [loading, hasMore, page, loadCases]);

  const refreshCases = useCallback(() => loadCases(0, false), [loadCases]);

  return (
    <AppDataContext.Provider value={{
      cases,
      loading,
      hasMore,
      total,
      loadCases: () => loadCases(0, false),
      loadMore,
      refreshCases,
      ready: !loading,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  return useContext(AppDataContext) || {
    cases: [], loading: false, hasMore: false, total: 0,
    loadCases: () => {}, loadMore: () => {}, refreshCases: () => {}, ready: false,
  };
}

export default AppDataContext;
