import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';
import { Input } from '@/components/Field.jsx';

function defaultRender(item, col) {
  const v = col.accessor ? item[col.accessor] : null;
  if (col.render) return col.render(v, item);
  if (col.badge) return <span className={`badge badge--${col.badge}`}>{v ?? '—'}</span>;
  return v ?? '—';
}

export default function LibraryPage({ title, icon, logic, searchFields, columns, statsConfig, renderStats, searchPlaceholder = 'Search...', emptyText = 'No items found.', emptyIcon }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([logic.list(), logic.stats()]).then(([d, s]) => {
      setItems(Array.isArray(d) ? d : []);
      if (s && !s.error) setStats(s);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return searchFields.some((f) => (item[f] || '').toLowerCase().includes(q));
  });

  return (
    <div>
      <PageHeader title={title} icon={icon} />
      {renderStats ? renderStats(stats) : statsConfig && (
        <div className="stats-row">
          {statsConfig.map((s) => (
            <div key={s.key} className="stat-card"><span className="stat-card__value">{stats[s.key] ?? 0}</span><span className="stat-card__label">{s.label}</span></div>
          ))}
        </div>
      )}
      <Card title={title}>
        <div className="search-row"><Input className="search-row__input" placeholder={searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        {loading ? <p className="loading-text">Loading...</p> : filtered.length === 0 ? (
          <div className="empty-state"><Icon icon={emptyIcon || icon || 'grid'} /><p>{emptyText}</p></div>
        ) : (
          <table className="data-table">
            <thead><tr>{columns.map((col) => <th key={col.header}>{col.header}</th>)}</tr></thead>
            <tbody>{filtered.map((item) => (
              <tr key={item.id}>{columns.map((col) => <td key={col.header}>{defaultRender(item, col)}</td>)}</tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
