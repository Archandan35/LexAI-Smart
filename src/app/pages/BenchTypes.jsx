import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';
import { Input } from '@/components/Field.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import EntityManager from '@/components/EntityManager.jsx';
import { benchTypeLogic } from '@/logic/benchTypeLogic.js';

const TOOLBAR_BTNS = [
  { key: 'single-add', label: 'Single Add', icon: 'plus', group: 'single' },
  { key: 'single-edit', label: 'Single Edit', icon: 'edit', group: 'single' },
  { key: 'single-delete', label: 'Single Delete', icon: 'trash', group: 'single' },
  { key: 'bulk-add', label: 'Bulk Add', icon: 'users', group: 'bulk' },
  { key: 'bulk-edit', label: 'Bulk Edit', icon: 'edit', group: 'bulk' },
  { key: 'bulk-delete', label: 'Bulk Delete', icon: 'trash', group: 'bulk' },
  { key: 'import', label: 'Import', icon: 'upload', group: 'import' },
];

export default function BenchTypes() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mgrOpen, setMgrOpen] = useState(false);
  const [mgrTab, setMgrTab] = useState('single-add');

  const load = async () => {
    setLoading(true);
    const res = await benchTypeLogic.list();
    if (Array.isArray(res)) setItems(res);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openManager = (tab) => {
    setMgrTab(tab);
    setMgrOpen(true);
  };

  const filtered = items.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.short_code || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="fade-in" style={{ display: 'grid', placeItems: 'center', padding: 60 }}><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <PageHeader icon="users" title="Bench Types" subtitle="Manage bench compositions (Single Bench, Division Bench, Full Bench, etc.)." />

      <div className="em-toolbar">
        {TOOLBAR_BTNS.map((btn) => (
          <button key={btn.key} className="em-toolbar-btn" onClick={() => openManager(btn.key)}>
            <Icon name={btn.icon} size={14} />
            {btn.label}
          </button>
        ))}
        {TOOLBAR_BTNS.filter((b) => b.group === 'bulk').length > 0 && (
          <div className="em-toolbar-divider" />
        )}
      </div>

      <div className="em-search-wrap">
        <div className="datatable__search" style={{ flex: 1 }}>
          <Icon name="search" size={15} />
          <input value={search} placeholder="Search bench types…" onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card bodyClass="card__body--flush">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Code</th><th>Description</th><th>Order</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td className="court-types__empty" colSpan={5}>No bench types found.</td></tr>
            ) : filtered.map((item) => (
              <tr key={item.id}>
                <td><span style={{ fontWeight: 600 }}>{item.name}</span></td>
                <td><code>{item.short_code}</code></td>
                <td><span className="muted">{item.description || '—'}</span></td>
                <td>{item.display_order ?? '—'}</td>
                <td><span className={`badge badge--${item.status === 'Active' ? 'green' : 'grey'}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="muted" style={{ marginTop: 12, fontSize: 12.5 }}>{items.length} bench type(s) configured.</p>

      <EntityManager
        open={mgrOpen}
        onClose={() => setMgrOpen(false)}
        title="Bench Types"
        logic={benchTypeLogic}
        items={items}
        onChanged={load}
        fields={['code']}
        initialTab={mgrTab}
      />
    </div>
  );
}
