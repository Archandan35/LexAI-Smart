import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Badge from '@/components/Badge.jsx';

const ACTIVITY = [
  { user: 'adv.sharma@example.com', action: 'Created Draft', module: 'Drafting', timestamp: '23 Jun 2026, 10:32 AM' },
  { user: 'priya.k@example.com', action: 'Searched Citation', module: 'Research', timestamp: '23 Jun 2026, 09:15 AM' },
  { user: 'rahul.m@example.com', action: 'Uploaded Document', module: 'Documents', timestamp: '22 Jun 2026, 04:45 PM' },
  { user: 'neha.g@example.com', action: 'Updated Case Status', module: 'Case Management', timestamp: '22 Jun 2026, 02:10 PM' },
];

export default function UserActivity() {
  return (
    <div className="fade-in">
      <PageHeader icon="users" title="User Activity" subtitle="Monitor user actions and platform usage." />

      <Card title="Recent Activity">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Module</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVITY.map((a, i) => (
                <tr key={i}>
                  <td>{a.user}</td>
                  <td><Badge tone="navy">{a.action}</Badge></td>
                  <td>{a.module}</td>
                  <td className="muted">{a.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
