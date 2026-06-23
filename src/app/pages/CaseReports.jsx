import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Badge from '@/components/Badge.jsx';

const STATS = [
  { value: 342, label: 'Total Cases' },
  { value: 198, label: 'Active' },
  { value: 104, label: 'Disposed' },
  { value: 40, label: 'Pending' },
];

const CASE_DATA = [
  { type: 'Civil', total: 120, active: 68, disposed: 38, pending: 14 },
  { type: 'Criminal', total: 95, active: 55, disposed: 28, pending: 12 },
  { type: 'Writ', total: 67, active: 38, disposed: 20, pending: 9 },
  { type: 'Family', total: 42, active: 25, disposed: 12, pending: 5 },
  { type: 'Consumer', total: 18, active: 12, disposed: 6, pending: 0 },
];

export default function CaseReports() {
  const maxVal = Math.max(...CASE_DATA.map((c) => c.total), 1);
  return (
    <div className="fade-in">
      <PageHeader icon="folder" title="Case Reports" subtitle="Case statistics, stage distribution, and disposal reports." />

      <div className="stat-grid">
        {STATS.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card__value">{s.value}</div>
            <div className="stat-card__label">{s.label}</div>
          </div>
        ))}
      </div>

      <Card title="Case Statistics">
        {CASE_DATA.map((c) => (
          <div className="case-reports__bar-row">
            <span className="case-reports__bar-label">{c.type}</span>
            <div className="case-reports__bar-track">
              <div style={{ width: `${(c.total / maxVal) * 100}%`, height: '100%', background: 'var(--navy-600)', borderRadius: 6 }} />
            </div>
            <span className="case-reports__bar-value">{c.total}</span>
          </div>
        ))}
      </Card>

      <Card title="Case Distribution">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Case Type</th>
                <th>Total</th>
                <th>Active</th>
                <th>Disposed</th>
                <th>Pending</th>
              </tr>
            </thead>
            <tbody>
              {CASE_DATA.map((c) => (
                <tr key={c.type}>
                  <td className="case-reports__cell-bold">{c.type}</td>
                  <td>{c.total}</td>
                  <td><Badge tone="navy">{c.active}</Badge></td>
                  <td><Badge tone="green">{c.disposed}</Badge></td>
                  <td>{c.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
