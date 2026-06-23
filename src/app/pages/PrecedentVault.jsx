import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';

const STATS = [
  { label: 'Saved Precedents', value: '47', icon: 'star' },
  { label: 'Tags', value: '12', icon: 'bookmark' },
  { label: 'Recently Added', value: '5', icon: 'clock' },
  { label: 'Favorites', value: '8', icon: 'star' },
];

const PRECEDENTS = [
  { name: 'Kesavananda Bharati v. State of Kerala', court: 'Supreme Court', date: '24 Apr 1973', tags: ['Basic Structure', 'Constitutional Law'] },
  { name: 'Maneka Gandhi v. Union of India', court: 'Supreme Court', date: '25 Jan 1978', tags: ['Article 21', 'Due Process'] },
  { name: 'Indira Sawhney v. Union of India', court: 'Supreme Court', date: '16 Nov 1992', tags: ['Reservation', 'Article 16'] },
  { name: 'Vishaka v. State of Rajasthan', court: 'Supreme Court', date: '13 Aug 1997', tags: ['Sexual Harassment', 'Article 14'] },
  { name: 'S. R. Bommai v. Union of India', court: 'Supreme Court', date: '11 Mar 1994', tags: ['Federalism', 'Article 356'] },
  { name: 'Naz Foundation v. Govt. of NCT of Delhi', court: 'Delhi High Court', date: '2 Jul 2009', tags: ['Section 377', 'LGBTQ'] },
];

export default function PrecedentVault() {
  return (
    <div className="fade-in">
      <PageHeader
        icon="star"
        title="Precedent Vault"
        subtitle="Save, tag and organize important judgments."
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
        <input placeholder="Search precedents…" />
      </div>

      <Card title="Saved Precedents">
        <div className="grid-3">
          {PRECEDENTS.map((p, i) => (
            <div className="folder" key={i}>
              <div className="folder__icon"><Icon name="star" size={18} /></div>
              <div>
                <div className="list-row__title">{p.name}</div>
                <div className="folder__count">{p.court} &middot; {p.date}</div>
                <div className="folder__count">{p.tags.join(', ')}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
