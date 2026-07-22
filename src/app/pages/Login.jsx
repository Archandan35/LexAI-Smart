import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useSettings } from '@/data-layer/SettingsContext.jsx';
import { userService } from '@/services/userService.js';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import PasswordInput from '@/components/PasswordInput.jsx';
import { Field, Input } from '@/components/Field.jsx';

function getInitialTheme() {
  const saved = localStorage.getItem('themeMode');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function Login() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('themeMode', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  const { login, isAuthenticated } = useAuth();
  const { settings } = useSettings();
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

  if (isAuthenticated) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    const raw = identifier.trim();

    // Supabase Auth only signs in by email. If the user entered a username or
    // phone number, resolve it to the registered email via the users table.
    let loginIdentifier = raw;
    if (raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      try {
        const all = await userService.list();
        const match = (all || []).find((u) =>
          (u.username && u.username.toLowerCase() === raw.toLowerCase()) ||
          (u.phone && u.phone.replace(/\D/g, '') === raw.replace(/\D/g, ''))
        );
        if (match && match.email) loginIdentifier = match.email;
      } catch (_) { /* fall through — signIn will report invalid credentials */ }
    }

    const res = await login(loginIdentifier, password);
    setBusy(false);
    if (res.ok) nav(from, { replace: true });
    else setError(res.error || 'Sign in failed.');
  };

  return (
    <div className="auth-shell">
      <div className="auth-card fade-in">
        <button className="auth-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
        </button>
        <div className="auth-card__logo">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.siteTitle} className="auth-card__logo-img" />
          ) : (
            <div className="auth-card__logo-fallback">{settings.siteTitle?.charAt(0) || 'L'}</div>
          )}
        </div>

        <h1 className="auth-title">Sign in</h1>
        <p className="auth-sub">Access your litigation workspace.</p>

        {needsBootstrap && (
          <div className="alert alert--warn alert--mb">
            <Icon name="alert" size={16} />
            <span>
              No System Owner account exists. You must bootstrap the system before you can log in.
              <br />
              <Link to="/bootstrap-admin" className="login__bootstrap-link">
                Bootstrap First Super Admin →
              </Link>
            </span>
          </div>
        )}

        {error && <div className="alert alert--danger alert--mb"><Icon name="alert" size={16} />{error}</div>}

        <form onSubmit={submit}>
          <Field label="Email, username or phone">
            <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="e.g. admin@company.com" autoFocus />
          </Field>
          <Field label="Password">
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
          </Field>
          <Button type="submit" variant="primary" className="btn--block" loading={busy} icon="shield">Sign in</Button>
        </form>

        <div className="auth-foot auth-foot--between">
          <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
          {settings.allowRegistration ? <Link to="/register" className="auth-link">Create account</Link> : null}
        </div>

        <div className="auth-note">Client-side demo auth — not production-secure. All other users are created in User Management.</div>

      </div>
    </div>
  );
}

