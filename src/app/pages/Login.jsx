import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { userService } from '@/services/userService.js';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import PasswordInput from '@/components/PasswordInput.jsx';
import { Field, Input } from '@/components/Field.jsx';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);

  const from = location.state?.from || '/';

  useEffect(() => {
    let active = true;
    const checkBootstrap = async () => {
      try {
        const list = await userService.list();
        if (active && (!list || list.length === 0)) {
          setNeedsBootstrap(true);
        }
      } catch (err) {
        // ignore
      }
    };
    checkBootstrap();
    return () => { active = false; };
  }, []);

  if (isAuthenticated) { nav(from, { replace: true }); return null; }

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    const res = await login(identifier.trim(), password);
    setBusy(false);
    if (res.ok) nav(from, { replace: true });
    else setError(res.error || 'Sign in failed.');
  };

  return (
    <div className="auth-shell">
      <div className="auth-card fade-in">
        <div className="auth-brand">
          <div className="sidebar__logo">⚖</div>
          <div>
            <div className="auth-brand-title">Lex<span>AI</span></div>
            <div className="sidebar__sub">Indian Litigation Assistant</div>
          </div>
        </div>

        <h1 className="auth-title">Sign in</h1>
        <p className="auth-sub">Access your litigation workspace.</p>

        {needsBootstrap && (
          <div className="alert alert--warn alert--mb">
            <Icon name="alert" size={16} />
            <span>
              No administrator account exists. You must bootstrap the system before you can log in.
              <br />
              <Link to="/bootstrap-admin" style={{ fontWeight: 'bold', textDecoration: 'underline', marginTop: 6, display: 'inline-block' }}>
                Bootstrap First Super Admin →
              </Link>
            </span>
          </div>
        )}

        {error && <div className="alert alert--danger alert--mb"><Icon name="alert" size={16} />{error}</div>}

        <form onSubmit={submit}>
          <Field label="Email or username">
            <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="e.g. admin@company.com" autoFocus />
          </Field>
          <Field label="Password">
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
          </Field>
          <Button type="submit" variant="primary" className="btn--block" loading={busy} icon="shield">Sign in</Button>
        </form>

        <div className="auth-foot">
          <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
        </div>

        <div className="auth-note">Client-side demo auth — not production-secure. All other users are created in User Management.</div>
      </div>
    </div>
  );
}
