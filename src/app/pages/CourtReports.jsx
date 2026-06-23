import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Badge from '@/components/Badge.jsx';

const STATS = [
  { value: 12, label: 'Courts Active' },
  { value: 487, label: 'Cases Filed' },
  { value: 231, label: 'Cases Disposed' },
  { value: '4.2mo', label: 'Avg Disposal Time' },
];

const COURTS = [
  { name: 'Supreme Court', filed: 45, disposed: 22, pending: 23 },
  { name: 'High Court — Delhi', filed: 142, disposed: 68, pending: 74 },
  { name: 'District Court — Delhi', filed: 198, disposed: 95, pending: 103 },
  { name: 'Family Court — Delhi', filed: 56, disposed: 28, pending: 28 },
  { name: 'Consumer Forum', filed: 46, disposed: 18, pending: 28 },
];

export default function CourtReports() {
  return (
    <div className="fade-in">
      <PageHeader icon="folder" title="Court Reports" subtitle="Court-wise case distribution and performance." />

      <div className="stat-grid">
        {STATS.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card__value">{s.value}</div>
            <div className="stat-card__label">{s.label}</div>
          </div>
        ))}
      </div>

      <Card title="Court Statistics">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Court Name</th>
                <th>Cases Filed</th>
                <th>Disposed</th>
                <th>Pending</th>
                <th>Disposal %</th>
              </tr>
            </thead>
            <tbody>
              {COURTS.map((c) => {
                const pct = c.filed ? Math.round((c.disposed / c.filed) * 100) : 0;
                return (
                  <tr key={c.name}>
                    <td className="court-reports__name">{c.name}</td>
                    <td>{c.filed}</td>
                    <td><Badge tone="green">{c.disposed}</Badge></td>
                    <td>{c.pending}</td>
                    <td>{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
