import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authLogic } from '@/logic/authLogic.js';
import { userService } from '@/services/userService.js';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import { Field, Input } from '@/components/Field.jsx';

export default function BootstrapAdmin() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Safety check: if users exist, redirect away to login
    const checkStatus = async () => {
      try {
        const list = await userService.list();
        if (list && list.length > 0) {
          nav('/login', { replace: true });
        }
      } catch (e) {
        // ignore
      }
    };
    checkStatus();
  }, [nav]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Name is required.');
    if (!email.trim()) return setError('Email is required.');
    if (!password) return setError('Password is required.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setBusy(true);
    const res = await authLogic.bootstrapAdmin({
      name: name.trim(),
      email: email.trim(),
      password,
    });
    setBusy(false);

    if (res.ok) {
      nav('/login', { replace: true });
    } else {
      setError(res.error || 'Failed to bootstrap super admin.');
    }
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

        <h1 className="auth-title">Bootstrap System</h1>
        <p className="auth-sub">Create the first Super Administrator account to begin setup.</p>

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
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>
          <Field label="Confirm Password">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
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
            Create Super Admin
          </Button>
        </form>

        <div className="auth-note">
          Once created, this account will have full access. Keep these credentials secure.
        </div>
      </div>
    </div>
  );
}
