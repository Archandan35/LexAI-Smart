import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AdminSetup from '@/app/pages/AdminSetup.jsx';
import Spinner from './Spinner.jsx';
import { databaseManagerLogic } from '@/logic/databaseManagerLogic.js';
import { databaseAdminService } from '@/services/databaseAdminService.js';
import { userService } from '@/services/userService.js';

const CACHE_KEY = 'lexai_setup_state';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Cache is valid for 10 minutes so refreshes stay instant but setup
    // changes are still picked up within a reasonable window.
    if (Date.now() - (parsed.t || 0) > 10 * 60 * 1000) return null;
    return parsed.state;
  } catch {
    return null;
  }
}

function writeCache(state) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ state, t: Date.now() }));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export default function SetupGate({ children }) {
  // Render the app immediately using the cached answer (if any) instead of
  // blocking behind a spinner while we phone the backend. On the very first
  // visit (no cache) we still render the app right away and run the check in
  // the background — exactly like UGC NET shows its page before its own
  // behind-the-scenes work finishes.
  const cached = readCache();
  const [state, setState] = useState(cached || 'checking');
  const [detectError, setDetectError] = useState('');
  const location = useLocation();
  const checked = useRef(false);

  const runCheck = useCallback(async () => {
    try {
      const res = await databaseManagerLogic.detect();
      if (res.data?.authError) {
        setDetectError(`Auth error: ${res.data.authError}. Check the provider API key and ensure it has access to the project.`);
      }
      // If detection was blocked/throttled, we cannot conclude the DB is
      // uninstalled — don't force the user into a misleading setup screen.
      if (res.data?.blocked) {
        setDetectError(
          (res.data.error || 'Database requests are being blocked or throttled. Cannot verify setup right now — the app may still work. Check your Supabase egress/rate limits.') +
          ' If you just updated the Supabase keys, hard-refresh (Ctrl+Shift+R) or redeploy — the running bundle may be stale.'
        );
        const next = 'ready';
        setState(next);
        writeCache(next);
        return;
      }
      const users = await userService.list().catch(() => []);
      const next = !users || users.length === 0 || !res.ok ? 'setup' : 'ready';
      setState(next);
      writeCache(next);
    } catch (e) {
      const next = 'setup';
      setState(next);
      writeCache(next);
    }
  }, []);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    // Non-blocking: the app is already on screen; this just refines state.
    runCheck();
  }, [runCheck]);

  useEffect(() => {
    if (state === 'ready') databaseAdminService.grantAllCollections();
  }, [state]);

  // Only the un-configured instance shows the setup screen. The common,
  // already-set-up case renders the real app instantly with no spinner.
  if (state === 'setup') return <AdminSetup />;
  if (state === 'bootstrap') {
    if (location.pathname === '/admin/setup') return children;
    return <Navigate to="/admin/setup" replace />;
  }
  return (
    <>
      {detectError && (
        <div className="wizard-alert-box wizard-alert-box--amber wizard-alert-box--mb" role="alert">
          {detectError}
        </div>
      )}
      {children}
    </>
  );
}

