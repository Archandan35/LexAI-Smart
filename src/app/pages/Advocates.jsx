import { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/Modal.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { Field, Input, Textarea } from '@/components/Field.jsx';
import { userLogic } from '@/logic/userLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import FilterPopup from '@/components/FilterPopup.jsx';
import PermissionGate from '@/components/PermissionGate.jsx';

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', status: 'Active' };

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function colourFromName(name) {
  if (!name) return '#6366f1';
  const colours = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colours[Math.abs(hash) % colours.length];
}

export default function Advocates() {
  const toast = useToast();
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [tempAdFilters, setTempAdFilters] = useState({ status: [] });
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 991px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    handler(mql);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const adFilterCategories = [
    { key: 'status', label: 'Status' },
  ];
  const adFilterOptions = {
    status: [
      { value: 'Active', label: 'Active' },
      { value: 'Inactive', label: 'Inactive' },
    ],
  };

  const handleOpenAdFilter = () => {
    setTempAdFilters({ status: filterStatus ? [filterStatus] : [] });
    setShowFilterPopup(true);
  };
  const handleTempAdFilterChange = (key, values) => setTempAdFilters((prev) => ({ ...prev, [key]: values }));
  const handleApplyAdFilters = () => {
    setFilterStatus(tempAdFilters.status[0] || '');
    setShowFilterPopup(false);
  };
  const handleClearAdFilters = () => { setTempAdFilters({ status: [] }); };

  const load = async () => {
    setLoading(true);
    const d = await userLogic.list();
    setAll(Array.isArray(d) ? d : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const items = useMemo(() => all.filter((u) => u.roleCode === 'advocate'), [all]);

  const filtered = useMemo(() => {
    let rows = items;
    const q = search.toLowerCase();
    if (q) rows = rows.filter((u) =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
    if (filterStatus) rows = rows.filter((u) => u.status === filterStatus);
    return rows;
  }, [items, search, filterStatus]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((u) => u.status === 'Active').length,
    inactive: items.filter((u) => u.status !== 'Active').length,
  }), [items]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditing(null); setShowForm(true); };
  const openEdit = (u) => { setForm({ ...EMPTY_FORM, ...u }); setEditing(u); setShowForm(true); };

  const [showPassword, setShowPassword] = useState(null);

  const save = async () => {
    if (!form.name?.trim()) { toast.error('Name is required.'); return; }
    setSaving(true);
    const generatedPw = crypto.randomUUID();
    const r = editing
      ? await userLogic.update(editing.id, { ...form, roleCode: 'advocate' })
      : await userLogic.create({ ...form, roleCode: 'advocate', password: generatedPw });
    if (r && !r.error) {
      toast.success(editing ? 'Advocate updated.' : 'Advocate added.');
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      load();
      if (!editing) setShowPassword(generatedPw);
    } else {
      toast.error(r?.error || 'Operation failed.');
    }
    setSaving(false);
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete advocate "${u.name}"?`)) return;
    const r = await userLogic.remove(u.id);
    if (r && !r.error) { toast.success('Advocate removed.'); load(); }
    else toast.error(r?.error || 'Failed to remove advocate.');
  };

  return (
    <div className="fade-in">
      {!isMobile ? (
        <>
          <div className="bench-types__hero">
            <div className="bench-types__hero-icon"><Icon name="users" size={34} /></div>
            <div className="bench-types__hero-text">
              <h2>Advocates</h2>
              <p>Manage advocates in your practice.</p>
              <div className="bench-types__hero-accent" />
            </div>
            <PermissionGate module="advocates" action="create">
              <Button icon="plus" onClick={openAdd} className="ml-auto">Add Advocate</Button>
            </PermissionGate>
            <Icon name="users" className="bench-types__hero-watermark bench-types__watermark-icon" />
          </div>

          <div className="bench-types__stats-row">
            <div className="bench-types__statcard">
              <div className="bench-types__statcard-icon bench-types__statcard-icon--total"><Icon name="users" size={16} /></div>
              <div className="bench-types__statcard-body">
                <div className="bench-types__statcard-label">Total Advocates</div>
                <div className="bench-types__statcard-value">{stats.total}</div>
                <div className="bench-types__statcard-sub">All advocates</div>
              </div>
            </div>
            <div className="bench-types__statcard">
              <div className="bench-types__statcard-icon bench-types__statcard-icon--active"><Icon name="check-circle" size={16} /></div>
              <div className="bench-types__statcard-body">
                <div className="bench-types__statcard-label">Active</div>
                <div className="bench-types__statcard-value">{stats.active}</div>
                <div className="bench-types__statcard-sub">Currently active</div>
              </div>
            </div>
            <div className="bench-types__statcard">
              <div className="bench-types__statcard-icon bench-types__statcard-icon--inactive"><Icon name="ban" size={16} /></div>
              <div className="bench-types__statcard-body">
                <div className="bench-types__statcard-label">Inactive</div>
                <div className="bench-types__statcard-value bench-types__statcard-value--sm">{stats.inactive}</div>
                <div className="bench-types__statcard-sub">Not active</div>
              </div>
            </div>
            <div className="bench-types__statcard">
              <div className="bench-types__statcard-icon bench-types__statcard-icon--most-used"><Icon name="mail" size={16} /></div>
              <div className="bench-types__statcard-body">
                <div className="bench-types__statcard-label">With Email</div>
                <div className="bench-types__statcard-value bench-types__statcard-value--sm">{items.filter(u => u.email).length}</div>
                <div className="bench-types__statcard-sub">Has email address</div>
              </div>
            </div>
            <div className="bench-types__statcard">
              <div className="bench-types__statcard-icon bench-types__statcard-icon--created-month"><Icon name="phone" size={16} /></div>
              <div className="bench-types__statcard-body">
                <div className="bench-types__statcard-label">With Phone</div>
                <div className="bench-types__statcard-value bench-types__statcard-value--sm">{items.filter(u => u.phone).length}</div>
                <div className="bench-types__statcard-sub">Has phone number</div>
              </div>
            </div>
            <div className="bench-types__statcard">
              <div className="bench-types__statcard-icon bench-types__statcard-icon--assignments"><Icon name="briefcase" size={16} /></div>
              <div className="bench-types__statcard-body">
                <div className="bench-types__statcard-label">Assignments</div>
                <div className="bench-types__statcard-value bench-types__statcard-value--sm">—</div>
                <div className="bench-types__statcard-sub">Case assignments</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="bench-types__hero mb-20">
            <div className="bench-types__hero-icon"><Icon name="users" size={34} /></div>
            <div className="bench-types__hero-text">
              <h2>Advocates</h2>
              <p>Manage advocates in your practice.</p>
              <div className="bench-types__hero-accent" />
              <PermissionGate module="advocates" action="create">
                <Button icon="plus" onClick={openAdd}>Add Advocate</Button>
              </PermissionGate>
            </div>
            <Icon name="users" className="bench-types__hero-watermark bench-types__watermark-icon" />
          </div>

          <div className="bench-types__stat-cards bench-types__mobile-only mb-18">
            <div className="bench-types__stat-card bench-types__stat-card--total">
              <div className="bench-types__stat-card-row1">
                <div className="bench-types__stat-card-icon"><Icon name="users" size={18} /></div>
                <span className="bench-types__stat-card-num">{stats.total}</span>
              </div>
              <div className="bench-types__stat-card-label">TOTAL</div>
            </div>
            <div className="bench-types__stat-card bench-types__stat-card--active">
              <div className="bench-types__stat-card-row1">
                <div className="bench-types__stat-card-icon"><Icon name="check-circle" size={18} /></div>
                <span className="bench-types__stat-card-num">{stats.active}</span>
              </div>
              <div className="bench-types__stat-card-label">ACTIVE</div>
            </div>
            <div className="bench-types__stat-card bench-types__stat-card--inactive">
              <div className="bench-types__stat-card-row1">
                <div className="bench-types__stat-card-icon"><Icon name="ban" size={18} /></div>
                <span className="bench-types__stat-card-num">{stats.inactive}</span>
              </div>
              <div className="bench-types__stat-card-label">INACTIVE</div>
            </div>
          </div>
        </>
      )}

      <div className="toolbar-row">
        <Input className="search-row__input" placeholder="Search by name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button variant="ghost" icon="filter" className="jl-filter-btn" onClick={handleOpenAdFilter}>
          {filterStatus ? `Filter (1)` : 'Filter'}
        </Button>
        <PermissionGate module="advocates" action="create">
          <Button onClick={openAdd}><Icon name="plus" size={15} /> Add Advocate</Button>
        </PermissionGate>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /><p className="empty-state__text">Loading advocates...</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><Icon name="users" size={24} /><p>{search ? 'No advocates match your search.' : 'No advocates yet. Add your first advocate.'}</p></div>
      ) : (
        <div className="clients-grid">
          {filtered.map((u) => (
            <div key={u.id} className="client-card" onClick={() => setViewing(u)}>
              <div className="client-card__avatar" style={{ '--avatar-bg': colourFromName(u.name) }}>{initials(u.name)}</div>
              <div className="client-card__body">
                <div className="client-card__name">{u.name}</div>
                <div className="client-card__meta">
                  {u.email && <span title={u.email}>{u.email}</span>}
                  {u.phone && <span title={u.phone}>{u.phone}</span>}
                </div>
                <div className="client-card__badges">
                  <span className={`badge badge--${u.status === 'Active' ? 'green' : 'red'}`}>{u.status || 'Active'}</span>
                </div>
              </div>
              <div className="client-card__actions" onClick={(e) => e.stopPropagation()}>
                <button className="iconbtn" title="View" onClick={() => setViewing(u)}><Icon name="eye" size={15} /></button>
                <PermissionGate module="advocates" action="edit">
                  <button className="iconbtn" title="Edit" onClick={() => openEdit(u)}><Icon name="edit" size={15} /></button>
                </PermissionGate>
                <PermissionGate module="advocates" action="delete">
                  <button className="iconbtn iconbtn--danger" title="Remove" onClick={() => remove(u)}><Icon name="trash" size={15} /></button>
                </PermissionGate>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal open={showForm} title={editing ? 'Edit Advocate' : 'Add Advocate'} onClose={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }} size="lg">
        <div className="grid-2">
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Advocate name" />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" />
          </Field>
          <Field label="Status">
            <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </Field>

        </div>
        <Field label="Address">
          <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address..." rows={2} />
        </Field>
        <div className="modal__foot">
          <Button variant="ghost" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }} disabled={saving}>Cancel</Button>
          <Button variant="primary" icon="save" loading={saving} onClick={save}>{editing ? 'Update Advocate' : 'Add Advocate'}</Button>
        </div>
      </Modal>

      {/* View modal */}
      <Modal open={!!viewing} title={viewing?.name || 'Advocate'} onClose={() => setViewing(null)} size="lg">
        {viewing && (
          <div>
            <div className="client-detail__header">
              <div className="client-card__avatar client-detail__avatar" style={{ '--avatar-bg': colourFromName(viewing.name) }}>{initials(viewing.name)}</div>
              <div>
                <h2 className="m-0">{viewing.name}</h2>
                <p className="muted mt-4"><span className={`badge badge--${viewing.status === 'Active' ? 'green' : 'red'}`}>{viewing.status || 'Active'}</span></p>
              </div>
            </div>
            <div className="grid-2 mt-20">
              {viewing.email && <div><span className="client-detail__label">Email</span><span>{viewing.email}</span></div>}
              {viewing.phone && <div><span className="client-detail__label">Phone</span><span>{viewing.phone}</span></div>}
              {viewing.address && <div className="client-detail__full-width"><span className="client-detail__label">Address</span><span>{viewing.address}</span></div>}
            </div>
          </div>
        )}
        <div className="modal__foot">
          <Button variant="ghost" onClick={() => setViewing(null)}>Close</Button>
          <PermissionGate module="advocates" action="edit">
            <Button variant="primary" icon="edit" onClick={() => { const u = viewing; setViewing(null); openEdit(u); }}>Edit Advocate</Button>
          </PermissionGate>
        </div>
      </Modal>

      {/* Password created notification */}
      <Modal open={!!showPassword} title="Advocate Created" onClose={() => setShowPassword(null)} size="sm">
        <div className="confirm-dialog">
          <span className="confirm-dialog__icon confirm-dialog__icon--success"><Icon name="check" size={20} /></span>
          <div>
            <div className="confirm-dialog__title">Share these credentials with the advocate</div>
            <div className="confirm-dialog__text">The account was created with a system-generated password. Share it securely — the advocate should change it after first login.</div>
            <div className="mt-16" style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
              <div className="kv"><span>Password</span><code style={{ fontSize: '1.1em', userSelect: 'all' }}>{showPassword}</code></div>
            </div>
            <div className="mt-16">
              <Button variant="primary" className="btn--block" icon="copy" onClick={() => { navigator.clipboard.writeText(showPassword).then(() => toast.success('Password copied.')).catch(() => {}); }}>
                Copy password
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <FilterPopup
        open={showFilterPopup}
        onClose={() => setShowFilterPopup(false)}
        categories={adFilterCategories}
        options={adFilterOptions}
        tempFilters={tempAdFilters}
        onTempFilterChange={handleTempAdFilterChange}
        onApply={handleApplyAdFilters}
        onClearAll={handleClearAdFilters}
      />

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
