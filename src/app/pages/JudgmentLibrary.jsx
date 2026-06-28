import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';
import { judgmentsRepository } from '@/data-layer/repositories/judgmentsRepository.js';

export default function JudgmentLibrary() {
  const [judgments, setJudgments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    judgmentsRepository.getAll().then(setJudgments).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = judgments.filter((j) =>
    !search || (j.caseName || j.title || '').toLowerCase().includes(search.toLowerCase()) || (j.citation || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: judgments.length,
    supremeCourt: judgments.filter((j) => (j.court || '').toLowerCase().includes('supreme')).length,
    highCourts: judgments.filter((j) => (j.court || '').toLowerCase().includes('high')).length,
    tribunals: judgments.filter((j) => (j.court || '').toLowerCase().includes('tribunal')).length,
  };

  return (
    <div className="fade-in">
      <PageHeader icon="database" title="Judgment Library" subtitle="Browse and search archived judgments." />

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="database" size={20} /></div>
          <div className="stat-card__value">{stats.total.toLocaleString()}</div>
          <div className="stat-card__label">Total Judgments</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="shield" size={20} /></div>
          <div className="stat-card__value">{stats.supremeCourt.toLocaleString()}</div>
          <div className="stat-card__label">Supreme Court</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="layers" size={20} /></div>
          <div className="stat-card__value">{stats.highCourts.toLocaleString()}</div>
          <div className="stat-card__label">High Courts</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon"><Icon name="grid" size={20} /></div>
          <div className="stat-card__value">{stats.tribunals.toLocaleString()}</div>
          <div className="stat-card__label">Tribunals</div>
        </div>
      </div>

      <div className="datatable__search">
        <Icon name="search" size={15} />
        <input placeholder="Search by case name, citation, court…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card title="Judgments">
        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty__icon"><Icon name="database" size={24} /></div>
            <p className="muted">No judgments indexed yet.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr><th>Case Name</th><th>Court</th><th>Date</th><th>Citation</th><th>Bench</th></tr>
              </thead>
              <tbody>
                {filtered.map((j) => (
                  <tr key={j.id}>
                    <td>{j.caseName || j.title || ''}</td>
                    <td><span className="badge badge--navy">{j.court}</span></td>
                    <td>{j.date || ''}</td>
                    <td>{j.citation || ''}</td>
                    <td>{j.bench || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
