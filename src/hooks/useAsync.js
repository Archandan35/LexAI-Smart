import { useState, useCallback, useEffect, useRef } from 'react';

// useAsync — run an async logic call, tracking loading/error/data. Pages use
// this to talk to the LOGIC layer without embedding any provider concerns.
export function useAsync(fn, { immediate = false, args = [] } = {}) {
  const [state, setState] = useState({ loading: immediate, error: null, data: null });
  const mounted = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => () => { mounted.current = false; }, []);

  const run = useCallback(async (...callArgs) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await fnRef.current(...callArgs);
      // Support both raw values and Result-wrapped ({ok,data,error}).
      if (result && typeof result === 'object' && 'ok' in result) {
        if (!result.ok) {
          if (mounted.current) setState({ loading: false, error: result.error, data: null });
          return result;
        }
        if (mounted.current) setState({ loading: false, error: null, data: result.data });
        return result;
      }
      if (mounted.current) setState({ loading: false, error: null, data: result });
      return result;
    } catch (e) {
      if (mounted.current) setState({ loading: false, error: e.message || 'Error', data: null });
      return { ok: false, error: e.message };
    }
  }, []);

  useEffect(() => {
    if (immediate) run(...args);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, run, setData: (data) => setState((s) => ({ ...s, data })) };
}

export default useAsync;
