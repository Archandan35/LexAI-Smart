import React from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '@/config/config.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { UDB_VERSION, SCHEMA_VERSION } from '@/logic/backupLogic.js';

export default function SystemSettings() {
  const nav = useNavigate();
  const { user } = useAuth();

  const links = [
    { label: 'Database Manager', icon: 'database', to: '/admin/database', desc: 'Provider, schema, seed & .udb import/export' },
    { label: 'Backup & Recovery', icon: 'database', to: '/admin/backup', desc: 'Snapshots, retention, restore' },
    { label: 'Storage & Sync', icon: 'database', to: '/admin/storage', desc: 'Cloud storage for case & draft files' },
    { label: 'Environment & API', icon: 'gear', to: '/admin/env-api', desc: 'Env variables, secrets & API config' },
    { label: 'Audit Logs', icon: 'history', to: '/admin/audit', desc: 'Security event trail' },
    { label: 'Role Management', icon: 'badge', to: '/admin/roles', desc: 'Roles & permissions' },
    { label: 'User Management', icon: 'users', to: '/admin/users', desc: 'Accounts & access' },
    { label: 'Permission Center', icon: 'lock', to: '/admin/permissions', desc: 'Master permission grid' },
    { label: 'Security Settings', icon: 'lock', to: '/admin/security', desc: 'Authentication policies & bootstrap' },
  ];

  return (
    <div className="fade-in">
      <PageHeader icon="gear" title="System Settings" subtitle="Administration hub and environment information." />

      <div className="grid-3" style={{ marginBottom: 20 }}>
        {links.map((l) => (
          <button key={l.to} className="folder" onClick={() => nav(l.to)} style={{ textAlign: 'left' }}>
            <span className="folder__icon"><Icon name={l.icon} size={20} /></span>
            <span>
              <div style={{ fontWeight: 650, color: 'var(--navy-900)' }}>{l.label}</div>
              <div className="folder__count">{l.desc}</div>
            </span>
          </button>
        ))}
      </div>

      <div className="grid-2">
        <Card title="Environment">
          <div className="kv"><span>App</span><b>{config.app.name} v{config.app.version}</b></div>
          <div className="kv"><span>Signed in as</span><span>{user?.name} ({user?.roleCode})</span></div>
          <div className="kv"><span>AI provider</span><span>{config.providers.ai}</span></div>
          <div className="kv"><span>Auth provider</span><span>{config.providers.auth}</span></div>
          <div className="kv"><span>Database provider</span><span>{config.providers.database}</span></div>
          <div className="kv"><span>UDB / Schema</span><span>v{UDB_VERSION} · {SCHEMA_VERSION}</span></div>
        </Card>
        <Card title="Security notes">
          <div className="alert alert--warn" style={{ marginBottom: 10 }}>
            <Icon name="alert" size={16} />
            <span>This is a client-side demo. Authentication, permissions and backups are enforced in the browser only. For production, enforce them on a backend (the Supabase provider templates show how).</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-soft)', fontSize: 13, lineHeight: 1.8 }}>
            <li>Route + permission guards hide unauthorized pages, menus, buttons and actions.</li>
            <li>Role hierarchy grants higher roles the permissions of lower roles.</li>
            <li>User overrides can grant extra permissions or explicitly deny inherited ones.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
