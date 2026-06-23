import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';

export default function TasksAndReminders() {
  return (
    <div className="fade-in">
      <PageHeader
        icon="check"
        title="Tasks & Reminders"
        subtitle="Track case tasks, deadlines, and automated reminders."
      />

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="check" size={20} /></div>
          <div className="stat-card__value">0</div>
          <div className="stat-card__label">Pending Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="alert" size={20} /></div>
          <div className="stat-card__value">0</div>
          <div className="stat-card__label">Overdue</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="grid" size={20} /></div>
          <div className="stat-card__value">0</div>
          <div className="stat-card__label">Completed Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="bell" size={20} /></div>
          <div className="stat-card__value">0</div>
          <div className="stat-card__label">Reminders Active</div>
        </div>
      </div>

      <Card title="My Tasks">
        <div className="empty-state">
          <Icon name="check" size={48} />
          <h3>No pending tasks.</h3>
        </div>
      </Card>
    </div>
  );
}
