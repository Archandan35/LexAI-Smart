import React, { useEffect, useState, useCallback } from 'react';
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
import { formatDate, formatDateTime } from '@/utils/format.js';
import { usePriorities } from '@/hooks/usePriorities.js';

const TABS = ['Overview', 'Parties', 'Court Info', 'Case Tracking', 'Identifiers', 'Documents', 'Hearings', 'Timeline', 'Notes', 'History'];

export default function ManageCase() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { priorities } = usePriorities();
  const priorityTone = Object.fromEntries((priorities || []).map((p) => [p.name, p.color || 'grey']));
  const [params, setParams] = useSearchParams();
  const [vault, setVault] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activityKey, setActivityKey] = useState(0);
  const [showDeleteDlg, setShowDeleteDlg] = useState(false);

  const load = useCallback(async () => {
    const res = await caseLogic.vault(id);
    setVault(res.ok ? res.data : null);
    setLoading(false);
    setActivityKey((k) => k + 1);
  }, [id]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useEffect(() => { if (params.get('edit')) { setEditing(true); } }, [params]);

  const saveEdit = async (data) => {
    setBusy(true);
    await caseLogic.update(id, data, user);
    setBusy(false);
    setEditing(false);
    if (params.get('edit')) { params.delete('edit'); setParams(params, { replace: true }); }
    toast.push('Case updated.', 'success');
    load();
  };

  const duplicate = async () => {
    const r = await caseLogic.duplicate(id, user);
    if (r.ok) { toast.push('Case duplicated.', 'success'); nav(`/cases/${r.data.id}`); }
    else toast.push(r.error, 'error');
  };
  const exportCase = async () => exportJson(`case_${vault.case.caseNumber}`, await caseLogic.exportBundle(id));
  const archive = async () => { await caseLogic.setArchived(id, !vault.case.archived, user); toast.push(vault.case.archived ? 'Case restored.' : 'Case archived.', 'success'); load(); };
  const remove = async (deleteFolders) => {
    await caseLogic.remove(id, user, deleteFolders);
    toast.push('Case deleted.', 'info');
    nav('/cases');
  };

  if (loading) return <Spinner label="Loading case…" />;
  if (!vault?.case) return <EmptyState title="Case not found." action={<Button onClick={() => nav('/cases')}>Back to Vault</Button>} />;

  const c = vault.case;
  const lastHearing = vault.lastHearing;
  const upcomingHearing = [...(vault.hearings || [])]
    .filter((h) => new Date(h.date) >= startOfToday())
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0]
    || (c.next_hearing && new Date(c.next_hearing) >= startOfToday()
      ? { date: c.next_hearing, purpose: 'Next Hearing', status: 'Scheduled' }
      : null);

  return (
    <div className="fade-in">
      <Button variant="ghost" size="sm" icon="arrow" onClick={() => nav('/cases')} className="case-detail__back-btn" />

      <div className="page-header">
        <div className="case-detail__head-icon"><Icon name="vault" size={24} /></div>
        <div className="page-header__text" style={{ flex: 1, minWidth: 0 }}>
          <div className="case-detail__head-top">
            {c.archived && <Badge tone="amber">Archived</Badge>}
            <Badge tone="green">{c.status}</Badge>
          </div>
          <h1>{c.case_display_number || c.caseNumber}</h1>
          <p>{c.title}</p>
          <div className="case-detail__meta-row">
            <span className="case-detail__meta-item"><span className="icon-soft"><Icon name="vault" size={14} /></span>{c.court_name || combinedCourt(c)}</span>
            <span className="case-detail__meta-item"><span className="icon-soft"><Icon name="users" size={14} /></span>{c.judge || '—'}</span>
            <span className="case-detail__meta-item"><span className="icon-soft"><Icon name="calendar" size={14} /></span>{formatDate(c.filing_date)}</span>
            {c.case_type && <Badge tone="grey">{c.case_type}</Badge>}
          </div>
        </div>
        <div className="page-header__actions row-actions row-actions--wide">
          <PermissionGate perm="casevault.edit"><Button size="sm" variant="ghost" icon="edit" onClick={() => setEditing(true)}>Edit</Button></PermissionGate>
          <PermissionGate perm="casevault.create"><Button size="sm" variant="ghost" icon="layers" onClick={duplicate}>Duplicate</Button></PermissionGate>
          <PermissionGate perm="casevault.export"><Button size="sm" variant="ghost" icon="download" onClick={exportCase}>Export</Button></PermissionGate>
          <PermissionGate perm="casevault.archive"><Button size="sm" variant="ghost" icon={c.archived ? 'history' : 'vault'} onClick={archive}>{c.archived ? 'Restore' : 'Archive'}</Button></PermissionGate>
          <PermissionGate perm="casevault.delete"><Button size="sm" variant="danger" icon="trash" onClick={() => setShowDeleteDlg(true)}>Delete</Button></PermissionGate>
        </div>
      </div>

      <div className="case-detail__metrics">
        <Metric icon="target" label="Current Stage" value={c.stage || '—'} />
        <Metric icon="calendar" label="Next Hearing" value={formatDate(c.next_hearing)} />
        <Metric icon="alert" label="Priority" value={<Badge tone={priorityTone[c.priority] || 'grey'}>{c.priority || '—'}</Badge>} flag />
        <Metric icon="file" label="Documents" value={vault.documents.length} />
        <Metric icon="list" label="Hearings" value={vault.hearings.length} />
        <Metric icon="notes" label="Notes" value={vault.notes.length} />
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
            {t === 'Documents' && ` (${vault.documents.length})`}
            {t === 'Hearings' && ` (${vault.hearings.length})`}
            {t === 'Notes' && ` (${vault.notes.length})`}
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
              <Row label="Case Type" value={c.case_type} />
              <Row label="Case Stage" value={c.stage} />
              <Row label="Filing Date" value={formatDate(c.filing_date)} />
              <Row label="Plaintiff" value={c.plaintiff || c.parties?.plaintiff} />
              <Row label="Defendant" value={c.defendant || c.parties?.defendant} />
              <Row label="Court Name" value={c.court_name} />
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
                actions={<PermissionGate perm="casevault.edit"><button className="linkbtn" onClick={() => setEditing(true)}><Icon name="edit" size={13} /> Edit</button></PermissionGate>}
              >
                <div className="card__sub" style={{ marginBottom: 4 }}>Case Summary</div>
                <p className="case-detail__description">{c.case_summary || c.description || '—'}</p>
                <div className="card__sub" style={{ marginTop: 10, marginBottom: 4 }}>Internal Notes</div>
                <p className="case-detail__description" style={{ color: 'var(--text-muted)' }}>{c.internal_notes || '—'}</p>
                <div className="case-detail__tags">
                  {c.stage && <span className="tag tag--navy">{c.stage}</span>}
                  {c.status && <span className="tag tag--green">{c.status}</span>}
                  {c.priority && <span className="tag tag--amber">{c.priority}</span>}
                  {(c.tags || []).map((t) => <span key={t} className="tag tag--key">{t}</span>)}
                  <PermissionGate perm="casevault.edit">
                    <button className="case-detail__add-tag-btn" onClick={() => setEditing(true)}><Icon name="plus" size={12} /> Add Tag</button>
                  </PermissionGate>
                </div>
              </Card>

              <Card
                title="Important Dates"
                actions={<button className="linkbtn" onClick={() => setTab('Case Tracking')}>View All</button>}
              >
                <div className="case-detail__dates-grid">
                  <div className="case-detail__date-cell">
                    <div className="case-detail__date-cell-label">Filing Date</div>
                    <div className="case-detail__date-cell-value">{formatDate(c.filing_date)}</div>
                  </div>
                  <div className="case-detail__date-cell">
                    <div className="case-detail__date-cell-label">Next Hearing Date</div>
                    <div className="case-detail__date-cell-value">{formatDate(c.next_hearing)}</div>
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

          <div className="case-detail__grid-mt" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            <Card
              title="Upcoming Hearing"
              actions={<button className="linkbtn" onClick={() => setTab('Hearings')}>View All</button>}
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
                    <div style={{ marginTop: 8 }}><Badge tone="navy">{upcomingHearing.status || 'Scheduled'}</Badge></div>
                  </div>
                </div>
              )}
            </Card>

            <RemindersPanel caseId={id} onChanged={load} />

            <Card
              title="Documents"
              actions={<button className="linkbtn" onClick={() => setTab('Documents')}>View All</button>}
            >
              {(vault.folders || []).filter((f) => f.kind === 'document').length === 0 && vault.documents.length === 0 ? (
                <MiniEmpty
                  icon="folder"
                  title="No documents uploaded."
                  hint="Upload or add documents related to this case."
                  action={<PermissionGate perm="casevault.edit"><Button size="sm" variant="ghost" icon="plus" onClick={() => setTab('Documents')}>Add Document</Button></PermissionGate>}
                />
              ) : (
                (vault.folders || []).filter((f) => f.kind === 'document').map((f) => {
                  const count = vault.documents.filter((d) => d.folder === f.name).length;
                  return (
                    <div className="list-row" key={f.id} onClick={() => setTab('Documents')}>
                      <div className="list-row__icon"><Icon name="folder" size={15} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
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
          <Row label="Court Name" value={c.court_name} />
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
            <Row label="Filing Date" value={formatDate(c.filing_date)} />
            <Row label="Registration Date" value={formatDate(c.registration_date)} />
            <Row label="Written Statement Filing Date" value={formatDate(c.ws_filing_date)} />
            <Row label="Next Hearing Date" value={formatDate(c.next_hearing)} />
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
          <Row label="Case Type" value={c.case_type} />
          <Row label="CNR Number" value={c.cnr_number} />
          <Row label="Filing Number" value={c.filing_number} />
          <Row label="Registration Number" value={c.registration_number} />
          <Row label="Document Folder Name" value={c.caseNumber || c.case_display_number || '—'} />
        </Card>
      )}

      {tab === 'Documents' && (
        <CaseDocTab caseId={id} caseNumber={c.caseNumber || c.case_display_number} folders={vault.folders} documents={vault.documents} onChanged={load} caseObj={c} />
      )}

      {tab === 'Hearings' && (
        <Card title="Hearing History">
          {vault.hearings.length === 0 ? <EmptyState icon="calendar" title="No hearings recorded." /> : (
            <div className="timeline">
              {[...vault.hearings].sort((a, b) => new Date(b.date) - new Date(a.date)).map((h) => (
                <div className="timeline-item" key={h.id}>
                  <div className="timeline-item__date">{formatDate(h.date)} <Badge>{h.status}</Badge></div>
                  <div className="timeline-item__event">{h.purpose || '—'}</div>
                  {h.notes && <div className="timeline-item__source" dangerouslySetInnerHTML={{ __html: h.notes }} />}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'Timeline' && <CaseTimeline caseId={id} refreshKey={activityKey} />}

      {tab === 'Notes' && <NotesPanel caseId={id} notes={vault.notes} onChanged={load} />}

      {tab === 'History' && <CaseHistory caseId={id} onChanged={load} />}

      <Modal open={editing} title="Edit Case" size="lg" onClose={() => setEditing(false)}>
        <CaseForm initial={c} onSubmit={saveEdit} onCancel={() => setEditing(false)} busy={busy} submitLabel="Update Case" caseDocuments={vault.documents} />
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={showDeleteDlg}
        title="Delete Case"
        onClose={() => setShowDeleteDlg(false)}
        footer={(
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowDeleteDlg(false)}>Cancel</Button>
            <Button variant="ghost" onClick={() => { setShowDeleteDlg(false); remove(false); }}>No, keep folders</Button>
            <Button variant="danger" icon="trash" onClick={() => { setShowDeleteDlg(false); remove(true); }}>Yes, delete folders</Button>
          </div>
        )}
      >
        <div className="confirm-dialog">
          <span className="confirm-dialog__icon confirm-dialog__icon--danger"><Icon name="trash" size={20} /></span>
          <div>
            <div className="confirm-dialog__title">Delete case {vault?.case?.caseNumber}?</div>
            <div className="confirm-dialog__text">Do you want to remove the case folders also? All case-related folders and their contents will be permanently deleted.</div>
          </div>
        </div>
      </Modal>
    </div>
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

function datePart(value, part) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  if (part === 'day') return d.toLocaleDateString('en-IN', { day: '2-digit' });
  if (part === 'mon') return d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
  if (part === 'year') return d.toLocaleDateString('en-IN', { year: 'numeric' });
  if (part === 'time') return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return '—';
}