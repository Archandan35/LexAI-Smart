import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';

export default function Contacts() {
  return (
    <div className="fade-in">
      <PageHeader
        icon="book"
        title="Contacts"
        subtitle="Manage advocates, judges, court staff, and other legal contacts."
      />

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="book" size={20} /></div>
          <div className="stat-card__value">0</div>
          <div className="stat-card__label">Total Contacts</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="users" size={20} /></div>
          <div className="stat-card__value">0</div>
          <div className="stat-card__label">Advocates</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="badge" size={20} /></div>
          <div className="stat-card__value">0</div>
          <div className="stat-card__label">Judges</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="shield" size={20} /></div>
          <div className="stat-card__value">0</div>
          <div className="stat-card__label">Court Staff</div>
        </div>
      </div>

      <Card title="Contact Directory">
        <div className="datatable__search">
          <Icon name="search" size={15} />
          <input type="text" placeholder="Search contacts…" />
        </div>
        <div className="empty-state">
          <Icon name="book" size={48} />
          <h3>No contacts added yet.</h3>
        </div>
      </Card>
    </div>
  );
}
