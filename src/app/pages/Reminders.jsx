import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageHeader from '@/components/PageHeader.jsx';
import Modal from '@/components/Modal.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import Badge from '@/components/Badge.jsx';
import SearchableSelect from '@/components/SearchableSelect.jsx';
import CrudManager from '@/components/CrudManager.jsx';
import { Field, Input } from '@/components/Field.jsx';
import { reminderLogic } from '@/logic/reminderLogic.js';
import { reminderTypesLogic } from '@/logic/reminderTypesLogic.js';
import { caseLogic } from '@/logic/caseLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useFormat } from '@/utils/format.js';

const EMPTY_FORM = { title: '', type: '', caseId: '', date: '' };

function dayDiff(date) {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function caseLabel(c) {
  return c?.case_display_number || c?.caseNumber || c?.case_number || c?.title || c?.id;
}

export default function Reminders() {
  const { formatDate } = useFormat();
  const toast = useToast();
  const { user } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 991px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    handler(mql);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const [items, setItems] = useState([]);
  const [cases, setCases] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [typeMgr, setTypeMgr] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [rows, cs] = await Promise.all([reminderLogic.list(), caseLogic.list()]);
    setItems(Array.isArray(rows) ? rows : []);
    setCases(Array.isArray(cs) ? cs : []);
    setLoading(false);
  }, []);

  const loadTypes = useCallback(async () => {
    const rows = await reminderTypesLogic.list();
    setTypeOptions(Array.isArray(rows) ? rows.map((r) => r.name).filter(Boolean) : []);
  }, []);

  useEffect(() => { load(); loadTypes(); }, [load, loadTypes]);

  useEffect(() => {
    if (location.state?.addReminder) {
      openAdd();
      nav(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const caseMap = useMemo(() => {
    const m = new Map();
    cases.forEach((c) => m.set(c.id, c));
    return m;
  }, [cases]);

  const caseOptions = useMemo(() => cases.map((c) => ({ value: c.id, label: caseLabel(c) })), [cases]);

  const stats = useMemo(() => {
    let pending = 0; let overdue = 0; let done = 0;
    items.forEach((r) => {
      if (r.done) { done += 1; return; }
      if (dayDiff(r.date) < 0) overdue += 1; else pending += 1;
    });
    return { total: items.length, pending, overdue, done };
  }, [items]);

  const filtered = useMemo(() => {
    let rows = items;
    if (filter === 'pending') rows = rows.filter((r) => !r.done && dayDiff(r.date) >= 0);
    else if (filter === 'overdue') rows = rows.filter((r) => !r.done && dayDiff(r.date) < 0);
    else if (filter === 'done') rows = rows.filter((r) => r.done);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.type || '').toLowerCase().includes(q) ||
        caseLabel(caseMap.get(r.caseId)).toString().toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [items, filter, search, caseMap]);

  const openAdd = () => { setForm(EMPTY_FORM); setOpen(true); };

  const save = async () => {
    if (!form.title?.trim()) { toast.error('Title is required.'); return; }
    if (!form.caseId) { toast.error('Please select a case.'); return; }
    if (!form.date) { toast.error('A date is required.'); return; }
    setSaving(true);
    const res = await reminderLogic.add(form.caseId, form, user);
    if (res.ok) {
      toast.success('Reminder added.');
      setOpen(false);
      setForm(EMPTY_FORM);
      load();
    } else toast.error(res.error || 'Failed to add reminder.');
    setSaving(false);
  };

  const toggle = async (r) => { await reminderLogic.toggle(r); load(); };
  const remove = async (r) => { if (window.confirm('Delete this reminder?')) { await reminderLogic.remove(r.id); load(); } };

  return (
    <div className="fade-in">
      {!isMobile ? (
        <PageHeader icon="bell" title="Reminders" subtitle="All hearing, filing, evidence & compliance deadlines."
          actions={<Button onClick={openAdd}><Icon name="plus" size={15} /> Add Reminder</Button>} />
      ) : (
        <div className="cl-header">
          <div className="cl-header__left">
            <div className="cl-header__icon"><Icon name="bell" size={22} /></div>
            <div>
              <div className="cl-header__title">Reminders</div>
              <div className="cl-header__sub">All hearing, filing, evidence & compliance deadlines.</div>
            </div>
          </div>
          <button className="cl-header__add" type="button" onClick={openAdd}>
            <Icon name="plus" size={15} /> Add
          </button>
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card"><div className="stat-card__icon"><Icon name="bell" size={20} /></div><div className="stat-card__value">{stats.total}</div><div className="stat-card__label">Total</div></div>
        <div className="stat-card"><div className="stat-card__icon"><Icon name="clock" size={20} /></div><div className="stat-card__value">{stats.pending}</div><div className="stat-card__label">Pending</div></div>
        <div className="stat-card"><div className="stat-card__icon"><Icon name="alert" size={20} /></div><div className="stat-card__value">{stats.overdue}</div><div className="stat-card__label">Overdue</div></div>
        <div className="stat-card"><div className="stat-card__icon"><Icon name="check-circle" size={20} /></div><div className="stat-card__value">{stats.done}</div><div className="stat-card__label">Done</div></div>
      </div>

      <div className="toolbar-row">
        <Input className="search-row__input" placeholder="Search by title, type or case…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="done">Done</option>
        </select>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /><p className="empty-state__text">Loading reminders…</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><Icon name="bell" size={24} /><p>{search || filter !== 'all' ? 'No reminders match your filter.' : 'No reminders yet. Add your first reminder.'}</p></div>
      ) : (
        <div className="reminder-list">
          {filtered.map((r) => {
            const diff = dayDiff(r.date);
            const tone = r.done ? 'grey' : diff < 0 ? 'red' : diff <= 2 ? 'amber' : 'navy';
            const when = r.done ? 'done' : diff < 0 ? `overdue ${-diff}d` : diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : `in ${diff}d`;
            const c = caseMap.get(r.caseId);
            return (
              <div key={r.id} className={`reminder-row ${r.done ? 'reminder-row--done' : ''}`}>
                <button className="iconbtn" title={r.done ? 'Mark pending' : 'Mark done'} onClick={() => toggle(r)}>
                  <Icon name={r.done ? 'check' : 'clock'} size={15} />
                </button>
                <div className={`reminder-row__content${r.caseId ? ' reminder-row__content--link' : ''}`} onClick={() => r.caseId && nav(`/cases/${r.caseId}`)}>
                  <div className="reminder-row__title">{r.title}</div>
                  <div className="list-row__meta">{r.type}{c ? ` · ${caseLabel(c)}` : ''} · {formatDate(r.date)}</div>
                </div>
                <Badge tone={tone}>{when}</Badge>
                <button className="iconbtn iconbtn--danger" title="Delete" onClick={() => remove(r)}><Icon name="trash" size={14} /></button>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} title="Add Reminder" onClose={() => setOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button icon="save" loading={saving} onClick={save}>Add</Button></>}>
        <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. File written statement" autoFocus /></Field>
        <Field label="Type">
          <div className="reminder-form__type-row">
            <select className="select reminder-form__type-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="">Select type…</option>
              {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="button" className="btn btn--ghost btn--sm" title="Manage reminder types" onClick={() => setTypeMgr(true)}><Icon name="gear" size={15} /></button>
          </div>
        </Field>
        <Field label="Case" required>
          <SearchableSelect value={form.caseId} onChange={(e) => setForm({ ...form, caseId: e.target.value })} options={caseOptions} placeholder="Select case…" />
        </Field>
        <Field label="Date" required><Input type="date" placeholder="dd-mm-yyyy" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
      </Modal>

      <CrudManager open={typeMgr} onClose={() => { setTypeMgr(false); loadTypes(); }} entity="Reminder Type" config={{ logic: reminderTypesLogic, fields: [{ key: 'name', label: 'Reminder Type Name', placeholder: 'e.g., Hearing Date' }, { key: 'description', label: 'Description', placeholder: 'Optional description' }], defaults: {}, refresh: loadTypes }} />
    </div>
  );
}
