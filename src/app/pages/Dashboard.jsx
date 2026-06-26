import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/hooks/useDashboard.js';
import Icon from '@/components/Icon.jsx';
import Badge from '@/components/Badge.jsx';
import Spinner from '@/components/Spinner.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import { formatDate } from '@/utils/format.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';

/* ---- helpers ---- */
function today() {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DonutChart({ segments, size = 120, stroke = 18 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;
  let offset = 0;
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0) || 1;
  return (
    <svg width={size} height={size} className="dash-donut-svg" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * circ;
        const gap = circ - dash;
        const el = (
          <circle
            key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset * circ}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dasharray 0.5s ease' }}
          />
        );
        offset += pct;
        return el;
      })}
      {/* centre label */}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--navy-900)">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="var(--text-faint)">Total Cases</text>
    </svg>
  );
}

const HEARING_ICONS = ['blue', 'amber', 'green', 'navy', 'blue', 'amber'];

const QUICK_ACTIONS = [
  { icon: 'calendar', color: 'blue', title: 'Add New Case', sub: 'Create a new case', route: '/cases/create' },
  { icon: 'users', color: 'green', title: 'Add New Client', sub: 'Register a new client', route: '/clients' },
  { icon: 'upload', color: 'amber', title: 'Upload Document', sub: 'Add documents to case', route: '/documents' },
  { icon: 'calendar', color: 'red', title: 'Schedule Hearing', sub: 'Add new hearing date', route: '/cause-list' },
];

const DOC_COLORS = { pdf: 'pdf', docx: 'doc', doc: 'doc' };

function docIconVariant(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  return DOC_COLORS[ext] || 'other';
}

const BAR_COLORS = ['#6d4fe8', '#1f9d6b', '#e07b00', '#2547a3', '#888'];

/* ---- Mobile view SVG icon components (stroke-based line icons) ---- */
const MenuIcon = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const BellIcon = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const CalendarIcon = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const PlusIcon = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const FileTextIcon = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const FolderIcon = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);
const CheckCircleIcon = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const UsersIcon = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const BriefcaseIcon = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);
const UserPlusIcon = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" />
  </svg>
);
const ChevronRightIcon = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const HomeIcon = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const MoreHorizontalIcon = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" {...p}>
    <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);
const MoreDotsIcon = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" {...p}>
    <circle cx="4.5" cy="12" r="1.9" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none" /><circle cx="19.5" cy="12" r="1.9" fill="currentColor" stroke="none" />
  </svg>
);
const DownloadIcon = (p) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const BriefcaseDuoIcon = ({ size = 21, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3" y="7" width="18" height="12" rx="2.5" fill="currentColor" fillOpacity="0.92" />
    <circle cx="12" cy="13" r="1.7" fill="var(--surface)" /><circle cx="12" cy="13" r="0.6" fill="currentColor" />
  </svg>
);
/* ---------------------------------------------------------------*/

export default function Dashboard() {
  const { data, loading } = useDashboard();
  const nav = useNavigate();
  const { user } = useAuth();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (!data) return <EmptyState title="Could not load dashboard." />;

  const { stats, activeCases, recentDrafts, recentDocuments, upcomingHearings, caseTypeDistribution } = data;

  /* Build derived stats */
  const totalCases = stats.totalCases ?? 0;
  const activeCnt = stats.activeCases ?? 0;
  const onHoldCnt = stats.onHoldCases ?? 0;
  const closedCnt = Math.max(0, totalCases - activeCnt - onHoldCnt);
  const docsCnt = stats.documents ?? 0;
  const hearingsCnt = stats.hearings ?? 0;
  const draftCnt = stats.drafts ?? 0;

  /* Mobile donut chart computation */
  const donutR = 50;
  const donutCirc = 2 * Math.PI * donutR;
  const activePct = totalCases > 0 ? activeCnt / totalCases : 0;
  const donutDash = activePct * donutCirc;
  const donutGap = donutCirc - donutDash;

  const donutSegments = [
    { label: 'Active', value: activeCnt, color: '#2547a3', pct: totalCases ? ((activeCnt / totalCases) * 100).toFixed(1) : 0 },
    { label: 'Closed', value: closedCnt, color: '#1f9d6b', pct: totalCases ? ((closedCnt / totalCases) * 100).toFixed(1) : 0 },
    { label: 'On Hold', value: onHoldCnt, color: '#e07b00', pct: totalCases ? ((onHoldCnt / totalCases) * 100).toFixed(1) : 0 },
    { label: 'Draft', value: draftCnt, color: '#d4d9e8', pct: '0.0' },
  ];

  /* Case type distribution bars */
  const categories = caseTypeDistribution && caseTypeDistribution.length > 0
    ? caseTypeDistribution
    : [{ label: 'No data', value: 1 }];
  const maxCat = Math.max(...categories.map((c) => c.value));

  return (
    <><div className="fade-in dash-desktop-view" style={{ paddingBottom: 40 }}>

      {/* ---- Greeting row ---- */}
      <div className="dash-greeting-row">
        <div>
          <h1 className="dash-greeting__title">{greeting}, {user?.name || 'Admin'} 👋</h1>
          <p className="dash-greeting__sub">Here's what's happening with your legal practice today.</p>
        </div>
        <div className="dash-greeting__actions">
          <div className="dash-date-badge">
            <Icon name="calendar" size={15} />
            <span>{today()}</span>
          </div>
          <button className="btn btn--primary" onClick={() => nav('/cases/create')}>
            <Icon name="plus" size={15} /> Add New
          </button>
        </div>
      </div>

      {/* ---- Stat row ---- */}
      <div className="dash-stats">
        <div className="dash-stat">
          <div className="dash-stat__icon-wrap dash-stat__icon-wrap--blue"><Icon name="vault" size={22} /></div>
          <div className="dash-stat__body">
            <div className="dash-stat__value">{totalCases}</div>
            <div className="dash-stat__label">Total Cases</div>
          </div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat__icon-wrap dash-stat__icon-wrap--green"><Icon name="folder" size={22} /></div>
          <div className="dash-stat__body">
            <div className="dash-stat__value">{activeCnt}</div>
            <div className="dash-stat__label">Active Cases</div>
          </div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat__icon-wrap dash-stat__icon-wrap--orange"><Icon name="check" size={22} /></div>
          <div className="dash-stat__body">
            <div className="dash-stat__value">{closedCnt}</div>
            <div className="dash-stat__label">Closed Cases</div>
          </div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat__icon-wrap dash-stat__icon-wrap--red"><Icon name="calendar" size={22} /></div>
          <div className="dash-stat__body">
            <div className="dash-stat__value">{hearingsCnt}</div>
            <div className="dash-stat__label">Hearings This Month</div>
          </div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat__icon-wrap dash-stat__icon-wrap--purple"><Icon name="file" size={22} /></div>
          <div className="dash-stat__body">
            <div className="dash-stat__value">{docsCnt}</div>
            <div className="dash-stat__label">Documents</div>
          </div>
        </div>
      </div>

      {/* ---- Row 1: Case Status | Upcoming Hearings ---- */}
      <div className="dash-grid-2">

        {/* Case Status Overview */}
        <div className="card">
          <div className="dash-card-head">
            <span className="dash-card-head__title">Case Status Overview</span>
            <Icon name="list" size={15} style={{ color: 'var(--text-faint)', cursor: 'pointer' }} />
          </div>
          <div className="dash-donut-wrap">
            <div className="dash-donut-row">
              <DonutChart segments={donutSegments} size={130} stroke={20} />
              <div className="dash-donut-legend">
                {donutSegments.map((s) => (
                  <div className="dash-donut-legend__item" key={s.label}>
                    <div className="dash-donut-legend__left">
                      <span className="dash-donut-legend__dot" style={{ background: s.color }} />
                      {s.label}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy-900)' }}>{s.value}</span>
                      <span className="dash-donut-legend__pct">({s.pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Hearings */}
        <div className="card">
          <div className="dash-card-head">
            <span className="dash-card-head__title">Upcoming Hearings</span>
            <span className="dash-card-head__link" onClick={() => nav('/cause-list')}>View All <Icon name="arrow" size={13} /></span>
          </div>
          {upcomingHearings.length === 0 ? (
            <div style={{ padding: '20px 18px' }}>
              <EmptyState icon="calendar" title="No upcoming hearings." />
            </div>
          ) : upcomingHearings.slice(0, 5).map((h, i) => (
            <div className="dash-hearing-row" key={h.id} onClick={() => nav('/cause-list')}>
              <div className={`dash-hearing-icon dash-hearing-icon--${HEARING_ICONS[i % HEARING_ICONS.length]}`}>
                <Icon name="calendar" size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="dash-hearing__title">{h.purpose || 'Hearing'}</div>
                <div className="dash-hearing__sub">{h.caseTitle || h.purpose || '—'}</div>
              </div>
              <div className="dash-hearing__date-col">
                <div className="dash-hearing__date">{formatDate(h.date)}</div>
                <div className="dash-hearing__time">{h.time || '10:00 AM'}</div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* ---- Row 2: Recent Cases | Category Distribution | Quick Actions ---- */}
      <div className="dash-grid-3">

        {/* Recent Cases */}
        <div className="card" style={{ gridColumn: '1 / 2' }}>
          <div className="dash-card-head">
            <span className="dash-card-head__title">Recent Cases</span>
            <span className="dash-card-head__link" onClick={() => nav('/cases')}>View All <Icon name="arrow" size={13} /></span>
          </div>
          {activeCases.length === 0 ? (
            <div style={{ padding: '20px 18px' }}><EmptyState icon="vault" title="No cases yet." /></div>
          ) : (
            <table className="dash-cases-table">
              <thead>
                <tr>
                  <th>Case Title</th>
                  <th>Case Number</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {activeCases.slice(0, 5).map((c) => (
                  <tr key={c.id} onClick={() => nav(`/cases/${c.id}`)}>
                    <td><span className="dash-case-title">{c.title || c.caseNumber}</span></td>
                    <td><span className="dash-case-num">{c.caseNumber}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--text-soft)' }}>{c.client || '—'}</td>
                    <td><Badge tone={c.status === 'Active' ? 'green' : c.status === 'On Hold' ? 'amber' : 'grey'}>{c.status || 'Active'}</Badge></td>
                    <td style={{ fontSize: 12, color: 'var(--text-faint)' }}>{formatDate(c.updatedAt || c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Category Distribution */}
        <div className="card">
          <div className="dash-card-head">
            <span className="dash-card-head__title">Case Category Distribution</span>
            <span className="dash-card-head__link" onClick={() => nav('/reports')}>View Report <Icon name="arrow" size={13} /></span>
          </div>
          <div className="dash-bar-chart">
            <div className="dash-bars">
              {categories.map((cat, i) => (
                <div className="dash-bar-item" key={cat.label}>
                  <div className="dash-bar__val">{cat.value}</div>
                  <div className="dash-bar-track">
                    <div
                      className="dash-bar-fill"
                      style={{
                        height: `${(cat.value / maxCat) * 100}%`,
                        background: BAR_COLORS[i % BAR_COLORS.length],
                      }}
                    />
                  </div>
                  <div className="dash-bar__label">{cat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="dash-card-head">
            <span className="dash-card-head__title">Quick Actions</span>
          </div>
          <div className="dash-quick-actions">
            {QUICK_ACTIONS.map((qa) => (
              <div className="dash-qa-item" key={qa.title} onClick={() => nav(qa.route)}>
                <div className="dash-qa-item__left">
                  <div className={`dash-qa-icon dash-qa-icon--${qa.color}`}><Icon name={qa.icon} size={18} /></div>
                  <div>
                    <div className="dash-qa__title">{qa.title}</div>
                    <div className="dash-qa__sub">{qa.sub}</div>
                  </div>
                </div>
                <Icon name="chevron" size={15} style={{ color: 'var(--text-faint)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Recent Documents ---- */}
      <div>
        <div className="dash-card-head" style={{ border: 'none', padding: '0 0 14px', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
          <span className="dash-card-head__title" style={{ fontSize: 16 }}>Recent Documents</span>
          <span className="dash-card-head__link" onClick={() => nav('/documents')}>View All <Icon name="arrow" size={13} /></span>
        </div>
        {recentDocuments.length === 0 ? (
          <EmptyState icon="file" title="No documents yet." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {recentDocuments.slice(0, 5).map((d) => {
              const variant = docIconVariant(d.name);
              return (
                <div className="dash-doc-row" key={d.id} onClick={() => nav('/documents')}>
                  <div className="dash-doc-icon-row">
                    <div className={`dash-doc-icon dash-doc-icon--${variant}`}><Icon name="file" size={18} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="dash-doc__name">{d.name}</div>
                      <div className="dash-doc__date">{formatDate(d.uploadedAt)}</div>
                    </div>
                  </div>
                  <div className="dash-doc__case">{d.folder || d.caseTitle || '—'}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

      {/* ===== Mobile / Tablet Portrait View ===== */}
      <div className="dash-mobile-view">
        <div className="lexm-header">
          <button className="lexm-menu-btn" aria-label="Menu"><MenuIcon size={19} /></button>
          <div className="lexm-greeting">
            <h1>{greeting}, {user?.name || 'Admin'} 👋</h1>
            <p>Here&apos;s what&apos;s happening with your legal practice today.</p>
          </div>
          <div className="lexm-header-actions">
            <button className="lexm-bell" aria-label="Notifications">
              <BellIcon size={18} />
              <span className="lexm-bell-badge">3</span>
            </button>
            <div className="lexm-avatar">{(user?.name || 'A')[0]}</div>
          </div>
        </div>

        <div className="lexm-date-row">
          <div className="lexm-date">
            <CalendarIcon size={17} />
            {today()}
          </div>
          <button className="lexm-add-btn" onClick={() => nav('/cases/create')}>
            <PlusIcon size={15} />
            Add New
          </button>
        </div>

        <div className="lexm-stat-grid">
          {[
            { label: 'Total Cases', value: totalCases, icon: FileTextIcon, tone: 'blue' },
            { label: 'Active Cases', value: activeCnt, icon: FolderIcon, tone: 'green' },
            { label: 'Closed Cases', value: closedCnt, icon: CheckCircleIcon, tone: 'amber' },
            { label: 'Hearings This Month', value: hearingsCnt, icon: CalendarIcon, tone: 'red' },
            { label: 'Documents', value: docsCnt, icon: FileTextIcon, tone: 'purple' },
          ].map((s) => {
            const Ic = s.icon;
            return (
              <div className="lexm-stat-card" key={s.label}>
                <div className="lexm-stat-top">
                  <div className={`lexm-stat-icon tone-${s.tone}`}><Ic size={17} /></div>
                  <div className="lexm-stat-value">{s.value}</div>
                </div>
                <div className="lexm-stat-label">{s.label}</div>
              </div>
            );
          })}
        </div>

        <div className="lexm-card">
          <div className="lexm-card-head">
            <span className="lexm-card-head__title">Case Status Overview</span>
            <button className="lexm-card-head__icon-btn" aria-label="More options">
              <MoreHorizontalIcon size={18} />
            </button>
          </div>
          <div className="lexm-card-body">
            <div className="lexm-donut-row">
              <svg width="128" height="128" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={donutR} fill="none" stroke="var(--border)" strokeWidth="14" />
                <circle cx="60" cy="60" r={donutR} fill="none" stroke="var(--navy-700)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${donutDash} ${donutGap}`} transform="rotate(-90 60 60)" />
                <text x="60" y="57" textAnchor="middle" className="lexm-donut-center-value">{totalCases}</text>
                <text x="60" y="74" textAnchor="middle" className="lexm-donut-center-label">Total Cases</text>
              </svg>
              <div className="lexm-legend">
                {[
                  { label: 'Active', value: activeCnt, pct: totalCases ? ((activeCnt / totalCases) * 100).toFixed(0) + '%' : '0%', tone: 'blue' },
                  { label: 'Closed', value: closedCnt, pct: totalCases ? ((closedCnt / totalCases) * 100).toFixed(0) + '%' : '0%', tone: 'green' },
                  { label: 'On Hold', value: onHoldCnt, pct: totalCases ? ((onHoldCnt / totalCases) * 100).toFixed(0) + '%' : '0%', tone: 'amber' },
                  { label: 'Draft', value: draftCnt, pct: '0%', tone: 'grey' },
                ].map((l) => (
                  <div className="lexm-legend-item" key={l.label}>
                    <div className="lexm-legend-left">
                      <span className={`lexm-legend-dot tone-${l.tone}`} />
                      {l.label}
                    </div>
                    <div className="lexm-legend-right">
                      <span className="lexm-legend-value">{l.value}</span>
                      <span className="lexm-legend-pct">({l.pct})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lexm-card">
          <div className="lexm-card-head">
            <span className="lexm-card-head__title">Upcoming Hearings</span>
            <span className="lexm-card-head__link" onClick={() => nav('/cause-list')}>View All</span>
          </div>
          {upcomingHearings.length === 0 ? (
            <div className="lexm-empty">
              <div className="lexm-empty-icon"><CalendarIcon size={22} /></div>
              <p className="lexm-empty-title">No upcoming hearings.</p>
              <p className="lexm-empty-sub">You&apos;re all caught up!</p>
            </div>
          ) : upcomingHearings.slice(0, 3).map((h) => (
            <div className="lexm-case-row" key={h.id} onClick={() => nav('/cause-list')}>
              <div className="lexm-case-icon" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>
                <CalendarIcon size={16} />
              </div>
              <div className="lexm-case-text">
                <div className="lexm-case-title">{h.purpose || 'Hearing'}</div>
                <div className="lexm-case-client">{h.caseTitle || h.purpose || '—'}</div>
              </div>
              <div className="lexm-case-right">
                <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--navy-600)', whiteSpace: 'nowrap' }}>{formatDate(h.date)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="lexm-card">
          <div className="lexm-card-head">
            <span className="lexm-card-head__title">Recent Cases</span>
            <span className="lexm-card-head__link" onClick={() => nav('/cases')}>View All</span>
          </div>
          {activeCases.length === 0 ? (
            <div className="lexm-empty">
              <div className="lexm-empty-icon"><BriefcaseIcon size={22} /></div>
              <p className="lexm-empty-title">No cases yet.</p>
              <p className="lexm-empty-sub">Create your first case to get started.</p>
            </div>
          ) : activeCases.slice(0, 3).map((c) => (
            <div className="lexm-case-row" key={c.id} onClick={() => nav(`/cases/${c.id}`)}>
              <div className="lexm-case-icon"><UsersIcon size={16} /></div>
              <div className="lexm-case-text">
                <div className="lexm-case-title">{c.title || c.caseNumber}</div>
                <div className="lexm-case-client">Client: {c.client || '—'}</div>
              </div>
              <div className="lexm-case-right">
                <span className="lexm-badge">{c.status || 'Active'}</span>
                <ChevronRightIcon size={16} style={{ color: 'var(--text-faint)' }} />
              </div>
            </div>
          ))}
        </div>

        <div className="lexm-card">
          <div className="lexm-card-head">
            <span className="lexm-card-head__title">Quick Actions</span>
          </div>
          <div className="lexm-qa-grid">
            {[
              { icon: BriefcaseIcon, label: 'Add New Case', tone: 'blue', route: '/cases/create' },
              { icon: UserPlusIcon, label: 'Add New Client', tone: 'green', route: '/clients' },
              { icon: FileTextIcon, label: 'Upload Document', tone: 'amber', route: '/documents' },
              { icon: CalendarIcon, label: 'Schedule Hearing', tone: 'red', route: '/cause-list' },
            ].map((a) => {
              const Ic = a.icon;
              return (
                <button className={`lexm-qa-tile tone-${a.tone}`} key={a.label} onClick={() => nav(a.route)}>
                  <span className="lexm-qa-icon"><Ic size={19} /></span>
                  <span className="lexm-qa-label">{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lexm-card">
          <div className="lexm-card-head">
            <span className="lexm-card-head__title">Recent Documents</span>
            <span className="lexm-card-head__link" onClick={() => nav('/documents')}>View All</span>
          </div>
          {recentDocuments.length === 0 ? (
            <div className="lexm-empty">
              <div className="lexm-empty-icon"><FileTextIcon size={22} /></div>
              <p className="lexm-empty-title">No documents yet.</p>
              <p className="lexm-empty-sub">Upload documents to your cases.</p>
            </div>
          ) : recentDocuments.slice(0, 3).map((d) => (
            <div className="lexm-doc-row" key={d.id}>
              <div className="lexm-doc-icon"><FileTextIcon size={19} /></div>
              <div className="lexm-doc-text">
                <div className="lexm-doc-name">{d.name}</div>
                <div className="lexm-doc-meta">{formatDate(d.uploadedAt)} &nbsp;•&nbsp; {(d.name||'').split('.').pop().toUpperCase() || 'FILE'}</div>
              </div>
              <button className="lexm-doc-dl" aria-label="Download"><DownloadIcon size={16} /></button>
            </div>
          ))}
        </div>

        <div className="lexm-navwrap">
          <div className="lexm-navbar">
            <svg className="lexm-navbg" viewBox="0 0 400 78" preserveAspectRatio="none">
              <path d="M10 0 H140 C168 0 176 34 200 34 C224 34 232 0 260 0 H390 Q400 0 400 10 V78 H0 V10 Q0 0 10 0 Z" fill="currentColor" />
            </svg>
            <div className="lexm-navitems">
              {[
                { key: 'dashboard', label: 'Dashboard', icon: HomeIcon },
                { key: 'matters', label: 'Matters', icon: BriefcaseDuoIcon },
                { key: 'add', label: 'Add', icon: PlusIcon },
                { key: 'calendar', label: 'Calendar', icon: CalendarIcon },
                { key: 'more', label: 'More', icon: MoreDotsIcon },
              ].map((item) => {
                const Ic = item.icon;
                if (item.key === 'add') {
                  return (
                    <button key={item.key} className="lexm-navitem lexm-navitem--fab" onClick={() => nav('/cases/create')}>
                      <span className="lexm-fab"><Ic size={24} /></span>
                      <span>{item.label}</span>
                    </button>
                  );
                }
                return (
                  <button key={item.key} className={`lexm-navitem ${item.key === 'dashboard' ? 'is-active' : ''}`} onClick={() => nav('/' + (item.key === 'dashboard' ? '' : item.key))}>
                    <Ic size={21} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}