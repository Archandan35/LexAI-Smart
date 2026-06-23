import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';

export default function AiUsageReports() {
  return (
    <div className="fade-in">
      <PageHeader icon="bolt" title="AI Usage Reports" subtitle="Analyze AI assistant usage across the platform." />

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="bolt" size={18} /></div>
          <div className="stat-card__value">12,847</div>
          <div className="stat-card__label">Total Queries</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="grid" size={18} /></div>
          <div className="stat-card__value">3.2M</div>
          <div className="stat-card__label">Tokens Used</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="clock" size={18} /></div>
          <div className="stat-card__value">1.4s</div>
          <div className="stat-card__label">Avg Response Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="database" size={18} /></div>
          <div className="stat-card__value">$234.50</div>
          <div className="stat-card__label">Cost Incurred</div>
        </div>
      </div>

      <Card title="Usage by Model">
        <table className="table">
          <thead>
            <tr><th>Model</th><th>Queries</th><th>Tokens</th><th>Avg Cost/Query</th><th>Total Cost</th></tr>
          </thead>
          <tbody>
            <tr><td>GPT-4o</td><td>5,230</td><td>1,850K</td><td>$0.028</td><td>$146.44</td></tr>
            <tr><td>GPT-4o-mini</td><td>4,112</td><td>890K</td><td>$0.008</td><td>$32.90</td></tr>
            <tr><td>Claude-3-Sonnet</td><td>2,890</td><td>420K</td><td>$0.015</td><td>$43.35</td></tr>
            <tr><td>Gemini-Pro</td><td>615</td><td>40K</td><td>$0.010</td><td>$6.15</td></tr>
          </tbody>
        </table>
      </Card>

      <Card title="Usage by User" className="ai-usage__card-mt">
        <table className="table">
          <thead>
            <tr><th>User</th><th>Queries</th><th>Tokens</th><th>Last Active</th></tr>
          </thead>
          <tbody>
            <tr><td>admin@lexai.com</td><td>3,421</td><td>1.1M</td><td>2026-06-24</td></tr>
            <tr><td>advocate@example.com</td><td>2,890</td><td>890K</td><td>2026-06-23</td></tr>
            <tr><td>associate@example.com</td><td>1,234</td><td>312K</td><td>2026-06-22</td></tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
