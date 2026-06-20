import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import SetupWizard from '@/app/pages/SetupWizard.jsx';
import Spinner from './Spinner.jsx';
import { databaseManagerLogic } from '@/logic/databaseManagerLogic.js';
import { userService } from '@/services/userService.js';

export default function SetupGate({ children }) {
  const [state, setState] = useState('checking');
  const [detectError, setDetectError] = useState('');
  const location = useLocation();

  const check = async () => {
    try {
      const res = await databaseManagerLogic.detect();
      if (res.data?.authError) {
        setDetectError(`Auth error: ${res.data.authError}. Check the provider API key and ensure it has access to the project.`);
      }
      if (!res.ok || res.data.needsSetup) {
        setState('setup');
        return;
      }
      const users = await userService.list().catch(() => []);
      if (!users || users.length === 0) {
        setState('bootstrap');
        return;
      }
      setState('ready');
    } catch (e) {
      console.warn('[LexAI SetupGate] detect threw:', e);
      setDetectError(`Detection error: ${e.message}. Check browser console for details.`);
      setState('setup');
    }
  };

  useEffect(() => { check(); }, [location.pathname]);

  if (state === 'checking') return <div className="auth-shell"><Spinner /></div>;
  if (state === 'setup') return <SetupWizard detectError={detectError} />;
  if (state === 'bootstrap') {
    if (location.pathname === '/bootstrap-admin') {
      // Already at the target — render children so the route matches
      return children;
    }
    return <Navigate to="/bootstrap-admin" replace />;
  }
  return children;
}
