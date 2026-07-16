import { useState, useEffect } from 'react';
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
    <div className="fade-in">
      <PageHeader title={title} icon={icon} />
      {statsConfig && (
        <div className="stats-row">
          {statsConfig.map((s) => (
            <div key={s.key} className="stat-card">{s.icon && <div className="stat-card__icon"><Icon name={s.icon} size={20} /></div>}<span className="stat-card__value">{stats[s.key] ?? 0}</span><span className="stat-card__label">{s.label}</span></div>
          ))}
        </div>
      )}
      <Card bodyClass="card__body--flush">
        <div className="toolbar-row" style={{ padding: '14px 18px 0' }}>
          <Input className="search-row__input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : addLabel}</Button>
        </div>
        {showForm && <div style={{ padding: '0 18px 14px' }}>{renderForm({ load, setShowForm })}</div>}
        {loading ? <div className="loading-block"><span className="spinner" /></div> : filtered.length === 0 ? (
          <div className="empty-state"><Icon name={icon} /><p>{emptyText}</p></div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead><tr>{columns.map((col) => <th key={col.header}>{col.header}</th>)}</tr></thead>
              <tbody>{filtered.map((item) => (
                <tr key={item.id}>{columns.map((col) => <td key={col.header}>{col.render ? col.render(item) : item[col.accessor] ?? '—'}</td>)}
                  {renderRowActions && <td>{renderRowActions(item, load)}</td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

