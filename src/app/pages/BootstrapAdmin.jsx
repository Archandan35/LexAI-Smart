import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authLogic } from '@/logic/authLogic.js';
import { userService } from '@/services/userService.js';
import { roleService } from '@/services/roleService.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import Spinner from '@/components/Spinner.jsx';
import PasswordInput from '@/components/PasswordInput.jsx';
import { Field, Input } from '@/components/Field.jsx';
import DebugPanel, { useLogCapture } from '@/components/DebugPanel.jsx';

const TIMEOUT_MS = 10000;

export default function BootstrapAdmin() {
  const { logs, clearLogs, copyLogs } = useLogCapture();
  const { refreshUser } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timedOut, setTimedOut] = useState(false);
  const [status, setStatus] = useState('Loading...');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const mountedRef = useRef(true);
  const timedOutRef = useRef(false);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const initialize = useCallback(async () => {
    console.log('[Bootstrap] mount');
    setStatus('Loading...');
    setTimedOut(false);
    setLoading(true);

    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      timedOutRef.current = true;
      console.warn('[Bootstrap] TIMEOUT — 10s elapsed');
      setTimedOut(true);
      setError('Request timed out. Check that the database provider is reachable and API credentials are correct.');
    }, TIMEOUT_MS);

    try {
      console.log('[Bootstrap] initialize start');

      console.log('[Bootstrap] loading users');
      const users = await userService.list();
      console.log('[Bootstrap] users count:', users.length);

      if (users.length > 0) {
        console.log('[Bootstrap] users exist — redirecting');
        clearTimeout(timer);
        if (mountedRef.current) setLoading(false);
        const session = await authLogic.restore();
        nav(session?.ok && session.data ? '/' : '/login', { replace: true });
        return;
      }

      console.log('[Bootstrap] loading roles');
      const roles = await roleService.list();
      console.log('[Bootstrap] roles count:', roles.length);

      if (!roles || roles.length === 0) {
        console.warn('[Bootstrap] NO ROLES FOUND');
        setError('No roles found. Installation incomplete. Run "Complete Installation" in the Setup Wizard.');
        clearTimeout(timer);
        if (mountedRef.current) setLoading(false);
        return;
      }

      console.log('[Bootstrap] checking Admin role');
      const hasSuperAdmin = roles.some((r) => r.code === 'Admin');
      console.log('[Bootstrap] Admin role found:', hasSuperAdmin);

      if (!hasSuperAdmin) {
        console.warn('[Bootstrap] Admin role missing');
        setError('Admin role not found. Installation incomplete. Run "Complete Installation" in the Setup Wizard.');
        clearTimeout(timer);
        if (mountedRef.current) setLoading(false);
        return;
      }

      console.log('[Bootstrap] rendering form');
    } catch (e) {
      console.error('[Bootstrap] initialize error:', e);
      if (!timedOutRef.current) setError(e.message || 'Failed to initialize.');
    } finally {
      clearTimeout(timer);
      if (mountedRef.current) setLoading(false);
    }
  }, [nav]);

  useEffect(() => { initialize(); }, [initialize]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Name is required.');
    if (!email.trim()) return setError('Email is required.');
    if (!password) return setError('Password is required.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setBusy(true);
    let res;
    try {
      res = await authLogic.bootstrapAdmin({
        name: name.trim(),
        email: email.trim(),
        password,
      });
    } catch (e) {
      setBusy(false);
      setError(e.message || 'Failed to bootstrap super admin.');
      return;
    }
    setBusy(false);

    if (res.ok) {
      if (res.data?.emailConfirmationRequired) {
        console.log('[Bootstrap] email confirmation required');
        setSetupComplete(true);
        setError('');
        return;
      }
      console.log('[Bootstrap] redirect login');
      await refreshUser();
      nav('/', { replace: true });
    } else {
      setError(res.error || 'Failed to bootstrap super admin.');
    }
  };

  // Loading state with timeout
  if (loading) {
    return (
      <div className="auth-shell">
        <div className="auth-card fade-in">
          <div className="auth-brand">
            <div className="sidebar__logo">&#x2696;</div>
            <div>
              <div className="auth-brand-title">Lex<span>AI</span></div>
              <div className="sidebar__sub">Indian Litigation Assistant</div>
            </div>
          </div>
          <h1 className="auth-title">Preparing Setup</h1>
          <p className="auth-sub">{timedOut ? status : 'Verifying database state...'}</p>
          {!timedOut && <Spinner />}
          {timedOut && (
            <div className="alert alert--warn dm-mt">
              <Icon name="alert" size={16} />
              <span>{error}</span>
            </div>
          )}
          {timedOut && (
            <div className="dm-toolbar-mt">
              <Button variant="primary" className="btn--block" icon="refresh" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Email confirmation required screen
  if (setupComplete) {
    return (
      <div className="auth-shell">
        <div className="auth-card fade-in">
          <div className="auth-brand">
            <div className="sidebar__logo">&#x2696;</div>
            <div>
              <div className="auth-brand-title">Lex<span>AI</span></div>
              <div className="sidebar__sub">Indian Litigation Assistant</div>
            </div>
          </div>
          <div className="auth-confirm">
            <div className="auth-confirm__icon">&#x2709;</div>
            <h1 className="auth-title">Account Created</h1>
            <p className="auth-sub">
              Account created successfully. Please confirm your email before logging in.
            </p>
            <p className="auth-sub" style={{ marginTop: 8 }}>
              Check <strong>{email}</strong> for a confirmation link from your auth provider.
            </p>
            <div className="dm-toolbar-mt">
              <Button variant="primary" className="btn--block" onClick={() => nav('/login', { replace: true })}>
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card fade-in">
        <div className="auth-brand">
          <div className="sidebar__logo">&#x2696;</div>
          <div>
            <div className="auth-brand-title">Lex<span>AI</span></div>
            <div className="sidebar__sub">Indian Litigation Assistant</div>
          </div>
        </div>

        <h1 className="auth-title">Bootstrap System</h1>
        <p className="auth-sub">Create the first Administrator account to begin setup.</p>

        {error && (
          <div className="alert alert--danger alert--mb">
            <Icon name="alert" size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Field label="Full Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. System Administrator"
              autoFocus
              required
            />
          </Field>
          <Field label="Email Address">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@company.com"
              required
            />
          </Field>
          <Field label="Password">
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </Field>
          <Field label="Confirm Password">
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
            />
          </Field>
          <Button
            type="submit"
            variant="primary"
            className="btn--block"
            loading={busy}
            icon="shield"
          >
            Create Admin
          </Button>
        </form>

        <div className="auth-note">
          Once created, this account will have full access. Keep these credentials secure.
        </div>
        <DebugPanel logs={logs} error={error} onClear={clearLogs} onCopy={copyLogs} />
      </div>
    </div>
  );
}
