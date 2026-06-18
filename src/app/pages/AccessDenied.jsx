import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import { MODULE_MAP } from '@/constants/permissions.js';

export default function AccessDenied() {
  const nav = useNavigate();
  const { state } = useLocation();
  const moduleLabel = state?.module ? (MODULE_MAP[state.module]?.label || state.module) : null;

  return (
    <div className="fade-in" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 460 }}>
        <div className="empty__icon" style={{ width: 72, height: 72, margin: '0 auto 18px', color: 'var(--red)', background: 'var(--red-soft)' }}>
          <Icon name="lock" size={32} />
        </div>
        <h1 style={{ color: 'var(--navy-900)', margin: '0 0 8px' }}>Access denied</h1>
        <p style={{ color: 'var(--text-soft)', marginBottom: 22 }}>
          You don’t have permission to view {moduleLabel ? <b>{moduleLabel}</b> : 'this page'}.
          Contact an administrator if you believe this is a mistake.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Button variant="ghost" icon="arrow" onClick={() => nav(-1)}>Go back</Button>
          <Button variant="primary" icon="grid" onClick={() => nav('/')}>Dashboard</Button>
        </div>
      </div>
    </div>
  );
}
