import React from 'react';
import Button from '@/components/Button.jsx';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function WelcomeStep({ onMethodSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, var(--brand), var(--gold))', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 32, fontWeight: 800, boxShadow: 'var(--shadow-brand)' }}>
        L
      </div>
      <div>
        <p style={{ fontSize: 15, color: 'var(--text-soft)', margin: 0 }}>{greeting()}</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '4px 0 0' }}>LexAI Setup</h1>
        <p style={{ color: 'var(--text-soft)', fontSize: 14, margin: '8px 0 0', maxWidth: 420, lineHeight: 1.6 }}>
          Welcome to the LexAI installation wizard. This tool will guide you through connecting your database,
          verifying your environment, and completing the setup so you can start using LexAI.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button variant="primary" icon="bolt" onClick={() => onMethodSelect('simple')}>Start Setup</Button>
        <Button variant="ghost" icon="copy" onClick={() => onMethodSelect('sql')}>Generate SQL</Button>
        <Button variant="ghost" icon="upload" onClick={() => onMethodSelect('restore')}>Restore Backup</Button>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: 'var(--text-faint)' }}>
        <a href="#" style={{ textDecoration: 'underline' }}>Documentation</a>
        <a href="#" style={{ textDecoration: 'underline' }}>Release Notes</a>
        <a href="#" style={{ textDecoration: 'underline' }}>Support</a>
      </div>
    </div>
  );
}
