import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';
import { courtsRepository } from '@/data-layer/repositories/courtsRepository.js';
import { casesRepository } from '@/data-layer/repositories/casesRepository.js';

export default function CourtReports() {
  const [courts, setCourts] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      courtsRepository.getAll().catch(() => []),
      casesRepository.getAll().catch(() => []),
    ]).then(([c, ca]) => {
      setCourts(Array.isArray(c) ? c : []);
      setAllCases(Array.isArray(ca) ? ca : []);
    }).finally(() => setLoading(false));
  }, []);

  const activeCourts = courts.filter((c) => c.status === 'Active').length;
  const filed = allCases.length;
  const disposed = allCases.filter((c) => c.status === 'Disposed').length;

  return (
    <div className="fade-in">
      <PageHeader icon="folder" title="Court Reports" subtitle="Court-wise case distribution and performance." />

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card__value">{activeCourts}</div>
          <div className="stat-card__label">Courts Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{filed}</div>
          <div className="stat-card__label">Cases Filed</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{disposed}</div>
          <div className="stat-card__label">Cases Disposed</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{activeCourts > 0 ? (filed / activeCourts).toFixed(1) : '0'}</div>
          <div className="stat-card__label">Avg per Court</div>
        </div>
      </div>

      <Card title="Court Statistics">
        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : courts.length === 0 ? (
          <div className="empty">
            <div className="empty__icon"><Icon name="folder" size={24} /></div>
            <p className="muted">No court data yet.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr><th>Court</th><th>Status</th><th>Cases</th></tr>
              </thead>
              <tbody>
                {courts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td><span className={`badge ${c.status === 'Active' ? 'badge--green' : 'badge--grey'}`}>{c.status}</span></td>
                    <td>{allCases.filter((ca) => ca.court === c.name).length}</td>
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
