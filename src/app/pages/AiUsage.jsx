import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';
import { auditLogsRepository } from '@/data-layer/repositories/auditLogsRepository.js';

const TABS = ['logs', 'reports'];

export default function AiUsage() {
  const [tab, setTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditLogsRepository.getAll()
      .then((all) => setLogs((Array.isArray(all) ? all : []).filter((l) => l.module === 'ai')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalTokens = logs.reduce((s, l) => s + (l.tokens || 0), 0);
  const totalTime = logs.reduce((s, l) => s + (l.responseTime || 0), 0);
  const totalCost = logs.reduce((s, l) => s + (l.cost || 0), 0);
  const todayLogs = logs.filter((l) => new Date(l.at || l.timestamp).toDateString() === new Date().toDateString());

  const byModel = {};
  logs.forEach((l) => {
    const m = l.model || 'Unknown';
    if (!byModel[m]) byModel[m] = { queries: 0, tokens: 0, time: 0, cost: 0 };
    byModel[m].queries += 1;
    byModel[m].tokens += l.tokens || 0;
    byModel[m].time += l.responseTime || 0;
    byModel[m].cost += l.cost || 0;
  });

  const byUser = {};
  logs.forEach((l) => {
    const u = l.userName || l.user || 'Unknown';
    if (!byUser[u]) byUser[u] = { queries: 0, tokens: 0, lastActive: l.at || l.timestamp || '' };
    byUser[u].queries += 1;
    byUser[u].tokens += l.tokens || 0;
    if (new Date(l.at || l.timestamp) > new Date(byUser[u].lastActive))
      byUser[u].lastActive = l.at || l.timestamp;
  });

  return (
    <div>
      <PageHeader icon="clock" title="AI Usage" subtitle="Monitor AI assistant usage — raw logs and aggregated reports." />

      <div className="seg mb-18">
        {TABS.map((t) => (
          <button key={t} className={`seg__btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            <Icon name={t === 'logs' ? 'clock' : 'bolt'} size={14} /> {t === 'logs' ? 'Usage Logs' : 'Usage Reports'}
          </button>
        ))}
      </div>

      {tab === 'logs' ? (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-card__value">{logs.length.toLocaleString()}</span>
              <span className="stat-card__label">Total Queries</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">{(totalTokens / 1000).toFixed(1)}K</span>
              <span className="stat-card__label">Tokens Used</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">{logs.length > 0 ? (totalTime / logs.length / 1000).toFixed(1) : '0'}s</span>
              <span className="stat-card__label">Avg Response Time</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">{todayLogs.length}</span>
              <span className="stat-card__label">Queries Today</span>
            </div>
          </div>
          <Card title="Usage Log">
            {loading ? (
              <p className="loading-text">Loading...</p>
            ) : logs.length === 0 ? (
              <div className="empty-state">
                <Icon name="clock" size={24} />
                <p>No AI usage recorded yet.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Query</th>
                    <th>Tokens</th>
                    <th>Time</th>
                    <th>Model</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {[...logs]
                    .sort((a, b) => new Date(b.at || b.timestamp) - new Date(a.at || a.timestamp))
                    .slice(0, 50)
                    .map((l) => (
                      <tr key={l.id}>
                        <td>{l.userName || l.user || '-'}</td>
                        <td>{(l.details || l.query || '').slice(0, 60)}</td>
                        <td>{l.tokens || '-'}</td>
                        <td>{l.responseTime ? `${(l.responseTime / 1000).toFixed(1)}s` : '-'}</td>
                        <td>{l.model || '-'}</td>
                        <td>{l.at || l.timestamp || ''}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      ) : (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-card__value">{logs.length.toLocaleString()}</span>
              <span className="stat-card__label">Total Queries</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">{(totalTokens / 1000).toFixed(1)}K</span>
              <span className="stat-card__label">Tokens</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">{logs.length > 0 ? (totalTime / logs.length / 1000).toFixed(1) : '0'}s</span>
              <span className="stat-card__label">Avg Response</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">${totalCost.toFixed(2)}</span>
              <span className="stat-card__label">Cost</span>
            </div>
          </div>
          <div className="grid-2">
            <Card title="Usage by Model">
              {loading ? (
                <p className="loading-text">Loading...</p>
              ) : Object.keys(byModel).length === 0 ? (
                <p>No data.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Queries</th>
                      <th>Tokens</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(byModel).map(([model, data]) => (
                      <tr key={model}>
                        <td>{model}</td>
                        <td>{data.queries.toLocaleString()}</td>
                        <td>{data.tokens.toLocaleString()}</td>
                        <td>${data.cost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
            <Card title="Usage by User">
              {Object.keys(byUser).length === 0 ? (
                <p>No data.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Queries</th>
                      <th>Tokens</th>
                      <th>Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(byUser)
                      .sort((a, b) => b[1].queries - a[1].queries)
                      .slice(0, 10)
                      .map(([user, data]) => (
                        <tr key={user}>
                          <td>{user}</td>
                          <td>{data.queries}</td>
                          <td>{data.tokens.toLocaleString()}</td>
                          <td>{data.lastActive}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
