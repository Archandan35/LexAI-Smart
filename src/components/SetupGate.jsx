import React, { useEffect, useState } from 'react';
import DatabaseSetup from '@/app/pages/DatabaseSetup.jsx';
import Spinner from './Spinner.jsx';
import { databaseManagerLogic } from '@/logic/databaseManagerLogic.js';

// SetupGate — first-run detection. Sits ABOVE auth so a fresh remote backend
// (with no admin user yet) can still install. Fail-open: any detection error
// falls through to the app so existing local installs are never blocked.
export default function SetupGate({ children }) {
  const [state, setState] = useState('checking'); // checking | setup | ready

  const check = async () => {
    try {
      const res = await databaseManagerLogic.detect();
      setState(res.ok && res.value.needsSetup ? 'setup' : 'ready');
    } catch {
      setState('ready');
    }
  };

  useEffect(() => { check(); }, []);

  if (state === 'checking') return <div className="auth-shell"><Spinner /></div>;
  if (state === 'setup') return <DatabaseSetup onComplete={() => setState('ready')} />;
  return children;
}
