import { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Modal from '@/components/Modal.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { Field, Input, Textarea } from '@/components/Field.jsx';
import { clientLogic } from '@/logic/clientLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

const EMPTY_FORM = { name: '', contact_person: '', email: '', phone: '', address: '', client_type: 'Individual', notes: '', status: 'Active' };

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

export default function Clients() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [d, s] = await Promise.all([clientLogic.list(), clientLogic.stats()]);
    setItems(Array.isArray(d) ? d : []);
    if (s && !s.error) setStats(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((c) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.client_type || '').toLowerCase().includes(q) ||
      (c.contact_person || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditing(null); setShowForm(true); };

  const openEdit = (c) => { setForm({ ...EMPTY_FORM, ...c }); setEditing(c); setShowForm(true); };

  const save = async () => {
    if (!form.name?.trim()) { toast.error('Name is required.'); return; }
    setSaving(true);
    const r = editing
      ? await clientLogic.update(editing.id, form)
      : await clientLogic.create(form);
    if (r && !r.error) {
      toast.success(editing ? 'Client updated.' : 'Client added.');
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      load();
    } else {
      toast.error(r?.error || 'Operation failed.');
    }
    setSaving(false);
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete client "${c.name}"?`)) return;
    const r = await clientLogic.remove(c.id);
    if (r && !r.error) { toast.success('Client removed.'); load(); }
    else toast.error(r?.error || 'Failed to remove client.');
  };

  return (
    <div className="fade-in">
      <PageHeader icon="users" title="Clients" subtitle="Manage your clients and contacts." />

      <div className="stats-row">
        <div className="stat-card"><div className="stat-card__icon"><Icon name="users" size={20} /></div><div className="stat-card__value">{stats.totalClients ?? 0}</div><div className="stat-card__label">Total Clients</div></div>
        <div className="stat-card"><div className="stat-card__icon"><Icon name="folder" size={20} /></div><div className="stat-card__value">{stats.activeMatters ?? 0}</div><div className="stat-card__label">Active Matters</div></div>
        <div className="stat-card"><div className="stat-card__icon"><Icon name="credit-card" size={20} /></div><div className="stat-card__value">{stats.pendingPayments ?? 0}</div><div className="stat-card__label">Pending Payments</div></div>
        <div className="stat-card"><div className="stat-card__icon"><Icon name="trending-up" size={20} /></div><div className="stat-card__value">{stats.newThisMonth ?? 0}</div><div className="stat-card__label">New This Month</div></div>
      </div>

      <div className="toolbar-row">
        <Input className="search-row__input" placeholder="Search by name, email, phone, type…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button onClick={openAdd}><Icon name="plus" size={15} /> Add Client</Button>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /><p className="empty-state__text">Loading clients…</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><Icon name="users" size={24} /><p>{search ? 'No clients match your search.' : 'No clients yet. Add your first client.'}</p></div>
      ) : (
        <div className="clients-grid">
          {filtered.map((c) => (
            <div key={c.id} className="client-card" onClick={() => setViewing(c)}>
              <div className="client-card__avatar" style={{ '--avatar-bg': colourFromName(c.name) }}>{initials(c.name)}</div>
              <div className="client-card__body">
                <div className="client-card__name">{c.name}</div>
                <div className="client-card__meta">
                  {c.email && <span title={c.email}>{c.email}</span>}
                  {c.phone && <span title={c.phone}>{c.phone}</span>}
                </div>
                <div className="client-card__badges">
                  <span className={`badge badge--${c.status === 'Active' ? 'green' : 'red'}`}>{c.status || 'Active'}</span>
                  <span className="badge badge--blue">{c.client_type || 'Individual'}</span>
                </div>
              </div>
              <div className="client-card__actions" onClick={(e) => e.stopPropagation()}>
                <button className="iconbtn" title="View" onClick={() => setViewing(c)}><Icon name="eye" size={15} /></button>
                <button className="iconbtn" title="Edit" onClick={() => openEdit(c)}><Icon name="edit" size={15} /></button>
                <button className="iconbtn iconbtn--danger" title="Remove" onClick={() => remove(c)}><Icon name="trash" size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal open={showForm} title={editing ? 'Edit Client' : 'Add Client'} onClose={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }} size="lg">
        <div className="grid-2">
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Client name" />
          </Field>
          <Field label="Contact Person">
            <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} placeholder="Contact person" />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" />
          </Field>
          <Field label="Client Type">
            <select className="select" value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })}>
              <option value="Individual">Individual</option>
              <option value="Firm">Firm</option>
              <option value="Company">Company</option>
              <option value="Government">Government</option>
              <option value="NGO">NGO</option>
              <option value="Other">Other</option>
            </select>
          </Field>
          <Field label="Status">
            <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </Field>
        </div>
        <Field label="Address">
          <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address…" rows={2} />
        </Field>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes…" rows={2} />
        </Field>
        <div className="modal__foot">
          <Button variant="ghost" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }} disabled={saving}>Cancel</Button>
          <Button variant="primary" icon="save" loading={saving} onClick={save}>{editing ? 'Update Client' : 'Add Client'}</Button>
        </div>
      </Modal>

      {/* View modal */}
      <Modal open={!!viewing} title={viewing?.name || 'Client'} onClose={() => setViewing(null)} size="lg">
        {viewing && (
          <div>
            <div className="client-detail__header">
              <div className="client-card__avatar client-detail__avatar" style={{ '--avatar-bg': colourFromName(viewing.name) }}>{initials(viewing.name)}</div>
              <div>
                <h2 className="m-0">{viewing.name}</h2>
                <p className="muted mt-4">{viewing.client_type || 'Individual'} · <span className={`badge badge--${viewing.status === 'Active' ? 'green' : 'red'}`}>{viewing.status || 'Active'}</span></p>
              </div>
            </div>
            <div className="grid-2 mt-20">
              {viewing.contact_person && <div><span className="client-detail__label">Contact Person</span><span>{viewing.contact_person}</span></div>}
              {viewing.email && <div><span className="client-detail__label">Email</span><span>{viewing.email}</span></div>}
              {viewing.phone && <div><span className="client-detail__label">Phone</span><span>{viewing.phone}</span></div>}
              {viewing.address && <div className="client-detail__full-width"><span className="client-detail__label">Address</span><span>{viewing.address}</span></div>}
              <div><span className="client-detail__label">Linked Cases</span><span>{viewing.linked_cases ?? 0}</span></div>
              <div><span className="client-detail__label">Payment Status</span><span>{viewing.payment_status || 'Pending'}</span></div>
            </div>
            {viewing.notes && <div className="client-detail__notes"><span className="client-detail__label">Notes</span><p className="client-detail__notes-text">{viewing.notes}</p></div>}
          </div>
        )}
        <div className="modal__foot">
          <Button variant="ghost" onClick={() => setViewing(null)}>Close</Button>
          <Button variant="primary" icon="edit" onClick={() => { const c = viewing; setViewing(null); openEdit(c); }}>Edit Client</Button>
        </div>
      </Modal>
    </div>
  );
}

