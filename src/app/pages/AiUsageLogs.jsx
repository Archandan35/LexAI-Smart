import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Badge from '@/components/Badge.jsx';

const STATS = [
  { value: '1,482', label: 'Total Queries' },
  { value: '2.3M', label: 'Tokens Used' },
  { value: '1.8s', label: 'Avg Response Time' },
  { value: '47', label: 'Queries Today' },
];

const LOGS = [
  { user: 'adv.sharma@example.com', query: 'Summarise Section 138 NI Act', model: 'gpt-4', tokens: 1240, time: '2.1s', date: '23 Jun 2026' },
  { user: 'priya.k@example.com', query: 'Draft reply to legal notice', model: 'gpt-4', tokens: 2890, time: '3.4s', date: '23 Jun 2026' },
  { user: 'rahul.m@example.com', query: 'Find similar case precedents', model: 'gpt-4', tokens: 960, time: '1.5s', date: '22 Jun 2026' },
];

export default function AiUsageLogs() {
  return (
    <div className="fade-in">
      <PageHeader icon="clock" title="AI Usage Logs" subtitle="Monitor AI assistant usage across the platform." />

      <div className="stat-grid">
        {STATS.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card__value">{s.value}</div>
            <div className="stat-card__label">{s.label}</div>
          </div>
        ))}
      </div>

      <Card title="Usage Log">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Query</th>
                <th>Model</th>
                <th>Tokens</th>
                <th>Time</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {LOGS.map((l, i) => (
                <tr key={i}>
                  <td>{l.user}</td>
                  <td>{l.query}</td>
                  <td><Badge tone="navy">{l.model}</Badge></td>
                  <td>{l.tokens}</td>
                  <td>{l.time}</td>
                  <td>{l.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
