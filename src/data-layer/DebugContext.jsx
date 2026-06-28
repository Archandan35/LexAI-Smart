import { settingsLogic } from '@/logic/settingsLogic.js';

const DebugContext = createContext(null);

export function DebugProvider({ children }) {
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await settingsLogic.loadSettings();
      if (res.ok && res.data?.devTools === true) {
        setDebugMode(true);
      }
    })();
  }, []);

  const toggleDebug = useCallback(async (v) => {
    setDebugMode(v);
    const res = await settingsLogic.loadSettings();
    const s = res.ok && res.data ? { ...res.data } : {};
    s.devTools = v;
    await settingsLogic.saveSettings(s);
  }, []);

  return (
    <DebugContext.Provider value={{ debugMode, toggleDebug }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  return useContext(DebugContext) || { debugMode: false, toggleDebug: () => {} };
}

export default DebugContext;
