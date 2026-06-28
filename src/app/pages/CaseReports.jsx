import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { casesRepository } from '@/data-layer/repositories/casesRepository.js';

export default function CaseReports() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    casesRepository.getAll().then(setCases).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const stats = {
    total: cases.length,
    active: cases.filter((c) => !c.archived && c.status === 'Active').length,
    disposed: cases.filter((c) => c.status === 'Disposed').length,
    pending: cases.filter((c) => c.status === 'Pending').length,
  };

  const stageDist = {};
  cases.forEach((c) => { const s = c.stage || 'Unknown'; stageDist[s] = (stageDist[s] || 0) + 1; });

  return (
    <div className="fade-in">
      <PageHeader icon="folder" title="Case Reports" subtitle="Case statistics, stage distribution, and disposal reports." />

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card__value">{stats.total}</div>
          <div className="stat-card__label">Total Cases</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{stats.active}</div>
          <div className="stat-card__label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{stats.disposed}</div>
          <div className="stat-card__label">Disposed</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{stats.pending}</div>
          <div className="stat-card__label">Pending</div>
        </div>
      </div>

      <div className="grid-2">
        <Card title="Case Statistics">
          {loading ? (
            <div className="empty"><span className="spinner" /></div>
          ) : cases.length === 0 ? (
            <div className="empty">
              <p className="muted">No case data available.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th>Metric</th><th>Count</th></tr></thead>
                <tbody>
                  <tr><td>Total</td><td>{stats.total}</td></tr>
                  <tr><td>Active</td><td>{stats.active}</td></tr>
                  <tr><td>Disposed</td><td>{stats.disposed}</td></tr>
                  <tr><td>Pending</td><td>{stats.pending}</td></tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Case Distribution">
          {Object.keys(stageDist).length === 0 ? (
            <div className="empty"><p className="muted">No case data available.</p></div>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th>Stage</th><th>Count</th></tr></thead>
                <tbody>
                  {Object.entries(stageDist).map(([stage, count]) => (
                    <tr key={stage}><td>{stage}</td><td>{count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
