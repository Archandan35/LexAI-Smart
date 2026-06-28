import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useSettings } from '@/data-layer/SettingsContext.jsx';
import { userLogic } from '@/logic/userLogic.js';
import { settingsCache } from '@/core/settingsCache.js';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import PasswordInput from '@/components/PasswordInput.jsx';
import { Field, Input } from '@/components/Field.jsx';

export default function Register() {
  const { settings } = useSettings();
  const { login, isAuthenticated } = useAuth();
  const nav = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) { nav('/', { replace: true }); return null; }

  const allowRegistration = settingsCache.get('allowRegistration');
  if (!allowRegistration) {
    return (
      <div className="auth-shell">
        <div className="auth-card fade-in">
          <div className="auth-card__logo">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.siteTitle} className="auth-card__logo-img" />
            ) : (
              <div className="auth-card__logo-fallback">{settings.siteTitle?.charAt(0) || 'R'}</div>
            )}
          </div>
          <h1 className="auth-title">Registration Disabled</h1>
          <p className="auth-sub">Public registration is currently disabled. Contact an administrator for an invitation.</p>
          <div className="auth-foot">
            <Link to="/login" className="auth-link">&larr; Back to sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Full name is required.');
    if (!email.trim()) return setError('Email is required.');
    if (!password) return setError('Password is required.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setBusy(true);

    const defaultRole = settingsCache.get('defaultRole') || 'Client';
    const res = await userLogic.create({
      name: name.trim(),
      email: email.trim(),
      password,
      roleCode: defaultRole,
    }, null);

    setBusy(false);

    if (res.ok) {
      const loginRes = await login(email.trim(), password);
      if (loginRes.ok) {
        nav('/', { replace: true });
      } else {
        nav('/login', { replace: true });
      }
    } else {
      setError(res.error || 'Registration failed.');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card fade-in">
        <div className="auth-card__logo">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.siteTitle} className="auth-card__logo-img" />
          ) : (
            <div className="auth-card__logo-fallback">{settings.siteTitle?.charAt(0) || 'R'}</div>
          )}
        </div>

        <h1 className="auth-title">Create Account</h1>
        <p className="auth-sub">Register a new account to get started.</p>

        {error && (
          <div className="alert alert--danger alert--mb">
            <Icon name="alert" size={16} />
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <Field label="Full Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Adv. Priya Sharma" autoFocus required />
          </Field>
          <Field label="Email Address">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. priya@lexai.local" required />
          </Field>
          <Field label="Password">
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required />
          </Field>
          <Field label="Confirm Password">
            <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" required />
          </Field>
          <Button type="submit" variant="primary" className="btn--block" loading={busy} icon="shield">Create Account</Button>
        </form>

        <div className="auth-foot">
          <span className="auth-note">Already have an account? </span>
          <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
