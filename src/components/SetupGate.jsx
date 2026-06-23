import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import SetupWizard from '@/app/pages/SetupWizard.jsx';
import Spinner from './Spinner.jsx';
import { databaseManagerLogic } from '@/logic/databaseManagerLogic.js';
import { userService } from '@/services/userService.js';
import { getDatabaseProvider } from '@/providers/database/index.js';
import { listSchemas } from '@/data-provider/schema/index.js';

async function preGrantAllCollections() {
  const db = getDatabaseProvider();
  if (typeof db.execSql !== 'function') return;
  const tables = [...new Set(listSchemas().map((s) => s.collection).filter(Boolean))];
  tables.push('_sequences');
  const sql = tables.map((t) => `
    alter table if exists "${t}" enable row level security;
    drop policy if exists "${t}_anon_all" on "${t}";
    create policy "${t}_anon_all" on "${t}" for all to anon using (true) with check (true);
    grant insert, select, update, delete on table "${t}" to anon;
  `).join('\n');
  console.log('[PreGrant] applying RLS policies for', tables.length, 'tables');
  const res = await db.execSql(sql).catch(() => ({ ok: false }));
  console.log('[PreGrant] result:', res);
}

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

  useEffect(() => { check(); }, []);
  useEffect(() => { if (state === 'ready') preGrantAllCollections(); }, [state]);

  if (state === 'checking') return <div className="auth-shell"><Spinner /></div>;
  if (state === 'setup') return <SetupWizard detectError={detectError} />;
  if (state === 'bootstrap') {
    if (location.pathname === '/bootstrap-admin') {
      return children;
    }
    return <Navigate to="/bootstrap-admin" replace />;
  }
  return children;
}
