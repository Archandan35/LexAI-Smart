import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import Bottombar from './Bottombar.jsx';
import { keepAliveService } from '@/services/keepAliveService.js';
import { useDebug } from '@/data-layer/DebugContext.jsx';
import { useSettings } from '@/data-layer/SettingsContext.jsx';
import { FabActionProvider } from '@/data-layer/FABContext.jsx';
import MonitoringDashboard from '@/components/MonitoringDashboard.jsx';


// AppLayout — the shell. Holds sidebar collapse/mobile state and renders the
// active page via <Outlet/>. Contains zero business logic.
export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const { debugMode } = useDebug();
  const { settings } = useSettings();
  const location = useLocation();

  // Auto-close the mobile sidebar whenever the route changes so the newly
  // opened page is immediately visible (desktop is unaffected — it uses
  // `collapsed`, not `mobileOpen`).
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Best-effort scheduled-backup catch-up once per authenticated session load.
  useEffect(() => {
    import('@/logic/BackupManager.js').then(({ BackupManager }) => {
      BackupManager.runDue(null).catch(() => {});
    });
  }, []);

  // Lightweight keep-alive ping to prevent Supabase project from becoming inactive.
  useEffect(() => { keepAliveService.start(); return () => keepAliveService.stop(); }, []);

  const toggle = () => {
    if (window.innerWidth <= 860) setMobileOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  return (
    <FabActionProvider>
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
          <main id="main-content" className="page-area">
            <Outlet />
          </main>
          <footer className="app-footer">
            {settings.adminEmail && <span>{settings.adminEmail}</span>}
            {settings.mainUrl && <span> · <a href={settings.mainUrl} target="_blank" rel="noopener noreferrer" className="app-footer__link">{settings.mainUrl}</a></span>}
            {(debugMode || new URLSearchParams(window.location.search).get('monitor') === 'true') && (
              <>
                <span> · </span>
                <button className="monitor-toggle-btn" onClick={() => setMonitorOpen((o) => !o)}>
                  {monitorOpen ? 'Close' : 'Performance'}
                </button>
              </>
            )}
          </footer>
          <MonitoringDashboard open={monitorOpen} onClose={() => setMonitorOpen(false)} />
        </div>
      </div>
      <Bottombar />
    </FabActionProvider>
  );
}

