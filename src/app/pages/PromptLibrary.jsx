import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Badge from '@/components/Badge.jsx';
import Icon from '@/components/Icon.jsx';

const STATS = [
  { value: 24, label: 'Total Prompts' },
  { value: 8, label: 'Drafting' },
  { value: 6, label: 'Research' },
  { value: 5, label: 'Review' },
  { value: 5, label: 'Custom' },
];

const PROMPTS = [
  { name: 'Draft Plaint for Recovery', category: 'Drafting', lastUsed: '2 days ago' },
  { name: 'Summarise Case Law', category: 'Research', lastUsed: '5 days ago' },
  { name: 'Review Contract Clause', category: 'Review', lastUsed: '1 week ago' },
  { name: 'Cross Examination Questions', category: 'Custom', lastUsed: '3 days ago' },
];

export default function PromptLibrary() {
  return (
    <div className="fade-in">
      <PageHeader icon="book" title="Prompt Library" subtitle="Manage reusable AI prompt templates." />

      <div className="stat-grid">
        {STATS.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card__value">{s.value}</div>
            <div className="stat-card__label">{s.label}</div>
          </div>
        ))}
      </div>

      <Card title="Prompt Templates">
        <div className="datatable__search">
          <Icon name="search" size={16} />
          <input placeholder="Search prompts…" />
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Prompt Name</th>
                <th>Category</th>
                <th>Last Used</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {PROMPTS.map((p) => (
                <tr key={p.name}>
                  <td className="fw-600">{p.name}</td>
                  <td><Badge tone="navy">{p.category}</Badge></td>
                  <td className="muted">{p.lastUsed}</td>
                  <td>
                    <button className="btn btn--ghost btn--sm"><Icon name="edit" size={14} /></button>
                    <button className="btn btn--ghost btn--sm"><Icon name="trash" size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
