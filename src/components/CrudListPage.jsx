import { useState, useEffect } from 'react';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { Input } from '@/components/Field.jsx';
import PermissionGate from '@/components/PermissionGate.jsx';

export default function CrudListPage({ title, icon, logic, searchFields, statsConfig, emptyText, addLabel, renderForm, columns, renderRowActions, module, actionCreate = 'create', actionDelete = 'delete' }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 991px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    handler(mql);
    return () => mql.removeEventListener('change', handler);
  }, []);

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
      {!isMobile ? (
        <>
          <div className="bench-types__hero">
            <div className="bench-types__hero-icon"><Icon name={icon} size={34} /></div>
            <div className="bench-types__hero-text">
              <h2>{title}</h2>
              <div className="bench-types__hero-accent" />
            </div>
            <PermissionGate module={module} action={actionCreate}><Button icon="plus" onClick={() => setShowForm(!showForm)} style={{ marginLeft: 'auto' }}>{addLabel}</Button></PermissionGate>
            <Icon name={icon} className="bench-types__hero-watermark bench-types__watermark-icon" />
          </div>

          {statsConfig && (
            <div className="bench-types__stats-row">
              {statsConfig.map((s) => (
                <div key={s.key} className="bench-types__statcard">
                  <div className={`bench-types__statcard-icon ${s.iconClass || 'bench-types__statcard-icon--total'}`}>{s.icon && <Icon name={s.icon} size={16} />}</div>
                  <div className="bench-types__statcard-body">
                    <div className="bench-types__statcard-label">{s.label}</div>
                    <div className="bench-types__statcard-value">{stats[s.key] ?? 0}</div>
                    {s.sub && <div className="bench-types__statcard-sub">{s.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="bench-types__hero" style={{ margin: '0 0 20px' }}>
            <div className="bench-types__hero-icon"><Icon name={icon} size={34} /></div>
            <div className="bench-types__hero-text">
              <h2>{title}</h2>
              <div className="bench-types__hero-accent" />
              <PermissionGate module={module} action={actionCreate}><Button icon="plus" onClick={() => setShowForm(!showForm)}>{addLabel}</Button></PermissionGate>
            </div>
            <Icon name={icon} className="bench-types__hero-watermark bench-types__watermark-icon" />
          </div>

          {statsConfig && (
            <div className="bench-types__stat-cards bench-types__mobile-only" style={{ margin: '0 0 18px' }}>
              {statsConfig.slice(0, 3).map((s) => (
                <div key={s.key} className={`bench-types__stat-card bench-types__stat-card--${s.mobileColor || 'total'}`}>
                  <div className="bench-types__stat-card-row1">
                    <div className="bench-types__stat-card-icon"><Icon name={s.icon} size={18} /></div>
                    <span className="bench-types__stat-card-num">{stats[s.key] ?? 0}</span>
                  </div>
                  <div className="bench-types__stat-card-label">{s.label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Card bodyClass="card__body--flush">
        <div className="toolbar-row crud-toolbar">
          <Input className="search-row__input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <PermissionGate module={module} action={actionCreate}><Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : addLabel}</Button></PermissionGate>
        </div>
        {showForm && <div className="crud-form-wrap">{renderForm({ load, setShowForm })}</div>}
        {loading ? <div className="loading-block"><span className="spinner" /></div> : filtered.length === 0 ? (
          <div className="empty-state"><Icon name={icon} /><p>{emptyText}</p></div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead><tr>{columns.map((col) => <th key={col.header}>{col.header}</th>)}</tr></thead>
              <tbody>{filtered.map((item) => (
                <tr key={item.id}>{columns.map((col) => <td key={col.header}>{col.render ? col.render(item) : item[col.accessor] ?? '—'}</td>)}
                  {renderRowActions && <td><PermissionGate module={module} action={actionDelete}>{renderRowActions(item, load)}</PermissionGate></td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>

      <nav className="bench-types__bottom-nav bench-types__mobile-only">
        <button className="bench-types__nav-tab bench-types__nav-tab--active">
          <Icon name="home" size={20} />
          <span>Dashboard</span>
        </button>
        <button className="bench-types__nav-tab">
          <Icon name="briefcase" size={20} />
          <span>Matters</span>
        </button>
        <button className="bench-types__nav-fab">
          <Icon name="plus" size={24} />
        </button>
        <button className="bench-types__nav-tab">
          <Icon name="file" size={20} />
          <span>Order Sheet</span>
        </button>
        <button className="bench-types__nav-tab">
          <Icon name="calendar" size={20} />
          <span>Calendar</span>
        </button>
      </nav>
    </div>
  );
}
