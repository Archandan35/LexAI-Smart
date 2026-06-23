import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';

export default function Calendar() {
  return (
    <div className="fade-in">
      <PageHeader
        icon="calendar"
        title="Calendar"
        subtitle="Manage court dates, hearings, and events."
      />

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="mic" size={20} /></div>
          <div className="stat-card__value">0</div>
          <div className="stat-card__label">Upcoming Hearings</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="clock" size={20} /></div>
          <div className="stat-card__value">0</div>
          <div className="stat-card__label">Case Deadlines</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="calendar" size={20} /></div>
          <div className="stat-card__value">0</div>
          <div className="stat-card__label">Free Days</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="grid" size={20} /></div>
          <div className="stat-card__value">0</div>
          <div className="stat-card__label">Total Events</div>
        </div>
      </div>

      <Card title="Upcoming Events">
        <div className="empty-state">
          <Icon name="calendar" size={48} />
          <h3>No upcoming events scheduled.</h3>
        </div>
      </Card>
    </div>
  );
}
