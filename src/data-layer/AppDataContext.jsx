import { caseLogic } from '@/logic/caseLogic.js';

// AppDataContext — shares the case list app-wide so dropdowns (order sheet, case
// manager, drafting) stay in sync without each page re-fetching. Still routes
// exclusively through the logic layer.
const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [cases, setCases] = useState([]);
  const [ready, setReady] = useState(false);

  const refreshCases = useCallback(async () => {
    const rows = await caseLogic.list();
    setCases(rows);
    setReady(true);
  }, []);

  useEffect(() => { refreshCases(); }, [refreshCases]);

  return (
    <AppDataContext.Provider value={{ cases, ready, refreshCases }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  return useContext(AppDataContext) || { cases: [], ready: false, refreshCases: () => {} };
}

export default AppDataContext;
