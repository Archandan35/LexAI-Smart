import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';
import Badge from '@/components/Badge.jsx';

const STATS = [
  { label: 'Total Judgments', value: '24,580', icon: 'database' },
  { label: 'Supreme Court', value: '8,340', icon: 'shield' },
  { label: 'High Courts', value: '14,200', icon: 'layers' },
  { label: 'Tribunals', value: '2,040', icon: 'grid' },
];

const ROWS = [
  { name: 'Kesavananda Bharati v. State of Kerala', court: 'Supreme Court', date: '24 Apr 1973', citation: 'AIR 1973 SC 1461', bench: '13-Judge Bench' },
  { name: 'Maneka Gandhi v. Union of India', court: 'Supreme Court', date: '25 Jan 1978', citation: 'AIR 1978 SC 597', bench: '7-Judge Bench' },
  { name: 'S. R. Bommai v. Union of India', court: 'Supreme Court', date: '11 Mar 1994', citation: 'AIR 1994 SC 1918', bench: '9-Judge Bench' },
  { name: 'Naz Foundation v. Govt. of NCT of Delhi', court: 'Delhi High Court', date: '2 Jul 2009', citation: '160 (2009) DLT 277', bench: 'Division Bench' },
];

export default function JudgmentLibrary() {
  return (
    <div className="fade-in">
      <PageHeader
        icon="database"
        title="Judgment Library"
        subtitle="Browse and search archived judgments."
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
        <input placeholder="Search by case name, citation, court…" />
      </div>

      <Card title="Judgments">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Case Name</th>
                <th>Court</th>
                <th>Date</th>
                <th>Citation</th>
                <th>Bench</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td><Badge tone="navy">{r.court}</Badge></td>
                  <td>{r.date}</td>
                  <td>{r.citation}</td>
                  <td>{r.bench}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
