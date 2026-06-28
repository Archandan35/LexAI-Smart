import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';
import { draftsRepository } from '@/data-layer/repositories/draftsRepository.js';

export default function VersionControl() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    draftsRepository
      .getAll()
      .then(setDrafts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const versions = (Array.isArray(drafts) ? drafts : []).map((d) => ({
    id: d.id,
    document: d.title || d.name || 'Untitled',
    version: d.version || d.updatedAt || d.updated_at || '',
    author: d.author || d.createdBy || '-',
    date: d.updatedAt || d.updated_at || d.createdAt || d.created_at || '',
    changes: d.changeDescription || d.description || '',
    status: d.status || 'Draft',
  }));

  return (
    <div>
      <PageHeader icon="history" title="Version Control" subtitle="Track revisions and document versions." />
      <Card title="Version History">
        {loading ? (
          <p className="loading-text">Loading...</p>
        ) : versions.length === 0 ? (
          <div className="empty-state">
            <Icon name="history" size={24} />
            <p>No version history yet.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Version</th>
                <th>Author</th>
                <th>Date</th>
                <th>Changes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {versions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((v) => (
                  <tr key={v.id}>
                    <td>{v.document}</td>
                    <td>
                      <span className="badge badge--info">
                        v{v.version ? String(v.version).slice(0, 8) : '1'}
                      </span>
                    </td>
                    <td>{v.author}</td>
                    <td>{v.date}</td>
                    <td>{v.changes}</td>
                    <td>
                      <span
                        className={`badge badge--${v.status === 'Published' || v.status === 'Final' ? 'success' : 'muted'}`}
                      >
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
