import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { BackupManager } from '@/logic/BackupManager.js';

// AppLayout — the shell. Holds sidebar collapse/mobile state and renders the
// active page via <Outlet/>. Contains zero business logic.
export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Best-effort scheduled-backup catch-up once per authenticated session load.
  useEffect(() => { BackupManager.runDue(null).catch(() => {}); }, []);

  const toggle = () => {
    if (window.innerWidth <= 860) setMobileOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} />
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,31,61,0.4)', zIndex: 35 }}
        />
      )}
      <div className={`app-main ${collapsed ? 'collapsed' : ''}`}>
        <Topbar onToggle={toggle} />
        <main className="page-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
