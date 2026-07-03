import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/hooks/useDashboard.js';
import Icon from '@/components/Icon.jsx';
import Badge from '@/components/Badge.jsx';
import Spinner from '@/components/Spinner.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import { formatDate } from '@/utils/format.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';

/* ---- helpers ---- */

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
            className="dash-donut-segment"
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
  { icon: 'calendar', color: 'red', title: 'Schedule Hearing', sub: 'Add new hearing date', route: '/cases/order-sheet' },
];

const DOC_COLORS = { pdf: 'pdf', docx: 'doc', doc: 'doc' };

function docIconVariant(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  return DOC_COLORS[ext] || 'other';
}

const BAR_COLORS = ['#6d4fe8', '#1f9d6b', '#e07b00', '#2547a3', '#888'];

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
    <><div className="fade-in dash-desktop-view dash-desktop-view__pb">

      {/* ---- Greeting row ---- */}
      <div className="dash-greeting-row">
        <div>
          <h1 className="dash-greeting__title">{greeting}, {user?.name || 'Admin'} 👋</h1>
          <p className="dash-greeting__sub">Here's what's happening with your legal practice today.</p>
        </div>
        <div className="dash-greeting__actions">
          <div className="dash-date-badge">
            <Icon name="calendar" size={15} />
            <span>{formatDate(new Date())}</span>
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
            <Icon name="list" size={15} className="dash-card-head__icon" />
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
                    <div className="flex-row gap-8 items-center">
                      <span className="dash-donut-legend__value">{s.value}</span>
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
            <span className="dash-card-head__link" onClick={() => nav('/cases/order-sheet')}>View All <Icon name="arrow" size={13} /></span>
          </div>
          {upcomingHearings.length === 0 ? (
            <div className="dash-padded-content">
              <EmptyState icon="calendar" title="No upcoming hearings." />
            </div>
          ) : upcomingHearings.slice(0, 5).map((h, i) => (
            <div className="dash-hearing-row" key={h.id} onClick={() => nav('/cases/order-sheet')}>
              <div className={`dash-hearing-icon dash-hearing-icon--${HEARING_ICONS[i % HEARING_ICONS.length]}`}>
                <Icon name="calendar" size={16} />
              </div>
              <div className="flex-1 min-w-0">
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
        <div className="card dash-card--col1">
          <div className="dash-card-head">
            <span className="dash-card-head__title">Recent Cases</span>
            <span className="dash-card-head__link" onClick={() => nav('/cases')}>View All <Icon name="arrow" size={13} /></span>
          </div>
          {activeCases.length === 0 ? (
            <div className="dash-padded-content"><EmptyState icon="vault" title="No cases yet." /></div>
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
                    <td className="dash-cases__client">{c.client || '—'}</td>
                    <td><Badge tone={c.status === 'Active' ? 'green' : c.status === 'On Hold' ? 'amber' : 'grey'} dot>{c.status || 'Active'}</Badge></td>
                    <td className="dash-cases__date">{formatDate(c.updatedAt || c.createdAt)}</td>
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
                <Icon name="chevron" size={15} className="dash-chevron" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Recent Documents ---- */}
      <div>
        <div className="dash-card-head dash-card-head--documents">
          <span className="dash-card-head__title dash-card-head__title--lg">Recent Documents</span>
          <span className="dash-card-head__link" onClick={() => nav('/documents')}>View All <Icon name="arrow" size={13} /></span>
        </div>
        {recentDocuments.length === 0 ? (
          <EmptyState icon="file" title="No documents yet." />
        ) : (
          <div className="dash-doc-grid">
            {recentDocuments.slice(0, 5).map((d) => {
              const variant = docIconVariant(d.name);
              return (
                <div className="dash-doc-row" key={d.id} onClick={() => nav('/documents')}>
                  <div className="dash-doc-icon-row">
                    <div className={`dash-doc-icon dash-doc-icon--${variant}`}><Icon name="file" size={18} /></div>
                    <div className="flex-1 min-w-0">
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

        <div className="lexm-greeting">
          <h1>{greeting}, {user?.name || 'Admin'} 👋</h1>
          <p>Here&apos;s what&apos;s happening with your legal practice today.</p>
        </div>

        <div className="lexm-date-row">
          <div className="lexm-date">
            <Icon name="calendar" size={17} />
            {formatDate(new Date())}
          </div>
          <button className="lexm-add-btn" onClick={() => nav('/cases/create')}>
            <Icon name="plus" size={15} />
            Add New
          </button>
        </div>

        <div className="lexm-stat-grid">
          {[
            { label: 'Total Cases', value: totalCases, icon: 'doc', tone: 'blue' },
            { label: 'Active Cases', value: activeCnt, icon: 'folder', tone: 'green' },
            { label: 'Closed Cases', value: closedCnt, icon: 'check-circle', tone: 'amber' },
            { label: 'Hearings This Month', value: hearingsCnt, icon: 'calendar', tone: 'red' },
            { label: 'Documents', value: docsCnt, icon: 'doc', tone: 'purple' },
          ].map((s) => (
            <div className="lexm-stat-card" key={s.label}>
              <div className="lexm-stat-top">
                <div className={`lexm-stat-icon tone-${s.tone}`}><Icon name={s.icon} size={17} /></div>
                <div className="lexm-stat-value">{s.value}</div>
              </div>
              <div className="lexm-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="lexm-card">
          <div className="lexm-card-head">
            <span className="lexm-card-head__title">Case Status Overview</span>
            <button className="lexm-card-head__icon-btn" aria-label="More options">
              <Icon name="more-horizontal" size={18} />
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
            <span className="lexm-card-head__link" onClick={() => nav('/cases/order-sheet')}>View All</span>
          </div>
          {upcomingHearings.length === 0 ? (
            <div className="lexm-empty">
              <div className="lexm-empty-icon"><Icon name="calendar" size={22} /></div>
              <p className="lexm-empty-title">No upcoming hearings.</p>
              <p className="lexm-empty-sub">You&apos;re all caught up!</p>
            </div>
          ) : upcomingHearings.slice(0, 3).map((h) => (
            <div className="lexm-case-row" key={h.id} onClick={() => nav('/cases/order-sheet')}>
              <div className="lexm-case-icon lexm-case-icon--hearing">
                <Icon name="calendar" size={16} />
              </div>
              <div className="lexm-case-text">
                <div className="lexm-case-title">{h.purpose || 'Hearing'}</div>
                <div className="lexm-case-client">{h.caseTitle || h.purpose || '—'}</div>
              </div>
              <div className="lexm-case-right">
                <span className="lexm-case-date">{formatDate(h.date)}</span>
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
              <div className="lexm-empty-icon"><Icon name="briefcase" size={22} /></div>
              <p className="lexm-empty-title">No cases yet.</p>
              <p className="lexm-empty-sub">Create your first case to get started.</p>
            </div>
          ) : activeCases.slice(0, 3).map((c) => (
            <div className="lexm-case-row" key={c.id} onClick={() => nav(`/cases/${c.id}`)}>
              <div className="lexm-case-icon"><Icon name="users" size={16} /></div>
              <div className="lexm-case-text">
                <div className="lexm-case-title">{c.title || c.caseNumber}</div>
                <div className="lexm-case-client">Client: {c.client || '—'}</div>
              </div>
              <div className="lexm-case-right">
                <span className="lexm-badge">{c.status || 'Active'}</span>
                <Icon name="chevron" size={16} className="dash-chevron" />
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
              { icon: 'briefcase', label: 'Add New Case', tone: 'blue', route: '/cases/create' },
              { icon: 'user-plus', label: 'Add New Client', tone: 'green', route: '/clients' },
              { icon: 'doc', label: 'Upload Document', tone: 'amber', route: '/documents' },
              { icon: 'calendar', label: 'Schedule Hearing', tone: 'red', route: '/cases/order-sheet' },
            ].map((a) => (
              <button className={`lexm-qa-tile tone-${a.tone}`} key={a.label} onClick={() => nav(a.route)}>
                <span className="lexm-qa-icon"><Icon name={a.icon} size={19} /></span>
                <span className="lexm-qa-label">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lexm-card">
          <div className="lexm-card-head">
            <span className="lexm-card-head__title">Recent Documents</span>
            <span className="lexm-card-head__link" onClick={() => nav('/documents')}>View All</span>
          </div>
          {recentDocuments.length === 0 ? (
            <div className="lexm-empty">
              <div className="lexm-empty-icon"><Icon name="doc" size={22} /></div>
              <p className="lexm-empty-title">No documents yet.</p>
              <p className="lexm-empty-sub">Upload documents to your cases.</p>
            </div>
          ) : recentDocuments.slice(0, 3).map((d) => (
            <div className="lexm-doc-row" key={d.id}>
              <div className="lexm-doc-icon"><Icon name="doc" size={19} /></div>
              <div className="lexm-doc-text">
                <div className="lexm-doc-name">{d.name}</div>
                <div className="lexm-doc-meta">{formatDate(d.uploadedAt)} &nbsp;•&nbsp; {(d.name||'').split('.').pop().toUpperCase() || 'FILE'}</div>
              </div>
              <button className="lexm-doc-dl" aria-label="Download"><Icon name="download" size={16} /></button>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}
