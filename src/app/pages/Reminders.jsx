import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PermissionGate from '@/components/PermissionGate.jsx';
import Modal from '@/components/Modal.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import Badge from '@/components/Badge.jsx';
import SearchableSelect from '@/components/SearchableSelect.jsx';
import CrudManager from '@/components/CrudManager';
import { Field, Input } from '@/components/Field.jsx';
import { reminderLogic } from '@/logic/reminderLogic.js';
import { reminderTypesLogic } from '@/logic/reminderTypesLogic.js';
import { caseLogic } from '@/logic/caseLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useFormat } from '@/utils/format.js';
import { useFabAction } from '@/data-layer/FABContext.jsx';

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
  useFabAction(openAdd);

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
        <>
          <div className="bench-types__hero">
            <div className="bench-types__hero-icon"><Icon name="bell" size={34} /></div>
            <div className="bench-types__hero-text">
              <h2>Reminders</h2>
              <p>All hearing, filing, evidence & compliance deadlines.</p>
              <div className="bench-types__hero-accent" />
            </div>
            <PermissionGate module="manageCase" action="create"><Button icon="plus" onClick={openAdd} className="ml-auto">Add Reminder</Button></PermissionGate>
            <Icon name="bell" className="bench-types__hero-watermark bench-types__watermark-icon" />
          </div>

          <div className="bench-types__stats-row">
            <div className="bench-types__statcard">
              <div className="bench-types__statcard-icon bench-types__statcard-icon--total"><Icon name="bell" size={16} /></div>
              <div className="bench-types__statcard-body">
                <div className="bench-types__statcard-label">Total</div>
                <div className="bench-types__statcard-value">{stats.total}</div>
                <div className="bench-types__statcard-sub">All reminders</div>
              </div>
            </div>
            <div className="bench-types__statcard">
              <div className="bench-types__statcard-icon bench-types__statcard-icon--active"><Icon name="clock" size={16} /></div>
              <div className="bench-types__statcard-body">
                <div className="bench-types__statcard-label">Pending</div>
                <div className="bench-types__statcard-value">{stats.pending}</div>
                <div className="bench-types__statcard-sub">Awaiting action</div>
              </div>
            </div>
            <div className="bench-types__statcard">
              <div className="bench-types__statcard-icon bench-types__statcard-icon--inactive"><Icon name="alert" size={16} /></div>
              <div className="bench-types__statcard-body">
                <div className="bench-types__statcard-label">Overdue</div>
                <div className="bench-types__statcard-value bench-types__statcard-value--sm">{stats.overdue}</div>
                <div className="bench-types__statcard-sub">Past due date</div>
              </div>
            </div>
            <div className="bench-types__statcard">
              <div className="bench-types__statcard-icon bench-types__statcard-icon--most-used"><Icon name="check-circle" size={16} /></div>
              <div className="bench-types__statcard-body">
                <div className="bench-types__statcard-label">Done</div>
                <div className="bench-types__statcard-value bench-types__statcard-value--sm">{stats.done}</div>
                <div className="bench-types__statcard-sub">Completed</div>
              </div>
            </div>
            <div className="bench-types__statcard">
              <div className="bench-types__statcard-icon bench-types__statcard-icon--created-month"><Icon name="calendar" size={16} /></div>
              <div className="bench-types__statcard-body">
                <div className="bench-types__statcard-label">Due Today</div>
                <div className="bench-types__statcard-value bench-types__statcard-value--sm">{items.filter(r => !r.done && dayDiff(r.date) === 0).length}</div>
                <div className="bench-types__statcard-sub">Due today</div>
              </div>
            </div>
            <div className="bench-types__statcard">
              <div className="bench-types__statcard-icon bench-types__statcard-icon--assignments"><Icon name="layers" size={16} /></div>
              <div className="bench-types__statcard-body">
                <div className="bench-types__statcard-label">Due This Week</div>
                <div className="bench-types__statcard-value bench-types__statcard-value--sm">{items.filter(r => !r.done && dayDiff(r.date) >= 0 && dayDiff(r.date) <= 7).length}</div>
                <div className="bench-types__statcard-sub">Next 7 days</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="bench-types__hero mb-20">
            <div className="bench-types__hero-icon"><Icon name="bell" size={34} /></div>
            <div className="bench-types__hero-text">
              <h2>Reminders</h2>
              <p>All hearing, filing, evidence & compliance deadlines.</p>
              <div className="bench-types__hero-accent" />
              <PermissionGate module="manageCase" action="create"><Button icon="plus" onClick={openAdd}>Add Reminder</Button></PermissionGate>
            </div>
            <Icon name="bell" className="bench-types__hero-watermark bench-types__watermark-icon" />
          </div>

          <div className="bench-types__stat-cards bench-types__mobile-only mb-18">
            <div className="bench-types__stat-card bench-types__stat-card--total">
              <div className="bench-types__stat-card-row1">
                <div className="bench-types__stat-card-icon"><Icon name="bell" size={18} /></div>
                <span className="bench-types__stat-card-num">{stats.total}</span>
              </div>
              <div className="bench-types__stat-card-label">TOTAL</div>
            </div>
            <div className="bench-types__stat-card bench-types__stat-card--active">
              <div className="bench-types__stat-card-row1">
                <div className="bench-types__stat-card-icon"><Icon name="clock" size={18} /></div>
                <span className="bench-types__stat-card-num">{stats.pending}</span>
              </div>
              <div className="bench-types__stat-card-label">PENDING</div>
            </div>
            <div className="bench-types__stat-card bench-types__stat-card--inactive">
              <div className="bench-types__stat-card-row1">
                <div className="bench-types__stat-card-icon"><Icon name="alert" size={18} /></div>
                <span className="bench-types__stat-card-num">{stats.overdue}</span>
              </div>
              <div className="bench-types__stat-card-label">OVERDUE</div>
            </div>
          </div>
        </>
      )}

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
                <PermissionGate module="manageCase" action="edit"><button className="iconbtn" title={r.done ? 'Mark pending' : 'Mark done'} onClick={() => toggle(r)}>
                  <Icon name={r.done ? 'check' : 'clock'} size={15} />
                </button></PermissionGate>
                <div className={`reminder-row__content${r.caseId ? ' reminder-row__content--link' : ''}`} onClick={() => r.caseId && nav(`/cases/${r.caseId}`)}>
                  <div className="reminder-row__title">{r.title}</div>
                  <div className="list-row__meta">{r.type}{c ? ` · ${caseLabel(c)}` : ''} · {formatDate(r.date)}</div>
                </div>
                <Badge tone={tone}>{when}</Badge>
                <PermissionGate module="manageCase" action="delete"><button className="iconbtn iconbtn--danger" title="Delete" onClick={() => remove(r)}><Icon name="trash" size={14} /></button></PermissionGate>
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

      <CrudManager open={typeMgr} onClose={() => { setTypeMgr(false); loadTypes(); }} entity="Reminder Type"         config={{ logic: reminderTypesLogic, fields: [{ key: 'name', label: 'Reminder Type Name', placeholder: 'e.g., Hearing Date' }], defaults: {}, refresh: loadTypes }} />

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
