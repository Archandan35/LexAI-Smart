import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './app/App.jsx';
import { recoverFromChunkError } from './utils/lazyWithRetry.js';
import { reportWebVitals } from './utils/webVitals.js';
import { monitoringService } from './services/monitoringService.js';
import MonitoringDashboard from './components/MonitoringDashboard.jsx';
import './styles/index.css';

function preconnectBackend(origin) {
  if (!origin || typeof document === 'undefined') return;
  if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.crossOrigin = 'anonymous';
  link.href = origin;
  document.head.appendChild(link);
}

const env = import.meta.env || {};
for (const key of ['VITE_SUPABASE_URL', 'VITE_MONGO_DATA_API_URL', 'VITE_BACKEND_URL']) {
  const value = env[key];
  if (value) {
    try { preconnectBackend(new URL(value).origin); } catch { /* ignore malformed url */ }
  }
}
if (env.VITE_FIREBASE_PROJECT_ID) preconnectBackend('https://firestore.googleapis.com');

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  recoverFromChunkError();
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function DashboardGate() {
  const [monitorOpen, setMonitorOpen] = React.useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('monitor') === 'true') setMonitorOpen(true);
  }, []);
  return <MonitoringDashboard open={monitorOpen} onClose={() => setMonitorOpen(false)} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <App />
      <DashboardGate />
    </BrowserRouter>
  </React.StrictMode>
);

// Register service worker for offline support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Start Web Vitals tracking after boot
setTimeout(() => reportWebVitals(), 2000);

// Initialize monitoring in all environments (errors, navigation, vitals, long tasks, memory, etc.)
try {
  monitoringService.init();
} catch (e) {
  console.error('[Monitoring] init failed', e);
}

// Signal a successful boot so the index.html watchdog stands down, and strip the
// cache-bust marker from the URL once we're running the fresh build.
window.__appMounted = true;
if (window.__lexWatchdog) {
  clearTimeout(window.__lexWatchdog);
  window.__lexWatchdog = null;
}
try {
  const url = new URL(window.location.href);
  if (url.searchParams.has('_cr')) {
    url.searchParams.delete('_cr');
    window.history.replaceState(window.history.state, '', url.toString());
  }
} catch { /* ignore */ }
