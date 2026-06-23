import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';

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
              <tr>
                <td colSpan={4}>
                  <div className="empty">
                    <div className="empty__icon"><Icon name="users" size={24} /></div>
                    <p className="muted">No activity recorded yet.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
