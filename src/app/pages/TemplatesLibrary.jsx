import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';

const STATS = [
  { label: 'Total Templates', value: '24', icon: 'copy' },
  { label: 'Active Templates', value: '18', icon: 'check' },
  { label: 'Categories', value: '6', icon: 'layers' },
  { label: 'Last Updated', value: 'Today', icon: 'clock' },
];

const TEMPLATES = [
  { name: 'Plaint (Civil Suit)', category: 'Pleadings', updated: '2 days ago' },
  { name: 'Written Statement', category: 'Pleadings', updated: '1 week ago' },
  { name: 'Criminal Bail Application', category: 'Criminal', updated: '3 days ago' },
  { name: 'Sale Deed', category: 'Conveyance', updated: '1 month ago' },
];

export default function TemplatesLibrary() {
  return (
    <div className="fade-in">
      <PageHeader
        icon="copy"
        title="Templates Library"
        subtitle="Browse and manage reusable document templates and clause libraries."
      />

      <div className="stat-grid">
        {STATS.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card__icon"><Icon name={s.icon} size={20} /></div>
            <div className="stat-card__value">{s.value}</div>
            <div className="stat-card__label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="datatable__search">
        <Icon name="search" size={15} />
        <input placeholder="Search templates…" />
      </div>

      <Card title="Templates">
        {TEMPLATES.map((t, i) => (
          <button className="docmgr__folder" key={i}>
            <Icon name="doc" size={15} />
            <span>{t.name}</span>
            <span className="docmgr__count">{t.category} · {t.updated}</span>
          </button>
        ))}
      </Card>
    </div>
  );
}
