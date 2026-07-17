import { useState, useEffect } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useSettings } from '@/data-layer/SettingsContext.jsx';
import { userLogic } from '@/logic/userLogic.js';
import { roleService } from '@/services/roleService.js';
import { settingsCache } from '@/core/settingsCache.js';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import PasswordInput from '@/components/PasswordInput.jsx';
import { Field, Input } from '@/components/Field.jsx';

function roleAccessSummary(role) {
  if (role.all) return 'Full access — all modules and settings';
  const perms = role.permissions || [];
  if (!perms.length) return 'No access assigned';
  return `${perms.length} permission${perms.length === 1 ? '' : 's'}`;
}

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

  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [loadingRoles, setLoadingRoles] = useState(true);

  if (isAuthenticated) return <Navigate to="/" replace />;

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

  // Load available roles (with their access) so the user can see what each
  // role grants before choosing. SECURITY: the Admin / system roles are NEVER
  // offered on public self-registration — assigning admin must be done by an
  // existing admin inside the app, never self-served. The first account on a
  // fresh install is auto-provisioned as admin server-side (userLogic.create),
  // so it does not need to be selectable here.
  const isAdminRole = (r) => (r.code || r.name || '').toLowerCase() === 'admin' || r.system === true || r.all === true;

  useEffect(() => {
    (async () => {
      try {
        const res = await roleService.list();
        const list = Array.isArray(res) ? res : (res && res.data) || [];
        // Exclude admin/system/full-access roles from the public chooser.
        const publicRoles = list.filter((r) => !isAdminRole(r));
        if (publicRoles.length) {
          setRoles(publicRoles);
          const configured = settingsCache.get('defaultRole') || 'Admin';
          const initial = publicRoles.some((r) => r.code === configured)
            ? configured
            : publicRoles[0].code;
          setSelectedRole(initial);
        } else {
          // No public roles exist. This is either a fresh install (first
          // account becomes admin automatically) or an admin has not yet
          // created any assignable roles. In neither case do we expose Admin
          // as a self-service option.
          setRoles([]);
          setSelectedRole('');
        }
      } catch (_) {
        setRoles([]);
        setSelectedRole('');
      } finally {
        setLoadingRoles(false);
      }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Full name is required.');
    if (!email.trim()) return setError('Email is required.');
    if (!password) return setError('Password is required.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setBusy(true);

    // If a public role is selected, use it. If none is available (fresh
    // install), omit roleCode so userLogic.create auto-provisions Admin for
    // the very first account — but never let a user self-claim Admin here.
    const res = await userLogic.create({
      name: name.trim(),
      email: email.trim(),
      password,
      ...(selectedRole ? { roleCode: selectedRole } : {}),
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

          <Field label="Select Role">
            {loadingRoles ? (
              <div className="auth-role-loading">Loading available roles…</div>
            ) : roles.length ? (
              <div className="auth-role-list">
                {roles.map((r) => {
                  const code = r.code || r.name;
                  const active = selectedRole === code;
                  return (
                    <button
                      type="button"
                      key={code}
                      className={`auth-role ${active ? 'auth-role--active' : ''}`}
                      onClick={() => setSelectedRole(code)}
                    >
                      <span className="auth-role__check">{active && <Icon name="check" size={12} />}</span>
                      <span className="auth-role__body">
                        <span className="auth-role__name">{r.name || code}</span>
                        <span className="auth-role__access">{roleAccessSummary(r)}</span>
                        {r.description && <span className="auth-role__desc">{r.description}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="auth-role-note">
                <Icon name="shield" size={14} />
                <span>
                  No assignable roles are configured yet. The <strong>first account</strong> you
                  create will become the <strong>Administrator</strong> with full access. Additional
                  users must be invited and assigned roles by an administrator later.
                </span>
              </div>
            )}
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
