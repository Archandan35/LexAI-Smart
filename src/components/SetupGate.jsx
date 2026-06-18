import React, { useEffect, useState } from 'react';
import DatabaseSetup from '@/app/pages/DatabaseSetup.jsx';
import Spinner from './Spinner.jsx';
import { databaseManagerLogic } from '@/logic/databaseManagerLogic.js';
import { userService } from '@/services/userService.js';

// SetupGate — first-run detection. Sits ABOVE auth so a fresh remote backend
// (with no admin user yet) can still install. Fail-open: any detection error
// falls through to the app so existing local installs are never blocked.
export default function SetupGate({ children }) {
  const [state, setState] = useState('checking'); // checking | setup | bootstrap | ready

  const check = async () => {
    try {
      const res = await databaseManagerLogic.detect();
      if (res.ok && res.value.needsSetup) {
        setState('setup');
        return;
      }
      // Schema is installed — check if any users exist
      const users = await userService.list();
      if (!users || users.length === 0) {
        setState('bootstrap');
        return;
      }
      setState('ready');
    } catch {
      setState('ready');
    }
  };

  useEffect(() => { check(); }, []);

  if (state === 'checking') return <div className="auth-shell"><Spinner /></div>;
  if (state === 'setup') return <DatabaseSetup />;
  if (state === 'bootstrap') {
    window.location.href = '/bootstrap-admin';
    return null;
  }
  return children;
}
