import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './app/App.jsx';
import './styles/index.css';

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
