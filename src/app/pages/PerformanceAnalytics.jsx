import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';

export default function PerformanceAnalytics() {
  return (
    <div className="fade-in">
      <PageHeader icon="grid" title="Performance Analytics" subtitle="System performance metrics and analytics." />

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="bolt" size={18} /></div>
          <div className="stat-card__value">99.8%</div>
          <div className="stat-card__label">Uptime</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="clock" size={18} /></div>
          <div className="stat-card__value">210ms</div>
          <div className="stat-card__label">Avg Response Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="users" size={18} /></div>
          <div className="stat-card__value">1,024</div>
          <div className="stat-card__label">Active Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="database" size={18} /></div>
          <div className="stat-card__value">98.2%</div>
          <div className="stat-card__label">Cache Hit Rate</div>
        </div>
      </div>

      <div className="grid-2">
        <Card title="Response Times (p50/p95)">
          <table className="table">
            <thead><tr><th>Endpoint</th><th>p50</th><th>p95</th></tr></thead>
            <tbody>
              <tr><td>Case List</td><td>120ms</td><td>340ms</td></tr>
              <tr><td>Case Detail</td><td>85ms</td><td>210ms</td></tr>
              <tr><td>Search</td><td>190ms</td><td>520ms</td></tr>
              <tr><td>AI Query</td><td>1.2s</td><td>3.4s</td></tr>
            </tbody>
          </table>
        </Card>
        <Card title="Error Rates">
          <table className="table">
            <thead><tr><th>Module</th><th>Errors</th><th>Rate</th></tr></thead>
            <tbody>
              <tr><td>API</td><td>23</td><td>0.12%</td></tr>
              <tr><td>Database</td><td>8</td><td>0.04%</td></tr>
              <tr><td>AI</td><td>45</td><td>0.35%</td></tr>
              <tr><td>Auth</td><td>3</td><td>0.02%</td></tr>
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
