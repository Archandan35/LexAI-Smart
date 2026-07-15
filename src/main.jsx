import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './app/App.jsx';
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

const CHUNK_RELOAD_FLAG = 'lexai:chunk-reloaded';

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  let alreadyReloaded = false;
  try {
    alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_FLAG) === '1';
    sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
  } catch {
    // ignore storage errors
  }
  if (!alreadyReloaded) window.location.reload();
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
