import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useSettings } from '@/data-layer/SettingsContext.jsx';
import { authService } from '@/services/authService.js';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import { validatePassword } from '@/utils/passwordPolicy.js';
import PasswordInput from '@/components/PasswordInput.jsx';
import { Field } from '@/components/Field.jsx';

export default function ResetPassword() {
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const token = searchParams.get('token') || searchParams.get('access_token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) return setError('New password is required.');
    const pwResult = validatePassword(password);
    if (!pwResult.valid) return setError(pwResult.errors[0]);
    if (password !== confirm) return setError('Passwords do not match.');
    if (!token) return setError('Invalid or missing reset link. Please request a new password reset.');

    setBusy(true);
    try {
      await authService.changePassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    }
    setBusy(false);
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

        {success ? (
          <>
            <h1 className="auth-title">Password Reset</h1>
            <p className="auth-sub">Your password has been updated successfully.</p>
            <div className="alert alert--success mb-16">
              <Icon name="check" size={16} />
              <span>You can now sign in with your new password.</span>
            </div>
            <div className="auth-foot">
              <Link to="/login" className="auth-link">&larr; Back to sign in</Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="auth-title">Reset password</h1>
            <p className="auth-sub">Enter your new password below.</p>

            {error && <div className="alert alert--danger alert--mb"><Icon name="alert" size={16} />{error}</div>}

            <form onSubmit={submit}>
              <Field label="New Password">
                <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" autoFocus />
              </Field>
              <Field label="Confirm Password">
                <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter new password" />
              </Field>
              <Button type="submit" variant="primary" className="btn--block" loading={busy} icon="shield">Reset password</Button>
            </form>

            <div className="auth-foot">
              <Link to="/login" className="auth-link">&larr; Back to sign in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

