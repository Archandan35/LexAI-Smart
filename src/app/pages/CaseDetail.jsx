import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Badge from '@/components/Badge.jsx';
import Icon from '@/components/Icon.jsx';
import Modal from '@/components/Modal.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Spinner from '@/components/Spinner.jsx';
import CaseForm from '@/components/CaseForm.jsx';
import CaseHistory from '@/components/CaseHistory.jsx';
import DocumentManager from '@/components/DocumentManager.jsx';
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
import { DRAFT_TYPE_MAP } from '@/constants/draftTypes.js';

const TABS = ['Overview', 'Documents', 'Drafts', 'Hearings', 'Case History', 'Notes', 'Timeline'];

export default function CaseDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [vault, setVault] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activityKey, setActivityKey] = useState(0);

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
  const remove = async () => { if (confirm(`Delete case ${vault.case.caseNumber}? This cannot be undone.`)) { await caseLogic.remove(id, user); toast.push('Case deleted.', 'info'); nav('/cases'); } };

  if (loading) return <Spinner label="Loading case…" />;
  if (!vault?.case) return <EmptyState title="Case not found." action={<Button onClick={() => nav('/cases')}>Back to Vault</Button>} />;

  const c = vault.case;
  const lastHearing = vault.lastHearing;
  const pendingReminders = (vault.reminders || []).filter((r) => !r.done).length;

  return (
    <div className="fade-in">
      <Button variant="ghost" size="sm" icon="arrow" onClick={() => nav('/cases')} style={{ marginBottom: 14, transform: 'scaleX(-1)' }} />
      <PageHeader
        icon="vault"
        title={c.case_display_number || c.caseNumber}
        subtitle={`${c.title} · ${combinedCourt(c)}`}
        actions={(
          <div className="row-actions" style={{ alignItems: 'center', gap: 8 }}>
            {c.archived && <Badge tone="amber">Archived</Badge>}
            <Badge tone="navy">{c.stage || '—'}</Badge>
            <Badge>{c.status}</Badge>
            <PermissionGate perm="casevault.edit"><Button size="sm" variant="ghost" icon="edit" onClick={() => setEditing(true)}>Edit</Button></PermissionGate>
            <PermissionGate perm="casevault.create"><Button size="sm" variant="ghost" icon="layers" onClick={duplicate}>Duplicate</Button></PermissionGate>
            <PermissionGate perm="casevault.export"><Button size="sm" variant="ghost" icon="download" onClick={exportCase}>Export</Button></PermissionGate>
            <PermissionGate perm="casevault.archive"><Button size="sm" variant="ghost" icon={c.archived ? 'history' : 'vault'} onClick={archive}>{c.archived ? 'Restore' : 'Archive'}</Button></PermissionGate>
            <PermissionGate perm="casevault.delete"><Button size="sm" variant="danger" icon="trash" onClick={remove}>Delete</Button></PermissionGate>
          </div>
        )}
      />

      <div className="tabs">
        {TABS.map((t) => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
            {t === 'Documents' && ` (${vault.documents.length})`}
            {t === 'Drafts' && ` (${vault.drafts.length})`}
            {t === 'Hearings' && ` (${vault.hearings.length})`}
            {t === 'Case History' && ` (${vault.history.length})`}
            {t === 'Notes' && ` (${vault.notes.length})`}
          </div>
        ))}
      </div>

      {tab === 'Overview' && (
        <>
          <div className="grid-2">
            <Card title="Case Particulars">
              <Row label="Case Number" value={c.case_display_number || c.caseNumber} />
              <Row label="Case Type" value={c.case_type || (c.parties ? '—' : '—')} />
              <Row label="Court" value={c.court} />
              <Row label="Court Name" value={c.courtName} />
              <Row label="Combined Court" value={combinedCourt(c)} />
              <Row label="Judge" value={c.judge} />
              <Row label="Plaintiff" value={c.plaintiff || c.parties?.plaintiff} />
              <Row label="Defendant" value={c.defendant || c.parties?.defendant} />
              <Row label="Filing Date" value={formatDate(c.filingDate)} />
              <Row label="Written Statement Filing Date" value={formatDate(c.wsFilingDate)} />
              <Row label="Next Hearing Date" value={formatDate(c.nextHearing)} />
              <Row label="Last Hearing Date" value={lastHearing ? formatDate(lastHearing.date) : '—'} />
              <Row label="Current Stage" value={c.stage} />
              <Row label="Status" value={c.status} />
              <Row label="Advocate" value={c.advocate} />
              <Row label="Client" value={c.client} />
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card title="Case Health" sub="At-a-glance status">
                <div className="health-grid">
                  <Health label="Total Documents" value={vault.documents.length} icon="file" />
                  <Health label="Pending Reminders" value={pendingReminders} icon="clock" />
                  <Health label="Current Stage" value={c.stage || '—'} icon="target" />
                  <Health label="Last Hearing" value={lastHearing ? formatDate(lastHearing.date) : '—'} icon="history" />
                  <Health label="Next Hearing" value={formatDate(c.nextHearing)} icon="calendar" />
                  <Health label="Recent Activity" value={`${vault.activity.length} events`} icon="bolt" />
                </div>
              </Card>

              <Card title="Description & Tags">
                <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-soft)', whiteSpace: 'pre-wrap' }}>{c.description || '—'}</p>
                {(c.tags || []).length > 0 && <div style={{ marginTop: 12 }}>{c.tags.map((t) => <span key={t} className="tag tag--key">{t}</span>)}</div>}
              </Card>
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: 16 }}>
            <RemindersPanel caseId={id} onChanged={load} />
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
        </>
      )}

      {tab === 'Documents' && (
        <DocumentManager caseId={id} documents={vault.documents} folders={vault.folders} onChanged={load} />
      )}

      {tab === 'Drafts' && (
        <Card title="Drafts" actions={<Button size="sm" variant="ghost" icon="plus" onClick={() => nav('/drafting')}>New</Button>}>
          {vault.drafts.length === 0 ? <EmptyState icon="pen" title="No drafts for this case." /> : vault.drafts.map((d) => (
            <div className="list-row" key={d.id} onClick={() => nav('/drafting')}>
              <div className="list-row__icon"><Icon name="doc" size={15} /></div>
              <div style={{ flex: 1 }}><div className="list-row__title">{d.title}</div><div className="list-row__meta">{DRAFT_TYPE_MAP[d.type]?.label || d.type}{d.folder ? ` · ${d.folder}` : ''}</div></div>
              <Icon name="arrow" size={15} />
            </div>
          ))}
        </Card>
      )}

      {tab === 'Hearings' && (
        <Card title="Hearing History">
          {vault.hearings.length === 0 ? <EmptyState icon="calendar" title="No hearings recorded." /> : (
            <div className="timeline">
              {[...vault.hearings].sort((a, b) => new Date(b.date) - new Date(a.date)).map((h) => (
                <div className="timeline-item" key={h.id}>
                  <div className="timeline-item__date">{formatDate(h.date)} <Badge>{h.status}</Badge></div>
                  <div className="timeline-item__event">{h.purpose || '—'}</div>
                  {h.notes && <div className="timeline-item__source">{h.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'Case History' && <CaseHistory caseId={id} onChanged={load} />}

      {tab === 'Notes' && <NotesPanel caseId={id} notes={vault.notes} onChanged={load} />}

      {tab === 'Timeline' && <CaseTimeline caseId={id} refreshKey={activityKey} />}

      <Modal open={editing} title="Edit Case" size="lg" onClose={() => setEditing(false)}>
        <CaseForm initial={c} onSubmit={saveEdit} onCancel={() => setEditing(false)} busy={busy} submitLabel="Update Case" />
      </Modal>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13.5, gap: 16 }}>
      <span style={{ color: 'var(--text-faint)' }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{value || '—'}</span>
    </div>
  );
}

function Health({ label, value, icon }) {
  return (
    <div className="health-cell">
      <span className="health-cell__icon"><Icon name={icon} size={16} /></span>
      <div>
        <div className="health-cell__value">{value}</div>
        <div className="health-cell__label">{label}</div>
      </div>
    </div>
  );
}
