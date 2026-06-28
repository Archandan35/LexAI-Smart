import React from 'react';

const METHODS = [
  { id: 'simple', icon: '⚡', title: 'Simple Setup', desc: 'Connect using a Project URL and API Key. Ideal for Supabase and compatible providers.', badge: 'Recommended', difficulty: 'Easy', time: '~2 min' },
  { id: 'advanced', icon: '⚙️', title: 'Advanced Setup', desc: 'Connect directly using database credentials for PostgreSQL, MySQL, SQL Server, and self-hosted databases.', difficulty: 'Medium', time: '~5 min' },
  { id: 'sql', icon: '📋', title: 'Generate SQL', desc: 'Generate installation SQL scripts for manual execution in your database SQL editor.', difficulty: 'Easy', time: '~1 min' },
  { id: 'restore', icon: '💾', title: 'Restore Backup', desc: 'Restore from .udb, .sql, or .json files. Perfect for backups, migrations, or moving between providers.', difficulty: 'Easy', time: '~3 min' },
];

export default function MethodStep({ onSelect, back }) {
  return (
    <div>
      <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 20 }}>
        Choose how you want to connect your database. Simple Setup is the fastest path for Supabase users.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {METHODS.map((m) => (
          <button key={m.id} onClick={() => onSelect(m.id)}
            tabIndex={0}
            aria-label={`${m.title}: ${m.desc}`}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
              padding: 20, borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              background: 'var(--surface-2)', cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.2s var(--ease)', position: 'relative',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {m.badge && (
              <span style={{
                position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700,
                padding: '2px 8px', borderRadius: 10, background: 'var(--gold-soft)', color: 'var(--gold)',
              }}>
                {m.badge}
              </span>
            )}
            <span style={{ fontSize: 24 }}>{m.icon}</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{m.title}</span>
            <span style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5 }}>{m.desc}</span>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
              <span>{m.difficulty}</span>
              <span>{m.time}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
