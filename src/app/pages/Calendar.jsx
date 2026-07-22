import { useState, useEffect, useMemo, useCallback } from 'react';
import PermissionGate from '@/components/PermissionGate.jsx';
import Toggle from '@/components/Toggle.jsx';

// Light tint of a hex color for event backgrounds.
const _tintCache = {};
function tint(hex) {
  if (!hex) return 'rgba(107,114,128,0.12)';
  if (_tintCache[hex]) return _tintCache[hex];
  const h = hex.replace('#', '');
  if (h.length !== 6) { _tintCache[hex] = 'rgba(107,114,128,0.12)'; return _tintCache[hex]; }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const out = `rgba(${r}, ${g}, ${b}, 0.12)`;
  _tintCache[hex] = out;
  return out;
}
import Card from '@/components/Card.jsx';
import Modal from '@/components/Modal.jsx';
import Icon from '@/components/Icon.jsx';
import Badge from '@/components/Badge.jsx';
import Button from '@/components/Button.jsx';
import ColorPicker from '@/components/ColorPicker.jsx';
import { Input, Textarea, Select } from '@/components/Field.jsx';
import DateInput from '@/components/DateInput.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import DataTable from '@/components/DataTable.jsx';
import ConfirmDialog from '@/components/setup/wizard/ConfirmDialog.jsx';
import CrudManager from '@/components/CrudManager';
import FilterPopup from '@/components/FilterPopup.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useFabAction } from '@/data-layer/FABContext.jsx';
import { useFormat } from '@/utils/format.js';
import { escapeHtml } from '@/utils/sanitize.js';
import { calendarLogic } from '@/logic/calendarLogic.js';
import { taskLogic } from '@/logic/taskLogic.js';
import { priorityLogic } from '@/logic/priorityLogic.js';
import { caseStatusLogic } from '@/logic/caseStatusLogic.js';
import { taskCategoryLogic } from '@/logic/taskCategoryLogic.js';
import { taskStatusLogic } from '@/logic/taskStatusLogic.js';

const REF_CACHE_TTL = 300_000;
let refCache = {};
let refCacheTs = 0;

async function cachedRef(name, fn) {
  if (refCache[name] && Date.now() - refCacheTs < REF_CACHE_TTL) return refCache[name];
  const data = await fn();
  refCache[name] = data;
  refCacheTs = Date.now();
  return data;
}

const TABS = ['calendar', 'tasks'];

/* ---------- helpers ---------- */
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function sameDay(a, b) { return a && b && startOfDay(a).getTime() === startOfDay(b).getTime(); }
function fmtTime(t) { if (!t) return ''; const m = /^(\d{1,2}):(\d{2})/.exec(t); if (!m) return t; let h = +m[1]; const min = m[2]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${min} ${ap}`; }
function dayKey(d) { const x = startOfDay(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; }
function weekStart(d) { const x = startOfDay(d); const day = x.getDay(); const diff = (day === 0 ? -6 : 1 - day); return addDays(x, diff); }
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ---------- main page ---------- */
export default function Calendar() {
  const toast = useToast();
  const { user } = useAuth();
  const { formatDate, formatDateTime } = useFormat();
  const [tab, setTab] = useState('calendar');

  /* shared event data */
  const [loading, setLoading] = useState(true);
  const [hearings, setHearings] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [cases, setCases] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [caseStatuses, setCaseStatuses] = useState([]);

  const refreshTasks = useCallback(() => {
    taskLogic.list().then((r) => setTasks(r.ok ? (r.data || []) : [])).catch(() => {});
    calendarLogic.getCases().then((r) => setCases(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);

  const loadAll = useCallback((bypassCache = false) => {
    setLoading(true);
    const orCached = (name, fn) => bypassCache ? fn() : cachedRef(name, fn);
    Promise.all([
      calendarLogic.getHearings().then((r) => Array.isArray(r) ? r : []).catch(() => []),
      calendarLogic.getReminders().then((r) => Array.isArray(r) ? r : []).catch(() => []),
      taskLogic.list().then((r) => r.ok ? r.data || [] : []).catch(() => []),
      calendarLogic.getCases({ select: 'id,title,case_number_str,case_display_number,next_hearing,status' }).then((r) => Array.isArray(r) ? r : []).catch(() => []),
      orCached('priorities', () => priorityLogic.list().catch(() => [])),
      orCached('categories', () => taskCategoryLogic.list().then((r) => r.ok ? r.data || [] : []).catch(() => [])),
      orCached('statuses', () => taskStatusLogic.list().then((r) => r.ok ? r.data || [] : []).catch(() => [])),
      orCached('caseStatuses', () => caseStatusLogic.list().catch(() => [])),
    ]).then(([h, rm, t, c, p, cat, st, cst]) => {
      setHearings(Array.isArray(h) ? h : []);
      setReminders(Array.isArray(rm) ? rm : []);
      setTasks(Array.isArray(t) ? t : []);
      setCases(Array.isArray(c) ? c : []);
      setPriorities(Array.isArray(p) ? p : []);
      setCategories(Array.isArray(cat) ? cat : []);
      setStatuses(Array.isArray(st) ? st : []);
      setCaseStatuses(Array.isArray(cst) ? cst : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ---------- build calendar events ---------- */
  const caseStatusColor = useMemo(() => {
    const map = {};
    caseStatuses.forEach((s) => { map[(s.name || '').toLowerCase()] = s.color || '#6b7280'; });
    return map;
  }, [caseStatuses]);

  const caseLabel = useCallback((c) => {
    const num = c.case_display_number || c.caseNumber || '';
    const title = c.title || '';
    if (num && title && title !== num) return `${num} — ${title}`;
    return num || title || 'Case';
  }, []);

  const caseNumberOnly = useCallback((c) => c.case_display_number || c.caseNumber || c.title || 'Case', []);

  // Latest hearing status per case (mirrors the Order Sheet page's per-case status).
  const caseHearingStatusMap = useMemo(() => {
    const byCase = {};
    hearings.forEach((h) => {
      const cid = h.case_id || h.caseId;
      if (!cid) return;
      const d = h.date || h.next_hearing_date;
      if (!d) return;
      const prev = byCase[cid];
      if (!prev || d > prev.date) byCase[cid] = { date: d, status: h.status || 'Scheduled' };
    });
    const map = {};
    Object.keys(byCase).forEach((cid) => { map[cid] = byCase[cid].status; });
    return map;
  }, [hearings]);

  const events = useMemo(() => {
    const out = [];
    // Scheduled case hearings — driven by each case's next hearing date.
    cases.forEach((c) => {
      const due = c.nextHearing || c.next_hearing;
      if (!due) return;
      const statusName = caseHearingStatusMap[c.id] || c.status || 'Active';
      out.push({
        id: `case-hearing-${c.id}`,
        kind: 'hearing',
        title: `${caseNumberOnly(c)} — ${statusName}`,
        caseId: c.id,
        date: due,
        color: caseStatusColor[(statusName || '').toLowerCase()] || '#3b82f6',
        allDay: true,
        blink: true,
        meta: c,
        isCaseHearing: true,
      });
    });
    // Standalone tasks.
    tasks.forEach((t) => {
      if (t.archived) return;
      const due = t.due_date || t.start_date;
      if (!due) return;
      out.push({
        id: t.id, kind: 'task', title: t.title,
        date: due, color: t.color || '#6b7280',
        time: t.due_time || null, caseId: t.case_id, hearingId: t.hearing_id,
        allDay: !t.due_time, active: t.active, status: t.status, meta: t,
      });
    });
    return out;
  }, [cases, tasks, caseStatusColor, caseLabel]);

  /* ---------- modal state for event view ---------- */
  const [viewEvent, setViewEvent] = useState(null);
  const [taskAddOpen, setTaskAddOpen] = useState(false);
  useFabAction(() => { setTab('tasks'); setTaskAddOpen(true); });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 991px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    handler(mql);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return (
    <div className="fade-in">
      {!isMobile ? (
        <div className="bench-types__hero">
          <div className="bench-types__hero-icon"><Icon name="calendar" size={34} /></div>
          <div className="bench-types__hero-text">
            <h2>Calendar & Tasks</h2>
            <p>Manage hearings, events, reminders and tasks in one place.</p>
            <div className="bench-types__hero-accent" />
          </div>
          <Icon name="calendar" className="bench-types__hero-watermark bench-types__watermark-icon" />
          <PermissionGate module="calendar" action="create"><Button icon="plus" onClick={() => { setTab('tasks'); setTaskAddOpen(true); }} className="ml-auto">Add Task</Button></PermissionGate>
        </div>
      ) : (
        <div className="bench-types__hero mb-20">
          <div className="bench-types__hero-icon"><Icon name="calendar" size={34} /></div>
          <div className="bench-types__hero-text">
            <h2>Calendar & Tasks</h2>
            <p>Manage hearings, events, reminders and tasks in one place.</p>
            <div className="bench-types__hero-accent" />
              <PermissionGate module="calendar" action="create"><Button icon="plus" onClick={() => { setTab('tasks'); setTaskAddOpen(true); }}>Add Task</Button></PermissionGate>
          </div>
          <Icon name="calendar" className="bench-types__hero-watermark bench-types__watermark-icon" />
        </div>
      )}

      <div className="seg mb-18">
        {TABS.map((t) => (
          <button key={t} className={`seg__btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            <Icon name={t === 'calendar' ? 'calendar' : 'check'} size={14} /> {t === 'calendar' ? 'Calendar' : 'Tasks'}
          </button>
        ))}
      </div>

      {tab === 'calendar' ? (
        <CalendarView
          events={events} loading={loading} onView={setViewEvent}
          cases={cases}
        />
      ) : (
        <TasksView
          tasks={tasks} loading={loading} onChanged={refreshTasks}
          priorities={priorities} categories={categories} statuses={statuses}
          cases={cases} onReloadMaster={() => loadAll(true)}
          toast={toast} user={user} formatDate={formatDate} formatDateTime={formatDateTime}
          taskAddOpen={taskAddOpen} setTaskAddOpen={setTaskAddOpen}
        />
      )}

      <EventViewModal event={viewEvent} onClose={() => setViewEvent(null)} cases={cases} />
    </div>
  );
}

/* ================================================================== */
/*  CALENDAR VIEW                                                      */
/* ================================================================== */
function CalendarView({ events, loading, onView, cases }) {
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(startOfDay(new Date()));
  const [showJump, setShowJump] = useState(false);
  const [jump, setJump] = useState('');

  const today = useMemo(() => startOfDay(new Date()), []);
  const goToday = useCallback(() => setCursor(startOfDay(new Date())), []);
  const goPrev = useCallback(() => {
    setCursor((c) => {
      if (view === 'month') return addDays(c, -30);
      if (view === 'week') return addDays(c, -7);
      return addDays(c, -1);
    });
  }, [view]);
  const goNext = useCallback(() => {
    setCursor((c) => {
      if (view === 'month') return addDays(c, 30);
      if (view === 'week') return addDays(c, 7);
      return addDays(c, 1);
    });
  }, [view]);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      const k = dayKey(e.date);
      (map[k] = map[k] || []).push(e);
    });
    return map;
  }, [events]);

  const label = useMemo(() => {
    if (view === 'month') return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === 'week') {
      const ws = weekStart(cursor); const we = addDays(ws, 6);
      return `${MONTHS[ws.getMonth()].slice(0, 3)} ${ws.getDate()} – ${MONTHS[we.getMonth()].slice(0, 3)} ${we.getDate()}, ${we.getFullYear()}`;
    }
    return `${WEEKDAYS[(cursor.getDay() + 6) % 7]} ${cursor.getDate()} ${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  }, [view, cursor]);

  /* ---- month grid ---- */
  const monthCells = useMemo(() => {
    const ws = weekStart(cursor);
    const cells = [];
    for (let i = 0; i < 42; i += 1) cells.push(addDays(ws, i));
    return cells;
  }, [cursor]);

  /* ---- week grid ---- */
  const weekCells = useMemo(() => {
    const ws = weekStart(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [cursor]);

  return (
    <Card noPad className="cal-card">
      <div className="cal-toolbar">
        <div className="cal-toolbar-left">
          <button className="cal-nav-btn" onClick={goPrev} aria-label="Previous"><Icon name="chevronLeft" size={16} /></button>
          <button className="cal-nav-btn" onClick={goNext} aria-label="Next"><Icon name="chevron" size={16} /></button>
          <button className="cal-today-btn" onClick={goToday}><Icon name="calendar" size={14} /> Today</button>
          <h3 className="cal-label">{label}</h3>
        </div>
        <div className="cal-toolbar-right">
          <div className="cal-view-seg">
            {['month', 'week', 'day'].map((v) => (
              <button key={v} className={`cal-view-btn${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
                {v === 'month' ? 'Month' : v === 'week' ? 'Week' : 'Day'}
              </button>
            ))}
          </div>
          <div className="cal-jump">
            {showJump ? (
              <DateInput
                value={jump}
                onChange={(e) => { const v = e.target.value; setJump(v); if (v) { setCursor(startOfDay(new Date(v))); setShowJump(false); } }}
                autoFocus
              />
            ) : (
              <button className="cal-nav-btn" onClick={() => { setJump(dayKey(cursor)); setShowJump(true); }} title="Jump to date"><Icon name="search" size={15} /></button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty"><span className="spinner" /></div>
      ) : (
        <>
          {view === 'month' && (
            <div className="cal-month">
              <div className="cal-weekdays">
                {WEEKDAYS.map((w) => <div key={w} className="cal-weekday">{w}</div>)}
              </div>
              <div className="cal-grid">
                {monthCells.map((d, i) => {
                  const k = dayKey(d);
                  const dayEvents = eventsByDay[k] || [];
                  const isToday = sameDay(d, today);
                  const otherMonth = d.getMonth() !== cursor.getMonth();
                  return (
                    <div key={i} className={`cal-cell${otherMonth ? ' cal-cell--muted' : ''}${isToday ? ' cal-cell--today' : ''}`}>
                      <div className="cal-cell-head">
                        <span className="cal-cell-num">{d.getDate()}</span>
                        <span className="cal-cell-dow">{WEEKDAYS[(d.getDay() + 6) % 7]}</span>
                        {dayEvents.length > 0 && <span className="cal-cell-count">{dayEvents.length}</span>}
                      </div>
                      <div className="cal-cell-events">
                        {dayEvents.slice(0, 3).map((e) => (
                          <button key={e.id} className="cal-event" onClick={() => onView(e)} title={e.title}
                            style={{ '--dot': e.color, '--dot-bg': tint(e.color) }}>
                            <span className={`cal-event-dot${e.blink ? ' cal-event-dot--blink' : ''}`} style={{ '--dot': e.color }} />
                            <span className="cal-event-title">{e.title}</span>
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="cal-event-more">+{dayEvents.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'week' && (
            <div className="cal-week">
              <div className="cal-week-head-row">
                {weekCells.map((d) => (
                  <div key={dayKey(d)} className={`cal-week-head${sameDay(d, today) ? ' cal-week-head--today' : ''}`}>
                    <span className="cal-week-head-dow">{WEEKDAYS[(d.getDay() + 6) % 7]}</span>
                    <span className="cal-week-head-date">{d.getDate()}</span>
                  </div>
                ))}
              </div>
              <div className="cal-week-body">
                {weekCells.map((d) => {
                  const k = dayKey(d);
                  const dayEvents = (eventsByDay[k] || []).slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
                  return (
                    <div key={dayKey(d)} className={`cal-week-col${sameDay(d, today) ? ' cal-week-col--today' : ''}`}>
                      {dayEvents.length === 0 ? (
                        <div className="cal-week-empty">—</div>
                      ) : dayEvents.map((e) => (
                      <button key={e.id} className="cal-event cal-event--block" onClick={() => onView(e)}
                        style={{ '--dot': e.color, '--dot-bg': tint(e.color) }}>
                        <span className={`cal-event-dot${e.blink ? ' cal-event-dot--blink' : ''}`} style={{ '--dot': e.color }} />
                        <span className="cal-event-title">{e.title}</span>
                        {e.time && <span className="cal-event-time">{fmtTime(e.time)}</span>}
                      </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'day' && (
            <div className="cal-day">
              {(eventsByDay[dayKey(cursor)] || []).slice().sort((a, b) => (a.time || '').localeCompare(b.time || '')).map((e) => (
                <button key={e.id} className="cal-day-event" onClick={() => onView(e)}
                  style={{ '--dot': e.color, '--dot-bg': tint(e.color) }}>
                  <span className={`cal-event-dot${e.blink ? ' cal-event-dot--blink' : ''}`} style={{ '--dot': e.color }} />
                  <div className="cal-day-event-body">
                    <div className="cal-day-event-title">{e.title}</div>
                    {e.time && <div className="cal-day-event-time">{fmtTime(e.time)}</div>}
                    <Badge tone={e.kind === 'task' ? 'grey' : e.kind === 'hearing' ? 'navy' : 'amber'}>{e.kind}</Badge>
                  </div>
                </button>
              ))}
              {(eventsByDay[dayKey(cursor)] || []).length === 0 && (
                <div className="empty"><Icon name="calendar" size={40} /><h3>No events scheduled for this day.</h3></div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ================================================================== */
/*  EVENT VIEW MODAL                                                   */
/* ================================================================== */
function EventViewModal({ event, onClose, cases }) {
  if (!event) return null;
  const linkedCase = event.caseId ? cases.find((c) => c.id === event.caseId) : null;
  const caseTitle = linkedCase ? (linkedCase.title || linkedCase.case_display_number || linkedCase.caseNumber || 'Linked') : null;
  return (
    <Modal open={!!event} onClose={onClose} title={event.title} subtitle={event.isCaseHearing ? 'Scheduled Hearing' : event.kind}>
      <div className="cal-evt">
        <div className="cal-evt-row"><span className="cal-evt-label">Type</span><Badge tone={event.kind === 'task' ? 'grey' : 'navy'}>{event.isCaseHearing ? 'Case Hearing' : event.kind}</Badge></div>
        {event.date && <div className="cal-evt-row"><span className="cal-evt-label">Date</span><span>{new Date(event.date).toLocaleDateString()}</span></div>}
        {event.time && <div className="cal-evt-row"><span className="cal-evt-label">Time</span><span>{fmtTime(event.time)}</span></div>}
        {event.isCaseHearing && linkedCase && (
          <>
            <div className="cal-evt-row"><span className="cal-evt-label">Case No.</span><span>{linkedCase.case_display_number || linkedCase.caseNumber || '—'}</span></div>
            <div className="cal-evt-row"><span className="cal-evt-label">Case Title</span><span>{linkedCase.title || '—'}</span></div>
            <div className="cal-evt-row"><span className="cal-evt-label">Status</span><Badge tone="grey">{linkedCase.status || 'Active'}</Badge></div>
            {linkedCase.nextHearing && <div className="cal-evt-row"><span className="cal-evt-label">Next Hearing</span><span>{new Date(linkedCase.nextHearing).toLocaleDateString()}</span></div>}
          </>
        )}
        {caseTitle && !event.isCaseHearing && <div className="cal-evt-row"><span className="cal-evt-label">Case</span><span>{caseTitle}</span></div>}
        {event.kind === 'task' && event.status && <div className="cal-evt-row"><span className="cal-evt-label">Status</span><span>{event.status}</span></div>}
        {event.kind === 'task' && event.meta?.description && <div className="cal-evt-row"><span className="cal-evt-label">Description</span><span>{event.meta.description}</span></div>}
        <div className="cal-evt-color"><span className="cal-evt-swatch" style={{ background: event.color }} /> {event.color}</div>
      </div>
    </Modal>
  );
}

/* ================================================================== */
/*  TASKS VIEW                                                         */
/* ================================================================== */
function TasksView({ tasks, loading, onChanged, priorities, categories, statuses, cases, onReloadMaster, toast, user, formatDate, formatDateTime, taskAddOpen, setTaskAddOpen }) {
  const [filters, setFilters] = useState({ category: [], priority: [], status: [], active: [], caseId: [], date: '' });
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [tempFilters, setTempFilters] = useState({ category: [], priority: [], status: [], active: [], caseId: [] });
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState([]);

  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'view' | null
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [crud, setCrud] = useState(null); // 'category' | 'status'

  const caseLabelFor = useCallback((c) => {
    const num = c.case_display_number || c.caseNumber || '';
    const title = c.title || '';
    if (num && title && title !== num) return `${num} — ${title}`;
    return num || title || c.id;
  }, []);
  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c.name, label: c.name })), [categories]);
  const statusOptions = useMemo(() => statuses.map((s) => ({ value: s.name, label: s.name })), [statuses]);
  const priorityOptions = useMemo(() => priorities.map((p) => ({ value: p.name, label: p.name })), [priorities]);
  const caseOptions = useMemo(() => cases.map((c) => ({ value: c.id, label: caseLabelFor(c) })), [cases, caseLabelFor]);

  const caseDisplayMap = useMemo(() => {
    const map = {};
    cases.forEach((c) => { map[c.id] = c.case_display_number || c.caseNumber || ''; });
    return map;
  }, [cases]);
  const caseTitleMap = useMemo(() => {
    const map = {};
    cases.forEach((c) => { if (c.title) map[c.id] = c.title; });
    return map;
  }, [cases]);

  const taskFilterCategories = [
    { key: 'category', label: 'Category' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'active', label: 'State' },
    { key: 'caseId', label: 'Case' },
  ];

  const taskFilterOptions = useMemo(() => ({
    category: categoryOptions,
    priority: priorityOptions,
    status: statusOptions,
    active: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }],
    caseId: caseOptions,
  }), [categoryOptions, priorityOptions, statusOptions, caseOptions]);

  const handleOpenTaskFilter = useCallback(() => {
    setTempFilters({
      category: filters.category.length ? [...filters.category] : [],
      priority: filters.priority.length ? [...filters.priority] : [],
      status: filters.status.length ? [...filters.status] : [],
      active: filters.active.length ? [...filters.active] : [],
      caseId: filters.caseId.length ? [...filters.caseId] : [],
    });
    setShowFilterPopup(true);
  }, [filters]);

  const handleTempTaskFilterChange = useCallback((key, values) => {
    setTempFilters((prev) => ({ ...prev, [key]: values }));
  }, []);

  const handleApplyTaskFilters = useCallback(() => {
    setFilters((prev) => ({ ...prev, ...tempFilters }));
    setShowFilterPopup(false);
  }, [tempFilters]);

  const handleClearTaskFilters = useCallback(() => {
    setTempFilters({ category: [], priority: [], status: [], active: [], caseId: [] });
  }, []);

  const openCrudFor = useCallback((type) => {
    if (type === 'category') setCrud('category');
    else if (type === 'status') setCrud('status');
    else if (type === 'priority') setCrud('priority');
  }, []);

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => (showArchived ? true : !t.archived));
    if (filters.category.length) list = list.filter((t) => filters.category.includes(t.category));
    if (filters.priority.length) list = list.filter((t) => filters.priority.includes(t.priority));
    if (filters.status.length) list = list.filter((t) => filters.status.includes(t.status));
    if (filters.active.length) list = list.filter((t) => filters.active.includes(t.active ? 'active' : 'inactive'));
    if (filters.caseId.length) list = list.filter((t) => filters.caseId.includes(t.case_id));
    if (filters.date) {
      const fk = dayKey(new Date(filters.date));
      list = list.filter((t) => { const d = t.due_date || t.start_date; return d && dayKey(new Date(d)) === fk; });
    }
    return list;
  }, [tasks, filters, showArchived]);

  const stats = useMemo(() => {
    const active = tasks.filter((t) => !t.archived && t.active);
    return {
      total: tasks.filter((t) => !t.archived).length,
      completed: tasks.filter((t) => t.status === 'Completed' && !t.archived).length,
      pending: tasks.filter((t) => (t.status === 'Pending' || t.status === 'In Progress') && !t.archived).length,
      overdue: tasks.filter((t) => !t.archived && t.active && t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Completed').length,
      archived: tasks.filter((t) => t.archived).length,
    };
  }, [tasks]);

  useEffect(() => { if (taskAddOpen) { openAdd(); setTaskAddOpen(false); } }, [taskAddOpen]);

  const openAdd = useCallback(() => { setEditing(null); setModal('add'); }, []);
  const openEdit = useCallback((t) => { setEditing(t); setModal('edit'); }, []);
  const openView = useCallback((t) => setViewing(t), []);

  const doAction = useCallback(async (fn) => {
    const r = await fn;
    if (r && r.ok) { onChanged(); toast.push('Task updated.', 'success'); }
    else if (r) toast.push(r.error || 'Operation failed.', 'error');
  }, [onChanged, toast]);

  const exportCsv = () => {
    const headers = ['Title', 'Category', 'Priority', 'Status', 'Active', 'Due Date', 'Due Time', 'Case', 'Created', 'Updated'];
    const rows = filtered.map((t) => [
      t.title, t.category, t.priority, t.status, t.active ? 'Active' : 'Inactive',
      t.due_date ? formatDate(t.due_date) : '', t.due_time || '', t.case_id || '',
      t.created_at ? formatDate(t.created_at) : '', t.updated_at ? formatDate(t.updated_at) : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${(c || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tasks.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const printTasks = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const body = filtered.map((t) => `<tr><td>${escapeHtml(t.title)}</td><td>${escapeHtml(t.category || '')}</td><td>${escapeHtml(t.priority)}</td><td>${escapeHtml(t.status)}</td><td>${escapeHtml(t.due_date ? formatDate(t.due_date) : '')}</td></tr>`).join('');
    w.document.write(`<html><head><title>Tasks</title><style>body{font-family:sans-serif}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body><h2>Tasks</h2><table><thead><tr><th>Title</th><th>Category</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead><tbody>${body}</tbody></table></body></html>`);
    w.document.close(); w.print();
  };

  const bulkDelete = () => {
    if (!selected.length) return;
    setConfirm({
      title: 'Delete Tasks', message: `Delete ${selected.length} task(s)? This cannot be undone.`,
      variant: 'danger', confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirm(null);
        for (const id of selected) await taskLogic.remove(id);
        setSelected([]); onChanged(); toast.push('Tasks deleted.', 'success');
      },
      onCancel: () => setConfirm(null),
    });
  };

  if (loading) return <div className="fade-in cmp-loading"><div className="spinner" /></div>;

  return (
    <div className="tasks-view">
      <div className="stat-grid">
        <StatCard icon="check" label="Total Tasks" value={stats.total} tone="blue" />
        <StatCard icon="clock" label="Pending" value={stats.pending} tone="amber" />
        <StatCard icon="alert" label="Overdue" value={stats.overdue} tone="red" />
        <StatCard icon="check-circle" label="Completed" value={stats.completed} tone="green" />
      </div>

      <Card noPad className="tasks-toolbar-card">
        <div className="tasks-toolbar">
          <div className="tasks-toolbar-left">
            <PermissionGate module="calendar" action="create"><Button icon="plus" onClick={openAdd}>Add Task</Button></PermissionGate>
            <PermissionGate module="calendar" action="create"><button className="btn btn--outline" onClick={() => setCrud('category')}><Icon name="tag" size={15} /> Categories</button></PermissionGate>
            <PermissionGate module="calendar" action="create"><button className="btn btn--outline" onClick={() => setCrud('status')}><Icon name="flag" size={15} /> Statuses</button></PermissionGate>
          </div>
          <div className="tasks-toolbar-right">
            <PermissionGate module="calendar" action="export"><button className="btn btn--ghost" onClick={exportCsv}><Icon name="download" size={15} /> Export</button></PermissionGate>
            <PermissionGate module="calendar" action="print"><button className="btn btn--ghost" onClick={printTasks}><Icon name="print" size={15} /> Print</button></PermissionGate>
          </div>
        </div>

        <div className="tasks-search-row">
          <div className="tasks-search-inner">
            <Icon name="search" size={18} />
            <button className="tasks-search-filter-inner-btn" onClick={handleOpenTaskFilter} title="Filter">
              <Icon name="filter" size={18} />
              {[filters.category, filters.priority, filters.status, filters.active, filters.caseId].some((v) => v.length) && (
                <span className="tasks-search-filter-inner-badge">{filters.category.length + filters.priority.length + filters.status.length + filters.active.length + filters.caseId.length}</span>
              )}
            </button>
          </div>
          <Button variant="ghost" icon="filter" className="jl-filter-btn" onClick={handleOpenTaskFilter}>
            {[filters.category, filters.priority, filters.status, filters.active, filters.caseId].some((v) => v.length) ? `Filter (${[filters.category, filters.priority, filters.status, filters.active, filters.caseId].reduce((s, v) => s + v.length, 0)})` : 'Filter'}
          </Button>
          <Input type="date" className="input tasks-filter-date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
          <button className={`tasks-arch-toggle${showArchived ? ' active' : ''}`} onClick={() => setShowArchived((s) => !s)}>
            <Icon name="history" size={15} /> {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
          <button className="btn btn--ghost tasks-clear-btn" onClick={() => { setFilters({ category: [], priority: [], status: [], active: [], caseId: [], date: '' }); }}>Clear</button>
        </div>
      </Card>

      {selected.length > 0 && (
        <div className="tasks-bulkbar">
          <span>{selected.length} selected</span>
          <PermissionGate module="calendar" action="bulkDelete"><button className="btn btn--danger-outline" onClick={bulkDelete}><Icon name="trash" size={14} /> Delete</button></PermissionGate>
          <button className="btn btn--ghost" onClick={() => setSelected([])}>Clear</button>
        </div>
      )}

      <Card noPad className="tasks-table-card">
        {filtered.length === 0 ? (
          <EmptyState icon="check" title="No tasks found." hint="Create a task or adjust your filters." />
        ) : (
          <>
            <DataTable
              columns={[
                {
                  key: 'title',
                  label: 'Task',
                  sortable: true,
                  width: 260,
                  render: (t) => {
                    const cat = categories.find((c) => c.name === t.category);
                    const color = t.color || cat?.color || '#6b7280';
                    return (
                      <>
                        <div className="task-title-cell">
                          <span className="cal-event-dot" style={{ '--dot': color }} />
                          <button className="link-btn" onClick={() => openView(t)}>{t.title}</button>
                          {t.reminder && <Icon name="bell" size={13} className="task-reminder-ico" />}
                        </div>
                        {t.tags && <div className="task-tags">{t.tags.split(',').slice(0, 3).map((tg) => <span key={tg} className="task-tag">{tg.trim()}</span>)}</div>}
                      </>
                    );
                  },
                },
                { key: 'caseInfo', label: 'Case', sortable: true, render: (t) => {
                  const cid = t.case_id || t.caseId;
                  return cid ? (
                    <div className="task-case-cell">
                      <div className="task-case-cell__num">{caseDisplayMap[cid] || 'Linked'}</div>
                      {caseTitleMap[cid] && <div className="task-case-cell__party">{caseTitleMap[cid]}</div>}
                    </div>
                  ) : '—';
                }},
                { key: 'category', label: 'Category', sortable: true, render: (t) => t.category ? <Badge tone="grey">{t.category}</Badge> : '—' },
                { key: 'priority', label: 'Priority', sortable: true, render: (t) => t.priority ? <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge> : '—' },
                { key: 'status', label: 'Status', sortable: true, render: (t) => t.status ? <Badge tone={statusTone(t.status)}>{t.status}</Badge> : '—' },
                {
                  key: 'due',
                  label: 'Due',
                  sortable: true,
                  width: 120,
                  render: (t) => (
                    <>{t.due_date ? formatDate(t.due_date) : '—'}{t.due_time && <div className="task-due-time">{fmtTime(t.due_time)}</div>}</>
                  ),
                },
                { key: 'active', label: 'State', width: 100, render: (t) => (
                  <>{t.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}{t.archived && <Badge tone="grey">Archived</Badge>}</>
                )},
                {
                  key: 'actions',
                  label: '',
                  width: 160,
                  render: (t) => (
                    <div className="cmp-actions">
                      <button className="cmp-act-btn cmp-act-btn--view" title="View" onClick={() => openView(t)}><Icon name="eye" size={15} /></button>
                      <PermissionGate module="calendar" action="edit"><button className="cmp-act-btn cmp-act-btn--edit" title="Edit" onClick={() => openEdit(t)}><Icon name="edit" size={15} /></button></PermissionGate>
                      <PermissionGate module="calendar" action="duplicate"><button className="cmp-act-btn cmp-act-btn--copy" title="Duplicate" onClick={() => doAction(taskLogic.duplicate(t.id).then((r) => { onChanged(); return r; }))}><Icon name="copy" size={15} /></button></PermissionGate>
                      <PermissionGate module="calendar" action="edit">{t.status !== 'Completed' ? (
                        <button className="cmp-act-btn cmp-act-btn--toggle-on" title="Mark Complete" onClick={() => doAction(taskLogic.markComplete(t.id))}><Icon name="check-circle" size={15} /></button>
                      ) : (
                        <button className="cmp-act-btn cmp-act-btn--toggle-off" title="Mark Pending" onClick={() => doAction(taskLogic.markPending(t.id))}><Icon name="refresh" size={15} /></button>
                      )}</PermissionGate>
                      <PermissionGate module="calendar" action="archive">{!t.archived ? (
                        <button className="cmp-act-btn" title="Archive" onClick={() => doAction(taskLogic.archive(t.id))}><Icon name="archive" size={15} /></button>
                      ) : (
                        <button className="cmp-act-btn" title="Restore" onClick={() => doAction(taskLogic.restore(t.id))}><Icon name="refresh" size={15} /></button>
                      )}</PermissionGate>
                      <PermissionGate module="calendar" action="delete"><button className="cmp-act-btn cmp-act-btn--del" title="Delete" onClick={() => setConfirm({ title: 'Delete Task', message: `Delete "${t.title}"?`, variant: 'danger', confirmLabel: 'Delete', onConfirm: async () => { setConfirm(null); await taskLogic.remove(t.id); onChanged(); toast.push('Task deleted.', 'success'); }, onCancel: () => setConfirm(null) })}><Icon name="trash" size={15} /></button></PermissionGate>
                    </div>
                  ),
                },
              ]}
              rows={filtered}
              rowKey={(t) => t.id}
              searchKeys={['title', 'description', 'tags']}
              searchPlaceholder="Search tasks by title, description, or tag…"
              selectable
              selected={selected}
              onSelectedChange={setSelected}
              emptyIcon="check"
              emptyTitle="No tasks found."
            />
            <div className="tasks-cards">
              {filtered.map((t) => {
                const cat = categories.find((c) => c.name === t.category);
                const color = t.color || cat?.color || '#6b7280';
                const cid = t.case_id || t.caseId || '';
                const caseNum = cid ? (caseDisplayMap[cid] || cid) : '—';
                const caseTitle = cid ? cases.find((c) => String(c.id) === String(cid))?.title || '' : '';
                return (
                  <article key={t.id} className={`task-card${t.archived ? ' task-card--archived' : ''}`}>
                    <div className="task-card__header">
                      <div className="task-card__case-row">
                        <span className="task-card__case-num">{caseNum || '—'}</span>
                        <span className="task-card__status-badge">
                          <span className="task-card__badge-dot" />
                          {t.status || 'Pending'}
                        </span>
                      </div>
                      {caseTitle && <div className="task-card__case-title">{caseTitle}</div>}
                    </div>

                    <div className="task-card__fields">
                      {t.title && (
                        <div className="task-card__field">
                          <span className="task-card__field-icon"><Icon name="edit" size={13} /></span>
                          <span className="task-card__field-value task-card__field-value--title">{t.title}</span>
                        </div>
                      )}
                      {t.description && (
                        <div className="task-card__field">
                          <span className="task-card__field-icon"><Icon name="file" size={13} /></span>
                          <span className="task-card__field-value task-card__field-value--clamp">{t.description}</span>
                        </div>
                      )}
                      {t.notes && (
                        <div className="task-card__field">
                          <span className="task-card__field-icon"><Icon name="notes" size={13} /></span>
                          <span className="task-card__field-value task-card__field-value--clamp">{t.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="task-card__datetime-row">
                      <div className="task-card__dt-item">
                        <div className="task-card__dt-label-wrap">
                          <span className="task-card__field-icon"><Icon name="clock" size={13} /></span>
                          <span className="task-card__dt-label">DUE DATE & TIME</span>
                        </div>
                        <span className="task-card__dt-value">
                          {t.due_date ? formatDate(t.due_date) : '—'}
                          {t.due_time ? ` ${fmtTime(t.due_time)}` : ''}
                        </span>
                      </div>
                      {(t.start_date || t.end_date) && (
                        <div className="task-card__dt-item">
                          <div className="task-card__dt-label-wrap">
                            <span className="task-card__field-icon"><Icon name="calendar" size={13} /></span>
                            <span className="task-card__dt-label">Start / End</span>
                          </div>
                          <span className="task-card__dt-value task-card__dt-value--range">
                            {t.start_date ? formatDate(t.start_date) : '—'}
                            {t.end_date ? ` → ${formatDate(t.end_date)}` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {t.tags && (
                      <div className="task-card__tags">
                        <span className="task-card__field-icon"><Icon name="tag" size={13} /></span>
                        {t.tags.split(',').slice(0, 6).map((tg) => (
                          <span key={tg.trim()} className="task-tag task-tag--colored">{tg.trim()}</span>
                        ))}
                      </div>
                    )}

                    {t.updatedAt && (
                      <div className="task-card__updated">
                        <span className="task-card__field-icon"><Icon name="clock" size={13} /></span>
                        Last Updated: {formatDateTime(t.updatedAt)}
                      </div>
                    )}

                    <div className="task-card__actions-sep" />
                    <div className="task-card__actions" role="toolbar" aria-label="Task actions">
                      <button className="cv-action-btn" onClick={() => openView(t)} aria-label="View"><Icon name="eye" size={16} /><span>View</span></button>
                      <PermissionGate module="calendar" action="edit"><button className="cv-action-btn" onClick={() => openEdit(t)} aria-label="Edit"><Icon name="edit" size={16} /><span>Edit</span></button></PermissionGate>
                      <PermissionGate module="calendar" action="duplicate"><button className="cv-action-btn" onClick={() => doAction(taskLogic.duplicate(t.id).then(() => onChanged()))} aria-label="Duplicate"><Icon name="copy" size={16} /><span>Duplicate</span></button></PermissionGate>
                      <PermissionGate module="calendar" action="edit">{t.status !== 'Completed'
                        ? <button className="cv-action-btn" onClick={() => doAction(taskLogic.markComplete(t.id))} aria-label="Complete"><Icon name="check-circle" size={16} /><span>Done</span></button>
                        : <button className="cv-action-btn" onClick={() => doAction(taskLogic.markPending(t.id))} aria-label="Pending"><Icon name="refresh" size={16} /><span>Pending</span></button>}</PermissionGate>
                      <PermissionGate module="calendar" action="archive"><button className="cv-action-btn" onClick={() => doAction(t.archived ? taskLogic.restore(t.id) : taskLogic.archive(t.id))} aria-label={t.archived ? 'Restore' : 'Archive'}><Icon name={t.archived ? 'refresh' : 'archive'} size={16} /><span>{t.archived ? 'Restore' : 'Archive'}</span></button></PermissionGate>
                      <PermissionGate module="calendar" action="delete"><button className="cv-action-btn cv-action-btn--danger" onClick={() => setConfirm({ title: 'Delete Task', message: `Delete "${t.title}"?`, variant: 'danger', confirmLabel: 'Delete', onConfirm: async () => { setConfirm(null); await taskLogic.remove(t.id); onChanged(); toast.push('Task deleted.', 'success'); }, onCancel: () => setConfirm(null) })} aria-label="Delete"><Icon name="trash" size={16} /><span>Delete</span></button></PermissionGate>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </Card>

      <FilterPopup
        open={showFilterPopup}
        onClose={() => setShowFilterPopup(false)}
        categories={taskFilterCategories}
        options={taskFilterOptions}
        tempFilters={tempFilters}
        onTempFilterChange={handleTempTaskFilterChange}
        onApply={handleApplyTaskFilters}
        onClearAll={handleClearTaskFilters}
      />

      {modal && (
        <TaskFormModal
          mode={modal} task={editing} onClose={() => setModal(null)} onSaved={() => { setModal(null); onChanged(); }}
          categories={categories} statuses={statuses} priorities={priorities} cases={cases}
          toast={toast} user={user} onManageCrud={openCrudFor}
        />
      )}

      {viewing && (
        <TaskViewModal task={viewing} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null); setModal('edit'); }}
          categories={categories} cases={cases} formatDate={formatDate} formatDateTime={formatDateTime}
        />
      )}

      {crud && (
        <CrudManager
          open={!!crud} onClose={() => { setCrud(null); onReloadMaster(); }}
          entity={crud === 'category' ? 'Task Category' : crud === 'status' ? 'Task Status' : 'Priority'}
          config={{
            logic: crud === 'category' ? taskCategoryLogic : crud === 'status' ? taskStatusLogic : priorityLogic,
            fields: crud === 'priority'
              ? [
                  { key: 'name', label: 'Name', placeholder: 'e.g., Urgent' },
                  { key: 'short_code', label: 'Short Code', placeholder: 'PRIT-HIGH' },
                  { key: 'color', label: 'Color', type: 'color' },
                ]
              : [
                  { key: 'name', label: 'Name', placeholder: 'e.g., Hearing' },
                  { key: 'short_code', label: 'Short Code', placeholder: 'HEAR' },
                  { key: 'color', label: 'Color', type: 'color' },
                ],
            defaults: {},
            refresh: onReloadMaster,
          }}
        />
      )}

      {confirm && <ConfirmDialog open title={confirm.title} message={confirm.message} variant={confirm.variant} confirmLabel={confirm.confirmLabel} onConfirm={confirm.onConfirm} onCancel={confirm.onCancel} />}
    </div>
  );
}

function StatCard({ icon, label, value, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-card__icon stat-card__icon--${tone}`}><Icon name={icon} size={20} /></div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}

function priorityRank(p) { return { Urgent: 0, High: 1, Medium: 2, Low: 3 }[p] ?? 4; }
function priorityTone(p) { return { Urgent: 'red', High: 'orange', Medium: 'amber', Low: 'blue' }[p] || 'grey'; }
function statusTone(s) { return { Completed: 'green', 'In Progress': 'blue', Pending: 'amber', Cancelled: 'red', 'On Hold': 'purple' }[s] || 'grey'; }

/* ================================================================== */
/*  TASK FORM MODAL                                                    */
/* ================================================================== */
function TaskFormModal({ mode, task, onClose, onSaved, categories, statuses, priorities, cases, toast, user, onManageCrud }) {
  const caseLabelFor = (c) => {
    const num = c.case_display_number || c.caseNumber || '';
    const title = c.title || '';
    if (num && title && title !== num) return `${num} — ${title}`;
    return num || title || c.id;
  };
  const blank = {
    title: '', description: '', notes: '', category: '', priority: 'Medium', status: 'Pending',
    active: true, due_date: '', due_time: '', has_date_range: false, start_date: '', end_date: '', reminder: false,
    reminder_time: '', color: '#6b7280', case_id: '', hearing_id: '', tags: '', attachments: '',
  };
  const [form, setForm] = useState(() => task ? {
    title: task.title || '', description: task.description || '', notes: task.notes || '', category: task.category || '',
    priority: task.priority || 'Medium', status: task.status || 'Pending', active: task.active !== false,
    due_date: task.due_date ? task.due_date.slice(0, 10) : '', due_time: task.due_time || '',
    has_date_range: !!(task.start_date || task.end_date),
    start_date: task.start_date ? task.start_date.slice(0, 10) : '', end_date: task.end_date ? task.end_date.slice(0, 10) : '',
    reminder: !!task.reminder, reminder_time: task.reminder_time || '', color: task.color || '#6b7280',
    case_id: task.case_id || '', hearing_id: task.hearing_id || '', tags: task.tags || '', attachments: task.attachments || '',
  } : blank);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) { toast.push('Task title is required.', 'error'); return; }
    setSaving(true);
    const payload = {
      ...form,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      created_by: user?.name || '',
    };
    const r = task ? await taskLogic.update(task.id, payload) : await taskLogic.create(payload);
    setSaving(false);
    if (r.ok) { toast.push(task ? 'Task updated.' : 'Task created.', 'success'); onSaved(); }
    else toast.push(r.error, 'error');
  };

  return (
    <Modal open onClose={onClose} title={task ? 'Edit Task' : 'Add Task'} size="lg"
      footer={<div className="cmp-modal-footer">
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button icon="save" onClick={submit} disabled={saving}>{saving ? 'Saving…' : (task ? 'Save Changes' : 'Create Task')}</Button>
      </div>}>
      <div className="task-form-grid">
        <div className="task-field task-field--full">
          <label className="cmp-label">Task Title <span className="cmp-required">*</span></label>
          <Input value={form.title} placeholder="e.g., Draft Written Statement" onChange={(e) => set('title', e.target.value)} />
        </div>

        <div className="task-field task-field--full">
          <label className="cmp-label">Description</label>
          <Textarea value={form.description} placeholder="Brief description…" onChange={(e) => set('description', e.target.value)} maxLength={250} />
        </div>

        <div className="task-field task-field--full">
          <label className="cmp-label">Notes</label>
          <Textarea value={form.notes} placeholder="Additional notes…" onChange={(e) => set('notes', e.target.value)} />
        </div>

        <div className="task-field">
          <label className="cmp-label">Case Number</label>
          <Select value={form.case_id} onChange={(e) => { set('case_id', e.target.value); set('hearing_id', ''); }}>
            <option value="">— none —</option>
            {cases.map((c) => <option key={c.id} value={c.id}>{caseLabelFor(c)}</option>)}
          </Select>
        </div>

        <div className="task-field">
          <label className="cmp-label">Category <span className="cmp-required">*</span></label>
          <div className="task-field-row">
            <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">— select —</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </Select>
            <button type="button" className="task-field-gear" title="Manage Categories" onClick={() => onManageCrud?.('category')}><Icon name="gear" size={14} /></button>
          </div>
        </div>

        <div className="task-field">
          <label className="cmp-label">Priority <span className="cmp-required">*</span></label>
          <div className="task-field-row">
            <Select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {priorities.length === 0 ? ['Low', 'Medium', 'High', 'Urgent'].map((p) => <option key={p} value={p}>{p}</option>)
                : priorities.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </Select>
            <button type="button" className="task-field-gear" title="Manage Priorities" onClick={() => onManageCrud?.('priority')}><Icon name="gear" size={14} /></button>
          </div>
        </div>

        <div className="task-field">
          <label className="cmp-label">Status <span className="cmp-required">*</span></label>
          <div className="task-field-row">
            <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {statuses.length === 0 ? ['Pending', 'In Progress', 'Completed', 'Cancelled', 'On Hold'].map((s) => <option key={s} value={s}>{s}</option>)
                : statuses.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </Select>
            <button type="button" className="task-field-gear" title="Manage Statuses" onClick={() => onManageCrud?.('status')}><Icon name="gear" size={14} /></button>
          </div>
        </div>

        <div className="task-field">
          <label className="cmp-label">Active / Inactive <span className="cmp-required">*</span></label>
          <Select value={form.active ? 'active' : 'inactive'} onChange={(e) => set('active', e.target.value === 'active')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        <div className="task-field">
          <label className="cmp-label">Due Date</label>
          <Input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
        </div>

        <div className="task-field">
          <label className="cmp-label">Due Time</label>
          <Input type="time" value={form.due_time} onChange={(e) => set('due_time', e.target.value)} />
        </div>

        <div className="task-field">
          <label className="cmp-label">Start / End Date</label>
          <Toggle checked={form.has_date_range} onChange={(v) => { set('has_date_range', v); if (!v) { set('start_date', ''); set('end_date', ''); } }} />
        </div>
        {form.has_date_range && (
          <>
            <div className="task-field">
              <label className="cmp-label">Start Date</label>
              <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div className="task-field">
              <label className="cmp-label">End Date</label>
              <Input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
          </>
        )}

        <div className="task-field">
          <label className="cmp-label">Reminder</label>
          <Toggle checked={form.reminder} onChange={(v) => set('reminder', v)} />
        </div>
        {form.reminder && (
          <div className="task-field">
            <label className="cmp-label">Reminder Time</label>
            <Input type="time" value={form.reminder_time} onChange={(e) => set('reminder_time', e.target.value)} />
          </div>
        )}

        <div className="task-field">
          <label className="cmp-label">Tags <span className="cmp-optional">(comma separated)</span></label>
          <Input value={form.tags} placeholder="urgent, client-meeting" onChange={(e) => set('tags', e.target.value)} />
        </div>

        <div className="task-field">
          <label className="cmp-label">Attachments <span className="cmp-optional">(upload file)</span></label>
          <input type="file" className="input task-attach-input" onChange={(e) => {
            const names = Array.from(e.target.files || []).map((f) => f.name);
            set('attachments', names.join(', '));
          }} />
          {form.attachments && <div className="task-attach-list">{form.attachments}</div>}
        </div>

        <div className="task-field">
          <label className="cmp-label">Color Swatch</label>
          <ColorPicker value={form.color} onChange={(c) => set('color', c)} />
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================== */
/*  TASK VIEW MODAL                                                    */
/* ================================================================== */
function TaskViewModal({ task, onClose, onEdit, categories, cases, formatDate, formatDateTime }) {
  const cat = categories.find((c) => c.name === task.category);
  const color = task.color || cat?.color || '#6b7280';
  const linkedCase = task.case_id ? cases.find((c) => c.id === task.case_id) : null;
  const caseTitle = linkedCase ? ((linkedCase.case_display_number || linkedCase.caseNumber || '') + (linkedCase.title ? ` — ${linkedCase.title}` : '') || linkedCase.id) : null;
  return (
    <Modal open onClose={onClose} title={task.title}
      footer={<div className="cmp-modal-footer">
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button icon="edit" onClick={onEdit}>Edit</Button>
      </div>}>
      <div className="cal-evt">
        <div className="cal-evt-color"><span className="cal-evt-swatch" style={{ background: color }} /> {color}</div>
        {task.description && <div className="cal-evt-row"><span className="cal-evt-label">Description</span><span>{task.description}</span></div>}
        {task.notes && <div className="cal-evt-row"><span className="cal-evt-label">Notes</span><span>{task.notes}</span></div>}
        {task.category && <div className="cal-evt-row"><span className="cal-evt-label">Category</span><span><Badge tone="grey">{task.category}</Badge></span></div>}
        <div className="cal-evt-row"><span className="cal-evt-label">Priority</span><span><Badge tone={priorityTone(task.priority)}>{task.priority}</Badge></span></div>
        <div className="cal-evt-row"><span className="cal-evt-label">Status</span><span><Badge tone={statusTone(task.status)}>{task.status}</Badge></span></div>
        <div className="cal-evt-row"><span className="cal-evt-label">State</span><span>{task.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}{task.archived && <Badge tone="grey">Archived</Badge>}</span></div>
        {task.due_date && <div className="cal-evt-row"><span className="cal-evt-label">Due</span><span>{formatDate(task.due_date)}{task.due_time ? ` ${fmtTime(task.due_time)}` : ''}</span></div>}
        {task.start_date && <div className="cal-evt-row"><span className="cal-evt-label">Start</span><span>{formatDate(task.start_date)}</span></div>}
        {task.end_date && <div className="cal-evt-row"><span className="cal-evt-label">End</span><span>{formatDate(task.end_date)}</span></div>}
        {task.reminder && <div className="cal-evt-row"><span className="cal-evt-label">Reminder</span><span><Icon name="bell" size={13} /> {task.reminder_time ? fmtTime(task.reminder_time) : 'On'}</span></div>}
        {caseTitle && <div className="cal-evt-row"><span className="cal-evt-label">Case</span><span>{caseTitle}</span></div>}
        {task.hearing_id && <div className="cal-evt-row"><span className="cal-evt-label">Hearing</span><span>{task.hearing_id}</span></div>}
        {task.tags && <div className="cal-evt-row"><span className="cal-evt-label">Tags</span><span>{task.tags.split(',').map((tg) => <span key={tg} className="task-tag">{tg.trim()}</span>)}</span></div>}
        {task.created_at && <div className="cal-evt-row"><span className="cal-evt-label">Created</span><span>{formatDate(task.created_at)}</span></div>}
        {task.updated_at && <div className="cal-evt-row"><span className="cal-evt-label">Updated</span><span>{formatDate(task.updated_at)}</span></div>}
      </div>
    </Modal>
  );
}
