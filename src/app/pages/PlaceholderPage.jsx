import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';

export default function PlaceholderPage({ title, icon = 'grid', subtitle }) {
  return (
    <div className="fade-in">
      <PageHeader
        icon={icon}
        title={title}
        subtitle={subtitle || `${title} page — coming soon`}
      />
      <Card>
        <div className="empty-state placeholder-page__empty">
          <Icon name="grid" size={48} />
          <h3>{title}</h3>
          <p>This feature is under development.</p>
        </div>
      </Card>
    </div>
  );
}
