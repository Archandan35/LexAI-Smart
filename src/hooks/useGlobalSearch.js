import { useState, useEffect, useRef, useCallback } from 'react';
import { searchLogic } from '@/logic/searchLogic.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';

// useGlobalSearch — debounced cross-collection search, permission-aware.
export function useGlobalSearch() {
  const { can } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) { setResults([]); setLoading(false); return undefined; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const hits = await searchLogic.search(query, { can });
      setResults(hits);
      setLoading(false);
    }, 180);
    return () => timer.current && clearTimeout(timer.current);
  }, [query, can]);

  const reset = useCallback(() => { setQuery(''); setResults([]); }, []);
  return { query, setQuery, results, loading, reset };
}

export default useGlobalSearch;
