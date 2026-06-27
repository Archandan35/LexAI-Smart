import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import Bottombar from './Bottombar.jsx';
import { BackupManager } from '@/logic/BackupManager.js';
import { useDebug } from '@/data-layer/DebugContext.jsx';
import { useSettings } from '@/data-layer/SettingsContext.jsx';
import DebugOverlay from '@/components/DebugOverlay.jsx';

// AppLayout — the shell. Holds sidebar collapse/mobile state and renders the
// active page via <Outlet/>. Contains zero business logic.
export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { debugMode } = useDebug();
  const { settings } = useSettings();

  // Best-effort scheduled-backup catch-up once per authenticated session load.
  useEffect(() => { BackupManager.runDue(null).catch(() => {}); }, []);

  const toggle = () => {
    if (window.innerWidth <= 860) setMobileOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  return (
    <>
      <div className="app-shell">
        <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} />
        {mobileOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <div className={`app-main ${collapsed ? 'collapsed' : ''}`}>
          <Topbar onToggle={toggle} />
          <main className="page-area">
            <Outlet />
          </main>
          <footer className="app-footer">
            <span>{settings.siteTitle}</span>
            {settings.adminEmail && <span> · {settings.adminEmail}</span>}
            {settings.mainUrl && <span> · {settings.mainUrl}</span>}
          </footer>
        </div>
        {debugMode && <DebugOverlay />}
      </div>
      <Bottombar />
    </>
  );
}
