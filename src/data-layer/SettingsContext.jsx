import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsLogic } from '@/logic/settingsLogic.js';

const DEFAULTS = {
  siteTitle: 'LexAI',
  tagline: 'Indian Litigation Assistant',
  mainUrl: '',
  portalUrl: '',
  adminEmail: '',
  allowRegistration: true,
  defaultRole: 'Client',
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
      if (res.ok && res.data && Object.keys(res.data).length > 0) {
        setSettings({ ...DEFAULTS, ...res.data });
      } else {
        setSettings({ ...DEFAULTS });
      }
    } catch (err) {
      setError(err.message);
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
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

export { DEFAULTS as SETTINGS_DEFAULTS };
export default SettingsContext;
