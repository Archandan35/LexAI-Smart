import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';

const STATS = [
  { label: 'Total Acts', value: '128', icon: 'book' },
  { label: 'Sections', value: '4,256', icon: 'layers' },
  { label: 'Amendments', value: '340', icon: 'edit' },
  { label: 'Last Updated', value: 'Today', icon: 'clock' },
];

const ACTS = [
  { title: 'Indian Penal Code, 1860', short: 'IPC', sections: '511 Sections' },
  { title: 'Code of Civil Procedure, 1908', short: 'CPC', sections: '158 Sections' },
  { title: 'Code of Criminal Procedure, 1973', short: 'CrPC', sections: '484 Sections' },
  { title: 'Indian Evidence Act, 1872', short: 'IEA', sections: '167 Sections' },
  { title: 'Constitution of India, 1950', short: 'COI', sections: '395 Articles' },
];

export default function ActLibrary() {
  return (
    <div className="fade-in">
      <PageHeader
        icon="book"
        title="Act Library"
        subtitle="Browse statutes and acts with sections."
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
        <input placeholder="Search acts…" />
      </div>

      <Card title="Acts">
        {ACTS.map((a, i) => (
          <div className="list-row" key={i}>
            <div className="list-row__icon"><Icon name="book" size={16} /></div>
            <div>
              <div className="list-row__title">{a.title}</div>
              <div className="list-row__meta">{a.short} &middot; {a.sections}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
