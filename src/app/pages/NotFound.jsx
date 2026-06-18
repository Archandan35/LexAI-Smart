import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';

export default function NotFound() {
  const nav = useNavigate();
  return (
    <div className="empty" style={{ paddingTop: 80 }}>
      <div className="empty__icon" style={{ width: 72, height: 72 }}><Icon name="alert" size={32} /></div>
      <h1 style={{ fontSize: 28, color: 'var(--navy-900)', margin: '10px 0 4px' }}>404</h1>
      <p style={{ marginBottom: 20 }}>This page does not exist in LexAI.</p>
      <Button icon="grid" onClick={() => nav('/')}>Back to Dashboard</Button>
    </div>
  );
}
