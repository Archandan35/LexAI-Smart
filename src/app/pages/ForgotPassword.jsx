import React, { useState } from 'react';
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
        <div className="auth-brand">
          <div className="sidebar__logo" style={{ width: 46, height: 46 }}>⚖</div>
          <div>
            <div className="sidebar__title" style={{ fontSize: 22 }}>{settings.siteTitle}</div>
            <div className="sidebar__sub">Password recovery</div>
          </div>
        </div>

        <h1 className="auth-title">Forgot password</h1>
        <p className="auth-sub">Enter your email or username to generate a reset token.</p>

        {result ? (
          <div className="alert alert--info" style={{ marginBottom: 16, flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 8 }}><Icon name="check" size={16} />{result.message}</div>
            {result.token && <div style={{ marginTop: 8 }}>Demo reset token: <code>{result.token}</code></div>}
            <div style={{ marginTop: 6, fontSize: 12 }}>No email is sent in this client-side demo. An administrator can reset passwords in User Management.</div>
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
