import { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Modal from '@/components/Modal.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { Field, Input, Textarea } from '@/components/Field.jsx';
import { userLogic } from '@/logic/userLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

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
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const d = await userLogic.list();
    setAll(Array.isArray(d) ? d : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const items = useMemo(() => all.filter((u) => u.roleCode === 'advocate'), [all]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((u) =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((u) => u.status === 'Active').length,
    inactive: items.filter((u) => u.status !== 'Active').length,
  }), [items]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditing(null); setShowForm(true); };
  const openEdit = (u) => { setForm({ ...EMPTY_FORM, ...u }); setEditing(u); setShowForm(true); };

  const save = async () => {
    if (!form.name?.trim()) { toast.error('Name is required.'); return; }
    setSaving(true);
    const r = editing
      ? await userLogic.update(editing.id, { ...form, roleCode: 'advocate' })
      : await userLogic.create({ ...form, roleCode: 'advocate', password: crypto.randomUUID() });
    if (r && !r.error) {
      toast.success(editing ? 'Advocate updated.' : 'Advocate added.');
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      load();
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
      <PageHeader icon="users" title="Advocates" subtitle="Manage advocates in your practice." />

      <div className="stats-row">
        <div className="stat-card"><span className="stat-card__value">{stats.total}</span><span className="stat-card__label">Total Advocates</span></div>
        <div className="stat-card"><span className="stat-card__value">{stats.active}</span><span className="stat-card__label">Active</span></div>
        <div className="stat-card"><span className="stat-card__value">{stats.inactive}</span><span className="stat-card__label">Inactive</span></div>
      </div>

      <div className="toolbar-row">
        <Input className="search-row__input" placeholder="Search by name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button onClick={openAdd}><Icon name="plus" size={15} /> Add Advocate</Button>
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
                <button className="iconbtn" title="Edit" onClick={() => openEdit(u)}><Icon name="edit" size={15} /></button>
                <button className="iconbtn iconbtn--danger" title="Remove" onClick={() => remove(u)}><Icon name="trash" size={15} /></button>
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
          <Button variant="primary" icon="edit" onClick={() => { const u = viewing; setViewing(null); openEdit(u); }}>Edit Advocate</Button>
        </div>
      </Modal>
    </div>
  );
}
