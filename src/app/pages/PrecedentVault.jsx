import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';
import { Input } from '@/components/Field.jsx';
import { precedentLogic } from '@/logic/precedentLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

export default function PrecedentVault() {
  const [precedents, setPrecedents] = useState([]);
  const [stats, setStats] = useState({ totalSaved: 0, totalTags: 0, recentlyAdded: 0, favorites: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const toast = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([precedentLogic.list(), precedentLogic.stats()]).then(([p, s]) => {
      setPrecedents(Array.isArray(p) ? p : []);
      if (s && !s.error) setStats(s);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = precedents.filter((p) => !search || (p.title || '').toLowerCase().includes(search.toLowerCase()) || (p.citation || '').toLowerCase().includes(search.toLowerCase()));

  const toggleFav = async (p) => {
    await precedentLogic.update(p.id, { is_favorite: !p.is_favorite }); load();
  };

  return (
    <div>
      <PageHeader title="Precedent Vault" icon="bookmark" />
      <div className="stats-row">
        <div className="stat-card"><span className="stat-card__value">{stats.totalSaved}</span><span className="stat-card__label">Saved Precedents</span></div>
        <div className="stat-card"><span className="stat-card__value">{stats.totalTags}</span><span className="stat-card__label">Tags</span></div>
        <div className="stat-card"><span className="stat-card__value">{stats.recentlyAdded}</span><span className="stat-card__label">Recently Added</span></div>
        <div className="stat-card"><span className="stat-card__value">{stats.favorites}</span><span className="stat-card__label">Favorites</span></div>
      </div>
      <Card title="Saved Precedents">
        <div className="search-row"><Input className="search-row__input" placeholder="Search by title or citation..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        {loading ? <p className="loading-text">Loading...</p> : filtered.length === 0 ? (
          <div className="empty-state"><Icon icon="bookmark" /><p>No precedents saved yet.</p></div>
        ) : (
          <table className="data-table"><thead><tr><th>Title</th><th>Citation</th><th>Court</th><th>Date</th><th>Favorite</th></tr></thead>
            <tbody>{filtered.map((p) => (
              <tr key={p.id}><td>{p.title}</td><td>{p.citation}</td><td>{p.court}</td><td>{p.date}</td>
                <td><button className="btn-icon" onClick={() => toggleFav(p)}><Icon icon={p.is_favorite ? 'star' : 'star-outline'} /></button></td></tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
