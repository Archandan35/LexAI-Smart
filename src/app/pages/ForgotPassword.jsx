import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authLogic } from '@/logic/authLogic.js';
import { useSettings } from '@/data-layer/SettingsContext.jsx';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import { Field, Input } from '@/components/Field.jsx';

export default function ForgotPassword() {
  const { settings } = useSettings();
  const [identifier, setIdentifier] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await authLogic.forgotPassword(identifier.trim());
    setBusy(false);
    setResult(res.ok ? res.data : { message: res.error });
  };

  return (
    <div className="auth-shell">
      <div className="auth-card fade-in">
        <div className="auth-card__logo">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.siteTitle} className="auth-card__logo-img" />
          ) : (
            <div className="auth-card__logo-fallback">{settings.siteTitle?.charAt(0) || 'F'}</div>
          )}
        </div>

        <h1 className="auth-title">Forgot password</h1>
        <p className="auth-sub">Enter your email or username to generate a reset token.</p>

        {result ? (
          <div className="alert alert--info forgot-password__result">
            <div className="flex-row gap-8"><Icon name="check" size={16} />{result.message}</div>
            {import.meta.env.DEV && result.token && <div className="mt-8">Demo reset token: <code>{result.token}</code></div>}
            <div className="forgot-password__hint">No email is sent in this client-side demo. A System Owner can reset passwords in User Management.</div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <Field label="Email or username">
              <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@lexai.local" autoFocus />
            </Field>
            <Button type="submit" variant="primary" className="btn--block" loading={busy} icon="shield">Generate reset token</Button>
          </form>
        )}

        <div className="auth-foot">
          <Link to="/login" className="auth-link">← Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}

