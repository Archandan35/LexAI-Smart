import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';
import { Input } from '@/components/Field.jsx';
import Button from '@/components/Button.jsx';

export default function CrudListPage({ title, icon, logic, searchFields, statsConfig, emptyText, addLabel, renderForm, columns, renderRowActions }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

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
      {statsConfig && (
        <div className="stats-row">
          {statsConfig.map((s) => (
            <div key={s.key} className="stat-card"><span className="stat-card__value">{stats[s.key] ?? 0}</span><span className="stat-card__label">{s.label}</span></div>
          ))}
        </div>
      )}
      <Card title={title}>
        <div className="toolbar-row">
          <Input className="search-row__input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : addLabel}</Button>
        </div>
        {showForm && renderForm({ load, setShowForm })}
        {loading ? <p className="loading-text">Loading...</p> : filtered.length === 0 ? (
          <div className="empty-state"><Icon icon={icon} /><p>{emptyText}</p></div>
        ) : (
          <table className="data-table">
            <thead><tr>{columns.map((col) => <th key={col.header}>{col.header}</th>)}</tr></thead>
            <tbody>{filtered.map((item) => (
              <tr key={item.id}>{columns.map((col) => <td key={col.header}>{col.render ? col.render(item) : item[col.accessor] ?? '—'}</td>)}
                {renderRowActions && <td>{renderRowActions(item, load)}</td>}
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
