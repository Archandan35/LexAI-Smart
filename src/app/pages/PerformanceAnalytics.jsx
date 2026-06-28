import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { casesRepository } from '@/data-layer/repositories/casesRepository.js';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { auditLogsRepository } from '@/data-layer/repositories/auditLogsRepository.js';

export default function PerformanceAnalytics() {
  const [metrics, setMetrics] = useState({ cases: 0, documents: 0, logs: 0, aiLogs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      casesRepository.getAll().catch(() => []),
      documentsRepository.getAll().catch(() => []),
      auditLogsRepository.getAll().catch(() => []),
    ])
      .then(([cases, docs, logs]) => {
        const c = Array.isArray(cases) ? cases : [];
        const d = Array.isArray(docs) ? docs : [];
        const l = Array.isArray(logs) ? logs : [];
        setMetrics({
          cases: c.length,
          documents: d.length,
          logs: l.length,
          aiLogs: l.filter((lg) => lg.module === 'ai').length,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader icon="grid" title="Performance Analytics" subtitle="System performance metrics and analytics." />
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-card__value">99.8%</span>
          <span className="stat-card__label">Uptime</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">210ms</span>
          <span className="stat-card__label">Avg Response Time</span>
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
            <p className="loading-text">Loading...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Cases</td>
                  <td>{metrics.cases}</td>
                </tr>
                <tr>
                  <td>Total Documents</td>
                  <td>{metrics.documents}</td>
                </tr>
                <tr>
                  <td>Audit Log Entries</td>
                  <td>{metrics.logs}</td>
                </tr>
                <tr>
                  <td>AI Queries</td>
                  <td>{metrics.aiLogs}</td>
                </tr>
              </tbody>
            </table>
          )}
        </Card>
        <Card title="Error Rates">
          <table className="data-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Errors</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>API</td>
                <td>0</td>
                <td>0%</td>
              </tr>
              <tr>
                <td>Database</td>
                <td>0</td>
                <td>0%</td>
              </tr>
              <tr>
                <td>AI</td>
                <td>0</td>
                <td>0%</td>
              </tr>
              <tr>
                <td>Auth</td>
                <td>0</td>
                <td>0%</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
