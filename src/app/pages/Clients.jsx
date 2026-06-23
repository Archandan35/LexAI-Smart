import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';

export default function Clients() {
  return (
    <div className="fade-in">
      <PageHeader
        icon="users"
        title="Clients"
        subtitle="Manage client profiles, contact info, and linked cases."
      />

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="users" size={20} /></div>
          <div className="stat-card__value">0</div>
          <div className="stat-card__label">Total Clients</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="vault" size={20} /></div>
          <div className="stat-card__value">0</div>
          <div className="stat-card__label">Active Matters</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="clock" size={20} /></div>
          <div className="stat-card__value">0</div>
          <div className="stat-card__label">Pending Payments</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="plus" size={20} /></div>
          <div className="stat-card__value">0</div>
          <div className="stat-card__label">New This Month</div>
        </div>
      </div>

      <Card title="Client Directory">
        <div className="datatable__search">
          <Icon name="search" size={15} />
          <input type="text" placeholder="Search clients…" />
        </div>
        <div className="empty-state">
          <Icon name="users" size={48} />
          <h3>No clients added yet.</h3>
        </div>
      </Card>
    </div>
  );
}
