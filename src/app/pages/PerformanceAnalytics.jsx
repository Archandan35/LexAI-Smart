import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { analyticsLogic } from '@/logic/analyticsLogic.js';

export default function PerformanceAnalytics() {
  const [metrics, setMetrics] = useState({ cases: 0, documents: 0, logs: 0, aiLogs: 0 });
  const [vitals, setVitals] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsLogic.getMetrics()
      .then((result) => { if (result?.ok) setMetrics(result.value); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('lexai:vitals');
      if (raw) setVitals(JSON.parse(raw));
    } catch {}
    const interval = setInterval(() => {
      try {
        const raw = sessionStorage.getItem('lexai:vitals');
        if (raw) setVitals(JSON.parse(raw));
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const uptimeEstimate = vitals ? 'Tracking…' : 'N/A';
  const avgResponse = vitals ? `${(vitals.value || 0).toFixed(0)}ms` : 'N/A';
  const lcpRating = vitals?.rating || 'unknown';

  return (
    <div>
      <PageHeader icon="grid" title="Performance Analytics" subtitle="Real-time system performance metrics from Web Vitals." />
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-card__value">{uptimeEstimate}</span>
          <span className="stat-card__label">LCP ({lcpRating})</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{avgResponse}</span>
          <span className="stat-card__label">LCP Value</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{metrics.cases + metrics.documents}</span>
          <span className="stat-card__label">Active Records</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{metrics.logs}</span>
          <span className="stat-card__label">Total Actions</span>
        </div>
      </div>
      <div className="grid-2">
        <Card title="System Metrics">
          {loading ? (
            <div className="loading-block"><span className="spinner" /></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Metric</th><th>Value</th></tr>
              </thead>
              <tbody>
                <tr><td>Total Cases</td><td>{metrics.cases}</td></tr>
                <tr><td>Total Documents</td><td>{metrics.documents}</td></tr>
                <tr><td>Audit Log Entries</td><td>{metrics.logs}</td></tr>
                <tr><td>AI Queries</td><td>{metrics.aiLogs}</td></tr>
              </tbody>
            </table>
          )}
        </Card>
        <Card title="Web Vitals">
          {vitals ? (
            <table className="data-table">
              <thead>
                <tr><th>Metric</th><th>Value</th><th>Rating</th></tr>
              </thead>
              <tbody>
                <tr><td>{vitals.name || 'LCP'}</td><td>{(vitals.value || 0).toFixed(1)}ms</td><td>{vitals.rating || 'unknown'}</td></tr>
              </tbody>
            </table>
          ) : (
            <div className="loading-block"><span className="spinner" /> Collecting metrics…</div>
          )}
        </Card>
      </div>
    </div>
  );
}
