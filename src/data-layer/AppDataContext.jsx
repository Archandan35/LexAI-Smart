import { createContext, useContext } from 'react';
import { caseLogic } from '@/logic/caseLogic.js';
import { useQuery } from '@/data-layer/queryCache.js';
import { CASES_KEY } from '@/hooks/useCases.js';

// AppDataContext — shares the case list app-wide so dropdowns (order sheet, case
// manager, drafting) stay in sync without each page re-fetching. Backed by the
// shared query cache, so it reuses the same `cases` request as useCases instead
// of firing a second identical fetch. Still routes through the logic layer.
const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const { data, loading, refresh } = useQuery(CASES_KEY, () => caseLogic.list());

  return (
    <AppDataContext.Provider value={{ cases: data || [], ready: !loading, refreshCases: refresh }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  return useContext(AppDataContext) || { cases: [], ready: false, refreshCases: () => { } };
}

export default AppDataContext;
