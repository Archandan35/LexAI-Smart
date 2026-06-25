import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Modal from '@/components/Modal.jsx';
import Badge from '@/components/Badge.jsx';
import Icon from '@/components/Icon.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import CaseForm from '@/components/CaseForm.jsx';
import PermissionGate from '@/components/PermissionGate.jsx';
import { caseLogic } from '@/logic/caseLogic.js';
import { useCases } from '@/hooks/useCases.js';
import { useAppData } from '@/data-layer/AppDataContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { usePermissions } from '@/hooks/usePermissions.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useCaseStages } from '@/hooks/useCaseStages.js';
import { useCaseStatuses } from '@/hooks/useCaseStatuses.js';
import { combinedCourt, extractJurisdiction } from '@/utils/caseFormat.js';
import { exportJson } from '@/utils/exportData.js';
import { formatDate } from '@/utils/format.js';

export default function CaseVault() {
  const nav = useNavigate();
  const toast = useToast();
  const { cases, loading, refresh } = useCases();
  const { refreshCases } = useAppData();
  const { can } = usePermissions();
  const { user } = useAuth();
  const { names: stageNames } = useCaseStages();
  const { statuses } = useCaseStatuses();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({ court: '', courtLocation: '', stage: '', status: '', view: 'active' });


  const reload = async () => { await refresh(); await refreshCases(); };

  const save = async (data) => {
    if (!data.caseNumber || !data.title) { toast.push('Case number and title are required.', 'error'); return; }
    setBusy(true);
    await caseLogic.create(data, user);
    setBusy(false);
    setOpen(false);
    toast.push('Case created.', 'success');
    reload();
  };

  const act = async (fn, msg) => { const r = await fn(); if (r?.ok === false) { toast.push(r.error, 'error'); return; } if (msg) toast.push(msg, 'success'); reload(); };

  const remove = (c) => { if (confirm(`Delete case ${c.caseNumber}?`)) act(() => caseLogic.remove(c.id, user), 'Case deleted.'); };
  const bulkRemove = () => { if (confirm(`Delete ${selected.length} case(s)?`)) { act(() => caseLogic.bulkRemove(selected, user), 'Cases deleted.'); setSelected([]); } };

  const uniqueCourtNames = useMemo(() => Array.from(new Set(cases.map(c => c.court || c.court || '').filter(Boolean))), [cases]);
  const uniqueCourtLocations = useMemo(() => Array.from(new Set(cases.map(c => extractJurisdiction(c)).filter(Boolean))), [cases]);

  const filtered = useMemo(() => {
    let rows = cases.filter((c) => (filters.view === 'archived' ? c.archived : !c.archived));
    if (filters.court) rows = rows.filter((c) => (c.court || c.court) === filters.court);
    if (filters.courtLocation) rows = rows.filter((c) => extractJurisdiction(c) === filters.courtLocation);
    if (filters.stage) rows = rows.filter((c) => c.stage === filters.stage);
    if (filters.status) rows = rows.filter((c) => c.status === filters.status);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((c) => `${c.caseNumber} ${c.title} ${combinedCourt(c)} ${c.judge || ''} ${c.advocate || ''} ${c.client || ''} ${(c.tags || []).join(' ')}`.toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => (b.watch ? 1 : 0) - (a.watch ? 1 : 0));
  }, [cases, filters, query]);

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.includes(c.id));
  const toggleAll = () => setSelected(allSelected ? [] : filtered.map((c) => c.id));
  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="fade-in">
      <PageHeader
        icon="vault"
        title="Case Vault"
        subtitle="Every matter with its documents, drafts, history, timeline and hearings in one secure place."
        actions={<PermissionGate perm="casevault.create"><Button icon="plus" onClick={() => setOpen(true)}>New Case</Button></PermissionGate>}
      />

      <div className="toolbar-row">
        <div className="datatable__search case-vault__search">
          <Icon name="search" size={15} />
          <input placeholder="Search cases, judge, client, tags…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="select case-vault__filter-court" value={filters.court} onChange={(e) => setFilters({ ...filters, court: e.target.value })}>
          <option value="">All courts</option>{uniqueCourtNames.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select case-vault__filter-court" value={filters.courtLocation} onChange={(e) => setFilters({ ...filters, courtLocation: e.target.value })}>
          <option value="">All jurisdictions</option>{uniqueCourtLocations.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className="select case-vault__filter-stage" value={filters.stage} onChange={(e) => setFilters({ ...filters, stage: e.target.value })}>
          <option value="">All stages</option>{stageNames.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="select case-vault__filter-status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All status</option>{statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="spacer" />
        <div className="seg">
          <button className={`seg__btn ${filters.view === 'active' ? 'active' : ''}`} onClick={() => setFilters({ ...filters, view: 'active' })}>Active</button>
          <button className={`seg__btn ${filters.view === 'archived' ? 'active' : ''}`} onClick={() => setFilters({ ...filters, view: 'archived' })}>Archived</button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="bulk-bar">
          <span><b>{selected.length}</b> selected</span>
          <div className="bulk-bar__spacer" />
          <PermissionGate perm="casevault.export"><Button variant="ghost" size="sm" icon="download" onClick={() => exportJson('cases_export', cases.filter((c) => selected.includes(c.id)))}>Export</Button></PermissionGate>
          <PermissionGate perm="casevault.archive"><Button variant="ghost" size="sm" icon="vault" onClick={() => { selected.forEach((id) => caseLogic.setArchived(id, filters.view !== 'archived', user)); setSelected([]); setTimeout(reload, 200); }}>{filters.view === 'archived' ? 'Restore' : 'Archive'}</Button></PermissionGate>
          <PermissionGate perm="casevault.bulkDelete"><Button variant="danger" size="sm" icon="trash" onClick={bulkRemove}>Delete</Button></PermissionGate>
        </div>
      )}

      <Card bodyClass="card__body--flush">
        {loading ? <div className="loading-block"><span className="spinner" /> Loading…</div> : filtered.length === 0 ? (
          <EmptyState icon="vault" title="No cases found." hint="Create your first case." action={can('casevault.create') && <Button icon="plus" onClick={() => setOpen(true)}>New Case</Button>} />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead><tr>
                <th className="case-vault__th-check">{can('casevault.bulkDelete') && <input type="checkbox" checked={allSelected} onChange={toggleAll} />}</th>
                <th className="case-vault__th-check" />
                <th>Case Number</th><th>Parties</th><th>Court</th><th>Stage</th><th>Next Hearing</th><th>Status</th><th className="case-vault__th-actions">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className={selected.includes(c.id) ? 'row--selected' : ''}>
                    <td>{can('casevault.bulkDelete') && <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleOne(c.id)} />}</td>
                    <td>
                      <button className="iconbtn" title={c.watch ? 'Unwatch' : 'Add to watchlist'} onClick={() => act(() => caseLogic.toggleWatch(c.id, !c.watch))}>
                        <Icon name="star" size={15} className={c.watch ? 'star--on' : ''} fill={c.watch} />
                      </button>
                    </td>
                    <td className="case-vault__cell-case" onClick={() => nav(`/cases/${c.id}`)}>{c.case_display_number || c.caseNumber}</td>
                    <td className="case-vault__cell-clickable" onClick={() => nav(`/cases/${c.id}`)}>{c.title}</td>
                    <td>{c.court_name || combinedCourt(c)}</td>
                    <td>{c.stage ? <Badge tone="navy">{c.stage}</Badge> : '—'}</td>
                    <td>{formatDate(c.next_hearing)}</td>
                    <td><Badge>{c.status}</Badge></td>
                    <td>
                      <div className="row-actions">
                        <button className="iconbtn" title="View" onClick={() => nav(`/cases/${c.id}`)}><Icon name="eye" size={15} /></button>
                        <PermissionGate perm="casevault.edit"><button className="iconbtn" title="Edit" onClick={() => nav(`/cases/${c.id}?edit=1`)}><Icon name="edit" size={15} /></button></PermissionGate>
                        <PermissionGate perm="casevault.create"><button className="iconbtn" title="Duplicate" onClick={() => act(() => caseLogic.duplicate(c.id, user), 'Case duplicated.')}><Icon name="layers" size={15} /></button></PermissionGate>
                        <PermissionGate perm="casevault.export"><button className="iconbtn" title="Export" onClick={async () => exportJson(`case_${c.caseNumber}`, await caseLogic.exportBundle(c.id))}><Icon name="download" size={15} /></button></PermissionGate>
                        <PermissionGate perm="casevault.archive"><button className="iconbtn" title={c.archived ? 'Restore' : 'Archive'} onClick={() => act(() => caseLogic.setArchived(c.id, !c.archived, user), c.archived ? 'Restored.' : 'Archived.')}><Icon name={c.archived ? 'history' : 'vault'} size={15} /></button></PermissionGate>
                        <PermissionGate perm="casevault.delete"><button className="iconbtn iconbtn--danger" title="Delete" onClick={() => remove(c)}><Icon name="trash" size={15} /></button></PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={open} title="New Case" size="lg" onClose={() => setOpen(false)}>
        <CaseForm onSubmit={save} onCancel={() => setOpen(false)} busy={busy} submitLabel="Create Case" />
      </Modal>
    </div>
  );
}
