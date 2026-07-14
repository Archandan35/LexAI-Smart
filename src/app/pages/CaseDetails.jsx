import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Badge from '@/components/Badge.jsx';
import Icon from '@/components/Icon.jsx';
import Modal from '@/components/Modal.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Spinner from '@/components/Spinner.jsx';
import CaseForm from '@/components/CaseForm.jsx';
import CaseHistory from '@/components/CaseHistory.jsx';
import CaseDocTab from '@/components/CaseDocTab.jsx';
import NotesPanel from '@/components/NotesPanel.jsx';
import CaseTimeline from '@/components/CaseTimeline.jsx';
import RemindersPanel from '@/components/RemindersPanel.jsx';
import PermissionGate from '@/components/PermissionGate.jsx';
import { caseLogic } from '@/logic/caseLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { combinedCourt } from '@/utils/caseFormat.js';
import { exportJson } from '@/utils/exportData.js';
import { formatDate, formatDateTime, stripHtml } from '@/utils/format.js';
import { DateEngine } from '@/core/DateEngine.js';
import { usePriorities } from '@/hooks/usePriorities.js';
import { useCaseTypes } from '@/hooks/useCaseTypes.js';
import HearingFormModal from '@/components/HearingFormModal.jsx';

const TABS = ['Overview', 'Parties', 'Court Info', 'Case Tracking', 'Identifiers', 'Documents', 'Hearings', 'Timeline', 'Notes', 'History'];

export default function CaseDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { priorities } = usePriorities();
  const priorityTone = Object.fromEntries((priorities || []).map((p) => [p.name, p.color || 'grey']));
  const { caseTypes } = useCaseTypes();
  const resolveCaseType = useCallback((ct) => {
    if (!ct) return '';
    const match = caseTypes.find((t) => t.name?.toLowerCase() === ct.toLowerCase() || t.short_code?.toLowerCase() === ct.toLowerCase());
    return match ? match.name : ct;
  }, [caseTypes]);
  const [params, setParams] = useSearchParams();
  const [vault, setVault] = useState(null);
  const [tab, setTab] = useState(params.get('tab') || 'Overview');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activityKey, setActivityKey] = useState(0);
  const [showDeleteDlg, setShowDeleteDlg] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991);

  const goToTab = useCallback((t) => {
    setTab(t);
    if (t === 'Overview') {
      if (params.has('tab')) {
        params.delete('tab');
        setParams(params, { replace: true });
      }
    } else if (params.get('tab') !== t) {
      params.set('tab', t);
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const [hearingOpen, setHearingOpen] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 991px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    handler(mql);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await caseLogic.vault(id);
      setVault(res.ok ? res.data : null);
    } catch {
      setVault(null);
    }
    setLoading(false);
    setActivityKey((k) => k + 1);
  }, [id]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useEffect(() => { if (params.get('edit')) { setEditing(true); } }, [params]);

  const saveEdit = async (data) => {
    setBusy(true);
    try {
      await caseLogic.update(id, data, user);
      setEditing(false);
      if (params.get('edit')) { params.delete('edit'); setParams(params, { replace: true }); }
      toast.push('Case updated.', 'success');
      load();
    } catch (e) {
      toast.push(e?.message || 'Failed to update case.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async () => {
    const r = await caseLogic.duplicate(id, user);
    if (r.ok) { toast.push('Case duplicated.', 'success'); nav(`/cases/${r.data.id}`); }
    else toast.push(r.error, 'error');
  };
  const exportCase = async () => exportJson(`case_${vault?.case?.caseNumber}`, await caseLogic.exportBundle(id));
  const archive = async () => { try { await caseLogic.setArchived(id, !vault?.case?.archived, user); toast.push(vault?.case?.archived ? 'Case restored.' : 'Case archived.', 'success'); load(); } catch (e) { toast.push(e?.message || 'Archive failed.', 'error'); } };
  const remove = async (deleteFolders) => {
    try {
      await caseLogic.remove(id, user, deleteFolders);
      toast.push('Case deleted.', 'info');
      nav('/cases');
    } catch (e) {
      toast.push(e?.message || 'Failed to delete case.', 'error');
    }
  };

  if (loading) return <Spinner label="Loading case…" />;
  if (!vault?.case) return <EmptyState title="Case not found." action={<Button onClick={() => nav('/cases')}>Back to Manage Cases</Button>} />;

  const c = vault.case;
  const lastHearing = vault.lastHearing;
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingHearing = [...(vault.hearings || [])]
    .filter((h) => (h.date || '').slice(0, 10) >= todayStr)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0]
    || (c.nextHearing && (c.nextHearing || '').slice(0, 10) >= todayStr
      ? { date: c.nextHearing, purpose: 'Next Hearing', status: 'Scheduled' }
      : null);

  const hearings = [...vault.hearings].sort((a, b) => new Date(b.date) - new Date(a.date));
  const documents = vault.documents || [];
  const notes = vault.notes || [];
  const folders = vault.folders || [];

  return (
    <>
      {isMobile && (
        <div className="case-details-mobile-detail">
          <div className="case-details-detail-topbar">
            <button className="case-details-detail-back" onClick={() => nav('/cases')}><Icon name="chevron" size={20} /></button>
            <span className="case-details-detail-topbar__title">Case Detail</span>
            <div className="case-details-detail-topbar__spacer" />
            <button className="case-details-detail-edit-btn" onClick={() => setEditing(true)}><Icon name="edit" size={18} /></button>
          </div>

          <div className="case-details-detail-header">
            <div className="case-details-detail-header__top">
              <div className="case-details-detail-header__number">{c.case_display_number || c.caseNumber}</div>
              <Badge tone={c.archived ? 'amber' : 'green'} dot>{c.status || (c.archived ? 'Archived' : 'Active')}</Badge>
            </div>
            <div className="case-details-detail-header__title">{c.title}</div>
            <div className="case-details-meta">
              <span className="case-details-meta__item"><Icon name="building" size={13} />{c.courtName || combinedCourt(c) || '—'}</span>
              <span className="case-details-meta__item"><Icon name="users" size={13} />{c.judge || '—'}</span>
              <span className="case-details-meta__item"><Icon name="calendar" size={13} />{formatDate(c.filingDate)}</span>
            </div>
          </div>

          <div className="case-details-detail-actions">
            <PermissionGate perm="manageCase.edit"><button className="case-details-detail-actions__btn" onClick={() => setEditing(true)}><Icon name="edit" size={16} /><span>Edit</span></button></PermissionGate>
            <PermissionGate perm="manageCase.create"><button className="case-details-detail-actions__btn" onClick={duplicate}><Icon name="layers" size={16} /><span>Duplicate</span></button></PermissionGate>
            <PermissionGate perm="manageCase.export"><button className="case-details-detail-actions__btn" onClick={exportCase}><Icon name="download" size={16} /><span>Export</span></button></PermissionGate>
            <PermissionGate perm="manageCase.archive"><button className="case-details-detail-actions__btn" onClick={archive}><Icon name={c.archived ? 'history' : 'vault'} size={16} /><span>{c.archived ? 'Restore' : 'Archive'}</span></button></PermissionGate>
            <PermissionGate perm="manageCase.delete"><button className="case-details-detail-actions__btn case-details-detail-actions__btn--danger" onClick={() => setShowDeleteDlg(true)}><Icon name="trash" size={16} /><span>Delete</span></button></PermissionGate>
          </div>

          <div className="case-details-detail-metrics">
            <div className="case-details-detail-metric">
              <div className="case-details-detail-metric__label"><Icon name="target" size={13} /> Stage</div>
              <div className="case-details-detail-metric__value">{c.stage || '—'}</div>
            </div>
            <div className="case-details-detail-metric">
              <div className="case-details-detail-metric__label"><Icon name="calendar" size={13} /> Next Hearing</div>
              <div className="case-details-detail-metric__value">{formatDate(c.nextHearing)}</div>
            </div>
            <div className="case-details-detail-metric">
              <div className="case-details-detail-metric__label"><Icon name="alert" size={13} /> Priority</div>
              <div className="case-details-detail-metric__value">{c.priority || '—'}</div>
            </div>
            <div className="case-details-detail-metric">
              <div className="case-details-detail-metric__label"><Icon name="file" size={13} /> Documents</div>
              <div className="case-details-detail-metric__value">{documents.length}</div>
            </div>
            <div className="case-details-detail-metric">
              <div className="case-details-detail-metric__label"><Icon name="list" size={13} /> Hearings</div>
              <div className="case-details-detail-metric__value">{hearings.length}</div>
            </div>
            <div className="case-details-detail-metric">
              <div className="case-details-detail-metric__label"><Icon name="notes" size={13} /> Notes</div>
              <div className="case-details-detail-metric__value">{notes.length}</div>
            </div>
          </div>

          <div className="tabs">
            {TABS.map((t) => (
              <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => goToTab(t)}>
                {t}
                {t === 'Documents' && ` (${documents.length})`}
                {t === 'Hearings' && ` (${hearings.length})`}
                {t === 'Notes' && ` (${notes.length})`}
              </div>
            ))}
          </div>

          {tab === 'Overview' && (
            <>
              <Card title="Case Particulars">
                <div className="case-details-detail-hero">
                  <div className="case-details-detail-hero__icon">
                    <Icon name="route" size={28} />
                  </div>
                  <div>
                    <div className="case-details-detail-hero__title">Case Particulars</div>
                    <div className="case-details-detail-hero__sub">Track the progress and important dates of the case</div>
                  </div>
                </div>

                <div className="case-details-detail-triad">
                  <div className="case-details-detail-triad__item">
                    <div className="case-details-detail-triad__icon case-details-detail-triad__icon--blue">
                      <Icon name="target" size={18} />
                    </div>
                    <div>
                      <div className="case-details-detail-triad__label">Current Stage</div>
                      <div className="case-details-detail-triad__value case-details-detail-triad__value--blue">{c.stage || '—'}</div>
                    </div>
                  </div>
                  <div className="case-details-detail-triad__divider" />
                  <div className="case-details-detail-triad__item">
                    <div className="case-details-detail-triad__icon case-details-detail-triad__icon--green">
                      <Icon name="check-circle" size={18} />
                    </div>
                    <div>
                      <div className="case-details-detail-triad__label">Status</div>
                      <div className="case-details-detail-triad__value case-details-detail-triad__value--green">{c.status || '—'}</div>
                    </div>
                  </div>
                  <div className="case-details-detail-triad__divider" />
                  <div className="case-details-detail-triad__item">
                    <div className="case-details-detail-triad__icon case-details-detail-triad__icon--amber">
                      <Icon name="alert" size={18} />
                    </div>
                    <div>
                      <div className="case-details-detail-triad__label">Priority</div>
                      <div className="case-details-detail-triad__value case-details-detail-triad__value--amber">{c.priority || '—'}</div>
                    </div>
                  </div>
                </div>

                <div className="case-details-detail-chart">
                  <div className="case-details-detail-chart__row">
                    <div className="case-details-detail-chart__icon"><Icon name="file" size={18} /></div>
                    <span className="case-details-detail-chart__label">Case Number</span>
                    <span className="case-details-detail-chart__value">{c.case_display_number || c.caseNumber || '—'}</span>
                  </div>
                  <div className="case-details-detail-chart__row">
                    <div className="case-details-detail-chart__icon"><Icon name="calendar" size={18} /></div>
                    <span className="case-details-detail-chart__label">Case Year</span>
                    <span className="case-details-detail-chart__value">{c.case_year || '—'}</span>
                  </div>
                  <div className="case-details-detail-chart__row">
                    <div className="case-details-detail-chart__icon"><Icon name="layers" size={18} /></div>
                    <span className="case-details-detail-chart__label">Case Type</span>
                    <span className="case-details-detail-chart__value">{resolveCaseType(c.case_type) || '—'}</span>
                  </div>
                  <div className="case-details-detail-chart__row">
                    <div className="case-details-detail-chart__icon"><Icon name="users" size={18} /></div>
                    <span className="case-details-detail-chart__label">Plaintiff</span>
                    <span className="case-details-detail-chart__value">{(() => { const d = (c.plaintiff || c.parties?.plaintiff || '').split(/\s*(?:,| and)\s*/).filter(Boolean); if (d.length === 0) return ''; return <>{d[0].length > 28 ? `${d[0].slice(0, 28)}...` : d[0]}{d.length > 1 && <><span className="mx-4">and</span><Badge tone="navy" className="cd__badge-plus">+{d.length - 1}</Badge></>}</>; })()}</span>
                  </div>
                  <div className="case-details-detail-chart__row">
                    <div className="case-details-detail-chart__icon"><Icon name="shield" size={18} /></div>
                    <span className="case-details-detail-chart__label">Defendant</span>
                    <span className="case-details-detail-chart__value">{(() => { const d = (c.defendant || c.parties?.defendant || '').split(/\s*(?:,| and)\s*/).filter(Boolean); if (d.length === 0) return ''; return <>{d[0].length > 12 ? `${d[0].slice(0, 12)}...` : d[0]}{d.length > 1 && <><span className="mx-4">and</span><Badge tone="navy" className="cd__badge-plus">+{d.length - 1}</Badge></>}</>; })()}</span>
                  </div>
                  <div className="case-details-detail-chart__row">
                    <div className="case-details-detail-chart__icon"><Icon name="building" size={18} /></div>
                    <span className="case-details-detail-chart__label">Court</span>
                    <span className="case-details-detail-chart__value">{c.courtName ? (c.courtName.length > 30 ? `${c.courtName.slice(0, 30)}...` : c.courtName) : '—'}</span>
                  </div>
                  <div className="case-details-detail-chart__row">
                    <div className="case-details-detail-chart__icon"><Icon name="grid" size={18} /></div>
                    <span className="case-details-detail-chart__label">Bench</span>
                    <span className="case-details-detail-chart__value">{c.bench_type || '—'}</span>
                  </div>
                  <div className="case-details-detail-chart__row">
                    <div className="case-details-detail-chart__icon"><Icon name="balance" size={18} /></div>
                    <span className="case-details-detail-chart__label">Judge</span>
                    <span className="case-details-detail-chart__value">{c.judge ? (c.judge.length > 30 ? `${c.judge.slice(0, 30)}...` : c.judge) : '—'}</span>
                  </div>
                  <div className="case-details-detail-chart__row">
                    <div className="case-details-detail-chart__icon"><Icon name="user-plus" size={18} /></div>
                    <span className="case-details-detail-chart__label">Client</span>
                    <span className="case-details-detail-chart__value">{c.client ? (c.client.length > 30 ? `${c.client.slice(0, 30)}...` : c.client) : '—'}</span>
                  </div>
                  <div className="case-details-detail-chart__row">
                    <div className="case-details-detail-chart__icon"><Icon name="briefcase" size={18} /></div>
                    <span className="case-details-detail-chart__label">Advocate</span>
                    <span className="case-details-detail-chart__value">{c.advocate ? (c.advocate.length > 30 ? `${c.advocate.slice(0, 30)}...` : c.advocate) : '—'}</span>
                  </div>
                </div>

                <div className="case-details-detail-note">
                  <div className="case-details-detail-note__left">
                    <Icon name="info" size={20} className="cd__info-icon" />
                    <p className="case-details-detail-note__text">Dates are critical to track case.<br />Stay updated for the next hearing.</p>
                  </div>
                  <div className="case-details-detail-note__deco">
                    <Icon name="gavel" size={48} />
                  </div>
                </div>
              </Card>

              <Card
                title="Description & Summary"
                actions={<PermissionGate perm="manageCase.edit"><button className="linkbtn" onClick={() => setEditing(true)}><Icon name="edit" size={13} /> Edit</button></PermissionGate>}
              >
                <div className="card__sub mb-4">Case Summary</div>
                <p className="case-detail__description">{c.case_summary || c.description || '—'}</p>
                <div className="card__sub mt-10 mb-4">Internal Notes</div>
                <p className="case-detail__description c-text-muted">{c.internal_notes || '—'}</p>
                <div className="case-detail__tags">
                  {c.stage && <span className="tag tag--navy">{c.stage}</span>}
                  {c.status && <span className="tag tag--green">{c.status}</span>}
                  {c.priority && <span className="tag tag--amber">{c.priority}</span>}
                  {(c.tags || []).map((t) => <span key={t} className="tag tag--key">{t}</span>)}
                  <PermissionGate perm="manageCase.edit">
                    <button className="case-detail__add-tag-btn" onClick={() => setEditing(true)}><Icon name="plus" size={12} /> Add Tag</button>
                  </PermissionGate>
                </div>
              </Card>

              <Card
                title="Important Dates"
                actions={<button className="linkbtn" onClick={() => goToTab('Case Tracking')}>View All</button>}
              >
                <div className="case-details-detail-dates">
                  <div className="case-details-detail-dates__cell">
                    <div className="case-details-detail-dates__top">
                      <div className="case-details-detail-dates__icon"><Icon name="calendar" size={15} /></div>
                      <span className="case-details-detail-dates__label">Filing Date</span>
                    </div>
                    <div className="case-details-detail-dates__value">{formatDate(c.filingDate)}</div>
                  </div>
                  <div className="case-details-detail-dates__cell">
                    <div className="case-details-detail-dates__top">
                      <div className="case-details-detail-dates__icon"><Icon name="calendar" size={15} /></div>
                      <span className="case-details-detail-dates__label">Next Hearing</span>
                    </div>
                    <div className="case-details-detail-dates__value">{formatDate(c.nextHearing)}</div>
                  </div>
                  <div className="case-details-detail-dates__cell">
                    <div className="case-details-detail-dates__top">
                      <div className="case-details-detail-dates__icon"><Icon name="gavel" size={15} /></div>
                      <span className="case-details-detail-dates__label">Last Hearing</span>
                    </div>
                    <div className="case-details-detail-dates__value">{lastHearing ? formatDate(lastHearing.date) : '—'}</div>
                  </div>
                  <div className="case-details-detail-dates__cell">
                    <div className="case-details-detail-dates__top">
                      <div className="case-details-detail-dates__icon"><Icon name="balance" size={15} /></div>
                      <span className="case-details-detail-dates__label">Judgment</span>
                    </div>
                    <div className="case-details-detail-dates__value">{formatDate(c.disposal_date)}</div>
                  </div>
                </div>
              </Card>

              <Card
                title="Upcoming Hearing"
                actions={<button className="linkbtn" onClick={() => goToTab('Hearings')}>View All</button>}
              >
                {!upcomingHearing ? (
                  <MiniEmpty icon="calendar" title="No upcoming hearing." />
                ) : (
                  <div className="case-detail__hearing-card">
                    <div className="case-detail__hearing-datebox">
                      <div className="case-detail__hearing-datebox-day">{datePart(upcomingHearing.date, 'day')}</div>
                      <div className="case-detail__hearing-datebox-mon">{datePart(upcomingHearing.date, 'mon')}</div>
                      <div className="case-detail__hearing-datebox-year">{datePart(upcomingHearing.date, 'year')}</div>
                    </div>
                    <div className="case-detail__hearing-info">
                      <div className="case-detail__hearing-title">{c.case_display_number || c.caseNumber || upcomingHearing.purpose || 'Hearing'}</div>
                      <div className="case-detail__hearing-court">{combinedCourt(c)}</div>
                      <div className="mt-8"><Badge tone="navy" dot>{upcomingHearing.status || 'Scheduled'}</Badge></div>
                    </div>
                  </div>
                )}
              </Card>

              <RemindersPanel caseId={id} onChanged={load} />

              <Card
                title="Documents"
                actions={<button className="linkbtn" onClick={() => goToTab('Documents')}>View All</button>}
              >
                {folders.filter((f) => f.kind === 'document').length === 0 && documents.length === 0 ? (
                  <MiniEmpty
                    icon="folder"
                    title="No documents uploaded."
                    hint="Upload or add documents related to this case."
                    action={<PermissionGate perm="manageCase.edit"><Button size="sm" variant="ghost" icon="plus" onClick={() => goToTab('Documents')}>Add Document</Button></PermissionGate>}
                  />
                ) : (
                  folders.filter((f) => f.kind === 'document').map((f) => {
                    const count = documents.filter((d) => d.folder === f.name).length;
                    return (
                      <div className="list-row" key={f.id} onClick={() => goToTab('Documents')}>
                        <div className="list-row__icon"><Icon name="folder" size={15} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="list-row__title">{f.name}</div>
                          <div className="list-row__meta">{count} document{count !== 1 ? 's' : ''}</div>
                        </div>
                        <Icon name="arrow" size={14} />
                      </div>
                    );
                  })
                )}
              </Card>
            </>
          )}

          {tab === 'Parties' && (
            <Card title="Parties">
              <Row label="Plaintiff / Petitioner" value={c.plaintiff || c.parties?.plaintiff} />
              <Row label="Defendant / Respondent" value={c.defendant || c.parties?.defendant} />
              <Row label="Cause Title" value={c.title} />
              <Row label="Advocate" value={c.advocate} />
              <Row label="Client" value={c.client} />
            </Card>
          )}

          {tab === 'Court Info' && (
            <Card title="Court Info">
              <Row label="Court Name" value={c.courtName} />
              <Row label="Bench Type" value={c.bench_type} />
              <Row label="Judge" value={c.judge} />
            </Card>
          )}

          {tab === 'Case Tracking' && (
            <>
              <Card title="Case Tracking">
                <Row label="Current Stage" value={c.stage} />
                <Row label="Status" value={c.status} />
                <Row label="Priority" value={c.priority ? <Badge tone={priorityTone[c.priority] || 'grey'}>{c.priority}</Badge> : '—'} />
                <Row label="Filing Date" value={formatDate(c.filingDate)} />
                <Row label="Registration Date" value={formatDate(c.registration_date)} />
                <Row label="Written Statement Filing Date" value={formatDate(c.wsFilingDate)} />
                <Row label="Next Hearing Date" value={formatDate(c.nextHearing)} />
                <Row label="Last Hearing Date" value={lastHearing ? formatDate(lastHearing.date) : '—'} />
                <Row label="Disposal / Judgment Date" value={formatDate(c.disposal_date)} />
              </Card>
              <Card title="Stage History" sub="Every stage change is tracked permanently">
                {(c.stageHistory || []).length === 0 ? <EmptyState icon="target" title="No stage changes yet." /> : (
                  <div className="timeline">
                    {c.stageHistory.map((s) => (
                      <div className="timeline-item" key={s.id}>
                        <div className="timeline-item__date">{formatDateTime(s.at)}</div>
                        <div className="timeline-item__event"><Badge tone="grey">{s.from}</Badge> <Icon name="arrow" size={12} /> <Badge tone="navy">{s.to}</Badge></div>
                        <div className="timeline-item__source">Changed by {s.by}{s.remarks ? ` · ${s.remarks}` : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}

          {tab === 'Identifiers' && (
            <Card title="Identifiers">
              <Row label="Case Display Number" value={c.case_display_number} />
              <Row label="Case Number (Numeric)" value={c.case_number} />
              <Row label="Case Year" value={c.case_year} />
              <Row label="Case Type" value={resolveCaseType(c.case_type)} />
              <Row label="CNR Number" value={c.cnr_number} />
              <Row label="Filing Number" value={c.filing_number} />
              <Row label="Registration Number" value={c.registration_number} />
              <Row label="Document Folder Name" value={c.caseNumber || c.case_display_number || '—'} />
            </Card>
          )}

          {tab === 'Documents' && (
            <CaseDocTab caseId={id} caseNumber={c.caseNumber || c.case_display_number} folders={folders} documents={documents} onChanged={load} caseObj={c} />
          )}

          {tab === 'Hearings' && (
            <Card
              title="Hearing History"
              actions={<Button size="sm" icon="plus" onClick={() => setHearingOpen(true)}>Add Hearing</Button>}
            >
              {hearings.length === 0 ? <EmptyState icon="calendar" title="No hearings recorded." /> : (
                <div className="timeline">
                  {hearings.map((h) => (
                    <div className="timeline-item" key={h.id}>
                      <div className="timeline-item__date">{formatDate(h.date)} <Badge dot>{h.status}</Badge></div>
                      <div className="timeline-item__event">{h.purpose || '—'}</div>
                      {h.notes && <div className="timeline-item__source">{stripHtml(h.notes)}</div>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {tab === 'Timeline' && <CaseTimeline caseId={id} refreshKey={activityKey} />}

          {tab === 'Notes' && <NotesPanel caseId={id} notes={notes} onChanged={load} />}

          {tab === 'History' && <CaseHistory caseId={id} onChanged={load} />}
        </div>
      )}

      {!isMobile && (
        <div className="fade-in case-details-desktop-detail">
          <Button variant="ghost" size="sm" icon="arrow" onClick={() => nav('/cases')} className="case-detail__back-btn" />

          <div className="page-header">
            <div className="case-detail__head-icon"><Icon name="vault" size={24} /></div>
            <div className="page-header__text flex-1 min-w-0">
              <div className="case-detail__head-top">
                {c.archived && <Badge tone="amber">Archived</Badge>}
                <Badge tone="green" dot>{c.status}</Badge>
              </div>
              <h1>{c.case_display_number || c.caseNumber}</h1>
              <p>{c.title}</p>
              <div className="case-detail__meta-row">
                <span className="case-detail__meta-item"><span className="icon-soft"><Icon name="vault" size={14} /></span>{c.courtName || combinedCourt(c)}</span>
                <span className="case-detail__meta-item"><span className="icon-soft"><Icon name="users" size={14} /></span>{c.judge || '—'}</span>
                <span className="case-detail__meta-item"><span className="icon-soft"><Icon name="calendar" size={14} /></span>{formatDate(c.filingDate)}</span>
                {c.case_type && <Badge tone="grey">{resolveCaseType(c.case_type)}</Badge>}
              </div>
            </div>
            <div className="page-header__actions row-actions row-actions--wide">
              <PermissionGate perm="manageCase.edit"><Button size="sm" variant="ghost" icon="edit" onClick={() => setEditing(true)}>Edit</Button></PermissionGate>
              <PermissionGate perm="manageCase.create"><Button size="sm" variant="ghost" icon="layers" onClick={duplicate}>Duplicate</Button></PermissionGate>
              <PermissionGate perm="manageCase.export"><Button size="sm" variant="ghost" icon="download" onClick={exportCase}>Export</Button></PermissionGate>
              <PermissionGate perm="manageCase.archive"><Button size="sm" variant="ghost" icon={c.archived ? 'history' : 'vault'} onClick={archive}>{c.archived ? 'Restore' : 'Archive'}</Button></PermissionGate>
              <PermissionGate perm="manageCase.delete"><Button size="sm" variant="danger" icon="trash" onClick={() => setShowDeleteDlg(true)}>Delete</Button></PermissionGate>
            </div>
          </div>

          <div className="case-detail__metrics">
            <Metric icon="target" label="Current Stage" value={c.stage || '—'} />
            <Metric icon="calendar" label="Next Hearing" value={formatDate(c.nextHearing)} />
            <Metric icon="alert" label="Priority" value={<Badge tone={priorityTone[c.priority] || 'grey'}>{c.priority || '—'}</Badge>} flag />
            <Metric icon="file" label="Documents" value={documents.length} />
            <Metric icon="list" label="Hearings" value={hearings.length} />
            <Metric icon="notes" label="Notes" value={notes.length} />
          </div>

          <div className="tabs">
            {TABS.map((t) => (
              <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => goToTab(t)}>
                {t}
                {t === 'Documents' && ` (${documents.length})`}
                {t === 'Hearings' && ` (${hearings.length})`}
                {t === 'Notes' && ` (${notes.length})`}
              </div>
            ))}
          </div>

          {tab === 'Overview' && (
            <>
              <div className="grid-2">
                <Card
                  title="Case Particulars"
                  actions={<button className="linkbtn" onClick={() => setEditing(true)}>View All</button>}
                >
                  <Row label="Case Number" value={c.case_display_number || c.caseNumber} />
                  <Row label="Case Year" value={c.case_year} />
                  <Row label="Case Type" value={resolveCaseType(c.case_type)} />
                  <Row label="Case Stage" value={c.stage} />
                  <Row label="Filing Date" value={formatDate(c.filingDate)} />
                  <Row label="Plaintiff" value={c.plaintiff || c.parties?.plaintiff} />
                  <Row label="Defendant" value={c.defendant || c.parties?.defendant} />
                  <Row label="Court Name" value={c.courtName} />
                  <Row label="Bench Type" value={c.bench_type} />
                  <Row label="Judge" value={c.judge} />
                  <Row label="Status" value={c.status} />
                  <Row label="Priority" value={c.priority} />
                  <Row label="Client" value={c.client} />
                  <Row label="Advocate" value={c.advocate} />
                </Card>

                <div className="case-detail__right-column">
                  <Card
                    title="Description & Summary"
                    actions={<PermissionGate perm="manageCase.edit"><button className="linkbtn" onClick={() => setEditing(true)}><Icon name="edit" size={13} /> Edit</button></PermissionGate>}
                  >
                    <div className="card__sub mb-4">Case Summary</div>
                    <p className="case-detail__description">{c.case_summary || c.description || '—'}</p>
                    <div className="card__sub mt-10 mb-4">Internal Notes</div>
                    <p className="case-detail__description c-text-muted">{c.internal_notes || '—'}</p>
                    <div className="case-detail__tags">
                      {c.stage && <span className="tag tag--navy">{c.stage}</span>}
                      {c.status && <span className="tag tag--green">{c.status}</span>}
                      {c.priority && <span className="tag tag--amber">{c.priority}</span>}
                      {(c.tags || []).map((t) => <span key={t} className="tag tag--key">{t}</span>)}
                      <PermissionGate perm="manageCase.edit">
                        <button className="case-detail__add-tag-btn" onClick={() => setEditing(true)}><Icon name="plus" size={12} /> Add Tag</button>
                      </PermissionGate>
                    </div>
                  </Card>

                  <Card
                    title="Important Dates"
                    actions={<button className="linkbtn" onClick={() => goToTab('Case Tracking')}>View All</button>}
                  >
                    <div className="case-detail__dates-grid">
                      <div className="case-detail__date-cell">
                        <div className="case-detail__date-cell-label">Filing Date</div>
                        <div className="case-detail__date-cell-value">{formatDate(c.filingDate)}</div>
                      </div>
                      <div className="case-detail__date-cell">
                        <div className="case-detail__date-cell-label">Next Hearing Date</div>
                        <div className="case-detail__date-cell-value">{formatDate(c.nextHearing)}</div>
                      </div>
                      <div className="case-detail__date-cell">
                        <div className="case-detail__date-cell-label">Last Hearing Date</div>
                        <div className="case-detail__date-cell-value">{lastHearing ? formatDate(lastHearing.date) : '—'}</div>
                      </div>
                      <div className="case-detail__date-cell">
                        <div className="case-detail__date-cell-label">Judgment Date</div>
                        <div className="case-detail__date-cell-value">{formatDate(c.disposal_date)}</div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              <div className="case-detail__grid-mt cd__grid-3">
                <Card
                  title="Upcoming Hearing"
                  actions={<button className="linkbtn" onClick={() => goToTab('Hearings')}>View All</button>}
                >
                  {!upcomingHearing ? (
                    <MiniEmpty icon="calendar" title="No upcoming hearing." />
                  ) : (
                    <div className="case-detail__hearing-card">
                      <div className="case-detail__hearing-datebox">
                        <div className="case-detail__hearing-datebox-day">{datePart(upcomingHearing.date, 'day')}</div>
                        <div className="case-detail__hearing-datebox-mon">{datePart(upcomingHearing.date, 'mon')}</div>
                        <div className="case-detail__hearing-datebox-year">{datePart(upcomingHearing.date, 'year')}</div>
                      </div>
                      <div className="case-detail__hearing-info">
                        <div className="case-detail__hearing-title">{c.case_display_number || c.caseNumber || upcomingHearing.purpose || 'Hearing'}</div>
                        <div className="case-detail__hearing-court">{combinedCourt(c)}</div>
                      <div className="mt-8"><Badge tone="navy" dot>{upcomingHearing.status || 'Scheduled'}</Badge></div>
                      </div>
                    </div>
                  )}
                </Card>

                <RemindersPanel caseId={id} onChanged={load} />

                <Card
                  title="Documents"
                  actions={<button className="linkbtn" onClick={() => goToTab('Documents')}>View All</button>}
                >
                  {folders.filter((f) => f.kind === 'document').length === 0 && documents.length === 0 ? (
                    <MiniEmpty
                      icon="folder"
                      title="No documents uploaded."
                      hint="Upload or add documents related to this case."
                      action={<PermissionGate perm="manageCase.edit"><Button size="sm" variant="ghost" icon="plus" onClick={() => goToTab('Documents')}>Add Document</Button></PermissionGate>}
                    />
                  ) : (
                    folders.filter((f) => f.kind === 'document').map((f) => {
                    const count = documents.filter((d) => (d.folder_id || d.folder) === (f.id || f.name)).length;
                      return (
                        <div className="list-row" key={f.id} onClick={() => goToTab('Documents')}>
                          <div className="list-row__icon"><Icon name="folder" size={15} /></div>
                          <div className="flex-1 min-w-0">
                            <div className="list-row__title">{f.name}</div>
                            <div className="list-row__meta">{count} document{count !== 1 ? 's' : ''}</div>
                          </div>
                          <Icon name="arrow" size={14} />
                        </div>
                      );
                    })
                  )}
                </Card>
              </div>
            </>
          )}

          {tab === 'Parties' && (
            <Card title="Parties">
              <Row label="Plaintiff / Petitioner" value={c.plaintiff || c.parties?.plaintiff} />
              <Row label="Defendant / Respondent" value={c.defendant || c.parties?.defendant} />
              <Row label="Cause Title" value={c.title} />
              <Row label="Advocate" value={c.advocate} />
              <Row label="Client" value={c.client} />
            </Card>
          )}

          {tab === 'Court Info' && (
            <Card title="Court Info">
              <Row label="Court Name" value={c.courtName} />
              <Row label="Bench Type" value={c.bench_type} />
              <Row label="Judge" value={c.judge} />
            </Card>
          )}

          {tab === 'Case Tracking' && (
            <div className="grid-2">
              <Card title="Case Tracking">
                <Row label="Current Stage" value={c.stage} />
                <Row label="Status" value={c.status} />
                <Row label="Priority" value={c.priority ? <Badge tone={priorityTone[c.priority] || 'grey'}>{c.priority}</Badge> : '—'} />
                <Row label="Filing Date" value={formatDate(c.filingDate)} />
                <Row label="Registration Date" value={formatDate(c.registration_date)} />
                <Row label="Written Statement Filing Date" value={formatDate(c.wsFilingDate)} />
                <Row label="Next Hearing Date" value={formatDate(c.nextHearing)} />
                <Row label="Last Hearing Date" value={lastHearing ? formatDate(lastHearing.date) : '—'} />
                <Row label="Disposal / Judgment Date" value={formatDate(c.disposal_date)} />
              </Card>
              <Card title="Stage History" sub="Every stage change is tracked permanently">
                {(c.stageHistory || []).length === 0 ? <EmptyState icon="target" title="No stage changes yet." /> : (
                  <div className="timeline">
                    {c.stageHistory.map((s) => (
                      <div className="timeline-item" key={s.id}>
                        <div className="timeline-item__date">{formatDateTime(s.at)}</div>
                        <div className="timeline-item__event"><Badge tone="grey">{s.from}</Badge> <Icon name="arrow" size={12} /> <Badge tone="navy">{s.to}</Badge></div>
                        <div className="timeline-item__source">Changed by {s.by}{s.remarks ? ` · ${s.remarks}` : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {tab === 'Identifiers' && (
            <Card title="Identifiers">
              <Row label="Case Display Number" value={c.case_display_number} />
              <Row label="Case Number (Numeric)" value={c.case_number} />
              <Row label="Case Year" value={c.case_year} />
              <Row label="Case Type" value={resolveCaseType(c.case_type)} />
              <Row label="CNR Number" value={c.cnr_number} />
              <Row label="Filing Number" value={c.filing_number} />
              <Row label="Registration Number" value={c.registration_number} />
              <Row label="Document Folder Name" value={c.caseNumber || c.case_display_number || '—'} />
            </Card>
          )}

          {tab === 'Documents' && (
            <CaseDocTab caseId={id} caseNumber={c.caseNumber || c.case_display_number} folders={folders} documents={documents} onChanged={load} caseObj={c} />
          )}

          {tab === 'Hearings' && (
            <Card
              title="Hearing History"
              actions={<Button size="sm" icon="plus" onClick={() => setHearingOpen(true)}>Add Hearing</Button>}
            >
              {hearings.length === 0 ? <EmptyState icon="calendar" title="No hearings recorded." /> : (
                <div className="timeline">
                  {hearings.map((h) => (
                    <div className="timeline-item" key={h.id}>
                      <div className="timeline-item__date">{formatDate(h.date)} <Badge dot>{h.status}</Badge></div>
                      <div className="timeline-item__event">{h.purpose || '—'}</div>
                      {h.notes && <div className="timeline-item__source">{stripHtml(h.notes)}</div>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {tab === 'Timeline' && <CaseTimeline caseId={id} refreshKey={activityKey} />}

          {tab === 'Notes' && <NotesPanel caseId={id} notes={notes} onChanged={load} />}

          {tab === 'History' && <CaseHistory caseId={id} onChanged={load} />}
        </div>
      )}

      {/* Shared Modals */}
      <Modal open={editing} title="Edit Case" size="lg" onClose={() => setEditing(false)}>
        <CaseForm initial={c} onSubmit={saveEdit} onCancel={() => setEditing(false)} busy={busy} submitLabel="Update Case" caseDocuments={documents} />
      </Modal>

      <HearingFormModal
        open={hearingOpen}
        onClose={() => setHearingOpen(false)}
        onSaved={load}
        initialCaseId={id}
      />

      <Modal
        open={showDeleteDlg}
        title="Delete Case"
        onClose={() => setShowDeleteDlg(false)}
        footer={(
          <div className="flex-row gap-8 justify-end">
            <Button variant="ghost" onClick={() => setShowDeleteDlg(false)}>Cancel</Button>
            <Button variant="ghost" onClick={() => { setShowDeleteDlg(false); remove(false); }}>No, keep folders</Button>
            <Button variant="danger" icon="trash" onClick={() => { setShowDeleteDlg(false); remove(true); }}>Yes, delete folders</Button>
          </div>
        )}
      >
        <div className="confirm-dialog">
          <span className="confirm-dialog__icon confirm-dialog__icon--danger"><Icon name="trash" size={20} /></span>
          <div>
            <div className="confirm-dialog__title">Delete case {c.caseNumber}?</div>
            <div className="confirm-dialog__text">Do you want to remove the case folders also? All case-related folders and their contents will be permanently deleted.</div>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="case-detail__row">
      <span className="case-detail__row-label">{label}</span>
      <span className="case-detail__row-value">{value || '—'}</span>
    </div>
  );
}

function Metric({ icon, label, value, flag }) {
  return (
    <div className="case-detail__metric">
      <span className={`case-detail__metric-icon ${flag ? 'case-detail__metric-icon--flag' : ''}`}><Icon name={icon} size={17} /></span>
      <div>
        <div className="case-detail__metric-label">{label}</div>
        <div className="case-detail__metric-value">{value ?? '—'}</div>
      </div>
    </div>
  );
}

function MiniEmpty({ icon, title, hint, action }) {
  return (
    <div className="case-detail__mini-empty">
      <div className="case-detail__mini-empty-icon"><Icon name={icon} size={20} /></div>
      <div className="case-detail__mini-empty-title">{title}</div>
      {hint && <div className="case-detail__mini-empty-hint">{hint}</div>}
      {action && <div className="case-detail__mini-empty-action">{action}</div>}
    </div>
  );
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function datePart(value, part) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  if (part === 'day') return String(d.getDate()).padStart(2, '0');
  if (part === 'mon') return (MONTH_SHORT[d.getMonth()] || '').toUpperCase();
  if (part === 'year') return String(d.getFullYear());
  if (part === 'time') return DateEngine.formatTime(d);
  return '—';
}

