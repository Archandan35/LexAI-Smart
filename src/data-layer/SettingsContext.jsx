import { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { settingsLogic } from '@/logic/settingsLogic.js';
import { settingsCache } from '@/core/settingsCache.js';


const DEFAULTS = {
  siteTitle: 'LexAI',
  tagline: 'Indian Litigation Assistant',
  logoUrl: '',
  mainUrl: '',
  portalUrl: '',
  adminEmail: '',
  allowRegistration: true,
  defaultRole: '',
  language: 'English (United States)',
  timezone: 'Asia/Kolkata',
  dateFormat: 'june23',
  timeFormat: '12h',
  weekStart: 'Monday',
  customDateFormat: '',
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await settingsLogic.loadSettings();
      const merged = { ...DEFAULTS };
      if (res.ok && res.data && Object.keys(res.data).length > 0) {
        Object.assign(merged, res.data);
      }
      settingsCache.setAll(merged);
      setSettings(merged);
    } catch (err) {
      setError(err.message);
      settingsCache.setAll(DEFAULTS);
      setSettings({ ...DEFAULTS });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SettingsContext.Provider value={{ settings: settings || DEFAULTS, loading, error, refreshSettings: load }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  // Fail-safe: render default settings when provider is missing.
  // This prevents the whole app from hard-crashing during mis-mounting.
  return ctx || { settings: DEFAULTS, loading: false, error: null, refreshSettings: () => Promise.resolve() };
}

export { DEFAULTS as SETTINGS_DEFAULTS };
export default SettingsContext;
