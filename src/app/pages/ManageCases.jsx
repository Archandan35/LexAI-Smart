import { useState, useEffect, useMemo } from 'react';
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
import { useCaseTypes } from '@/hooks/useCaseTypes.js';
import { combinedCourt, extractJurisdiction } from '@/utils/caseFormat.js';
import { exportJson } from '@/utils/exportData.js';
import { useFormat } from '@/utils/format.js';

function getStageVariant(stage) {
  if (!stage) return '';
  const s = stage.toLowerCase();
  if (s.includes('defendant')) return 'defendant';
  if (s.includes('plaintiff') || s.includes('plaintiff')) return 'plaintiff';
  return '';
}

export default function ManageCases() {
  const { formatDate } = useFormat();
  const nav = useNavigate();
  const toast = useToast();
  const { cases, loading, refresh } = useCases();
  const { refreshCases } = useAppData();
  const { can } = usePermissions();
  const { user } = useAuth();
  const { names: stageNames } = useCaseStages();
  const { statuses } = useCaseStatuses();
  const { caseTypes } = useCaseTypes();

  const shortCodeMap = useMemo(() => {
    const map = {};
    caseTypes.forEach((t) => {
      if (t.name) map[t.name.toLowerCase()] = t.short_code || t.name;
      if (t.short_code) map[t.short_code.toLowerCase()] = t.short_code;
    });
    return map;
  }, [caseTypes]);

  const formatCaseNum = (c) => {
    const raw = c.case_type || '';
    const sc = shortCodeMap[raw.toLowerCase()] || '';
    const cn = c.case_number || c.caseNumber;
    const cy = c.case_year;
    if (sc && cn && cy) return `${sc} No. ${cn} of ${cy}`;
    if (cn && cy) return `No. ${cn} of ${cy}`;
    return c.case_display_number || c.caseNumber || '';
  };

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({ court: '', courtLocation: '', stage: '', status: '', view: 'active' });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 991px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    handler(mql);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const reload = async () => { await refresh(); await refreshCases(); };

  const save = async (data) => {
    if (!data.caseNumber || !data.title) { toast.push('Case number and title are required.', 'error'); return; }
    setBusy(true);
    try {
      await caseLogic.create(data, user);
      setOpen(false);
      toast.push('Case created.', 'success');
      reload();
    } catch (e) {
      toast.push(e?.message || 'Failed to create case.', 'error');
    }
    setBusy(false);
  };

  const act = async (fn, msg) => { try { const r = await fn(); if (r?.ok === false) { toast.push(r.error, 'error'); return; } if (msg) toast.push(msg, 'success'); } catch (e) { toast.push(e?.message || 'Action failed.', 'error'); } reload(); };

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
    <>
      {!isMobile && (
        <div className="fade-in cv-desktop-view">
          <PageHeader
            icon="vault"
            title="Manage Cases"
            subtitle="Every matter with its documents, drafts, history, timeline and hearings in one secure place."
            actions={<PermissionGate perm="manageCase.create"><Button icon="plus" onClick={() => setOpen(true)}>New Case</Button></PermissionGate>}
          />

          <div className="toolbar-row">
            <div className="datatable__search manage-cases__search">
              <Icon name="search" size={15} />
              <input placeholder="Search cases, judge, client, tags…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <select className="select manage-cases__filter-court" value={filters.court} onChange={(e) => setFilters({ ...filters, court: e.target.value })}>
              <option value="">All courts</option>{uniqueCourtNames.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="select manage-cases__filter-court" value={filters.courtLocation} onChange={(e) => setFilters({ ...filters, courtLocation: e.target.value })}>
              <option value="">All jurisdictions</option>{uniqueCourtLocations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select className="select manage-cases__filter-stage" value={filters.stage} onChange={(e) => setFilters({ ...filters, stage: e.target.value })}>
              <option value="">All stages</option>{stageNames.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select className="select manage-cases__filter-status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
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
              <PermissionGate perm="manageCase.export"><Button variant="ghost" size="sm" icon="download" onClick={() => exportJson('cases_export', cases.filter((c) => selected.includes(c.id)))}>Export</Button></PermissionGate>
              <PermissionGate perm="manageCase.archive"><Button variant="ghost" size="sm" icon="vault" onClick={async () => { try { for (const id of selected) await caseLogic.setArchived(id, filters.view !== 'archived', user); } catch (e) { toast.push(e?.message || 'Archive failed.', 'error'); } setSelected([]); reload(); }}>{filters.view === 'archived' ? 'Restore' : 'Archive'}</Button></PermissionGate>
              <PermissionGate perm="manageCase.bulkDelete"><Button variant="danger" size="sm" icon="trash" onClick={bulkRemove}>Delete</Button></PermissionGate>
            </div>
          )}

          <Card bodyClass="card__body--flush">
            {loading ? <div className="loading-block"><span className="spinner" /> Loading…</div> : filtered.length === 0 ? (
              <EmptyState icon="vault" title="No cases found." hint="Create your first case." action={can('manageCase.create') && <Button icon="plus" onClick={() => setOpen(true)}>New Case</Button>} />
            ) : (
              <div className="table-scroll">
                <table className="table">
                  <thead><tr>
                    <th className="manage-cases__th-check">{can('manageCase.bulkDelete') && <input type="checkbox" checked={allSelected} onChange={toggleAll} />}</th>
                    <th className="manage-cases__th-check"><Icon name="star" size={13} /></th>
                    <th>Case Number</th><th>Parties</th><th>Court</th><th>Stage</th><th>Next Hearing</th><th>Status</th><th className="manage-cases__th-actions">Actions</th>
                  </tr></thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className={selected.includes(c.id) ? 'row--selected' : ''}>
                        <td>{can('manageCase.bulkDelete') && <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleOne(c.id)} />}</td>
                        <td>
                          <button className="iconbtn" title={c.watch ? 'Unwatch' : 'Add to watchlist'} onClick={() => act(() => caseLogic.toggleWatch(c.id, !c.watch))}>
                            <Icon name="star" size={15} className={c.watch ? 'star--on' : ''} fill={c.watch} />
                          </button>
                        </td>
                        <td className="manage-cases__cell-case" onClick={() => nav(`/cases/${c.id}`)}>{formatCaseNum(c)}</td>
                        <td className="manage-cases__cell-clickable" onClick={() => nav(`/cases/${c.id}`)}>{c.title}</td>
                        <td>{c.courtName || combinedCourt(c)}</td>
                        <td>{c.stage ? <Badge tone="navy">{c.stage}</Badge> : '—'}</td>
                        <td className="manage-cases__cell-date">{formatDate(c.nextHearing)}</td>
                        <td><Badge dot>{c.status}</Badge></td>
                        <td>
                          <div className="row-actions">
                            <button className="iconbtn" title="View" onClick={() => nav(`/cases/${c.id}`)}><Icon name="eye" size={15} /></button>
                            <PermissionGate perm="manageCase.edit"><button className="iconbtn" title="Edit" onClick={() => nav(`/cases/${c.id}?edit=1`)}><Icon name="edit" size={15} /></button></PermissionGate>
                            <PermissionGate perm="manageCase.create"><button className="iconbtn" title="Duplicate" onClick={() => act(() => caseLogic.duplicate(c.id, user), 'Case duplicated.')}><Icon name="layers" size={15} /></button></PermissionGate>
                            <PermissionGate perm="manageCase.export"><button className="iconbtn" title="Export" onClick={async () => exportJson(`case_${c.caseNumber}`, await caseLogic.exportBundle(c.id))}><Icon name="download" size={15} /></button></PermissionGate>
                            <PermissionGate perm="manageCase.archive"><button className="iconbtn" title={c.archived ? 'Restore' : 'Archive'} onClick={() => act(() => caseLogic.setArchived(c.id, !c.archived, user), c.archived ? 'Restored.' : 'Archived.')}><Icon name={c.archived ? 'history' : 'vault'} size={15} /></button></PermissionGate>
                            <PermissionGate perm="manageCase.delete"><button className="iconbtn iconbtn--danger" title="Delete" onClick={() => remove(c)}><Icon name="trash" size={15} /></button></PermissionGate>
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
            <CaseForm onSubmit={save} onCancel={() => setOpen(false)} busy={busy} submitLabel="Create Cases" />
          </Modal>
        </div>
      )}

      {isMobile && (
        <div className="cv-mobile-view fade-in">

          <div className="cv-banner">
            <div className="cv-banner__top">
              <div className="cv-banner__icon">
                <Icon name="folder" size={32} />
              </div>
              <div className="cv-banner__text">
                <h2 className="cv-banner__title">Manage Cases</h2>
              </div>
              <PermissionGate perm="manageCase.create">
                <button className="cv-banner__btn" onClick={() => setOpen(true)}>
                  <Icon name="plus" size={20} />New Case
                </button>
              </PermissionGate>
            </div>
            <p className="cv-banner__desc">
              Every matter with its documents, drafts, history, timeline and hearings in one secure place.
            </p>
          </div>

          <div className="cv-search-wrap">
            <span className="cv-search-icon"><Icon name="search" size={16} /></span>
            <input
              type="text"
              placeholder="Search cases, judge, client, tags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search cases"
            />
            <span className="cv-filter-icon" role="button" aria-label="Filter"><Icon name="filter" size={16} /></span>
          </div>

          <div className="cv-filter-grid">
            <select className="cv-select" value={filters.court} onChange={(e) => setFilters({ ...filters, court: e.target.value })}>
              <option value="">All courts</option>{uniqueCourtNames.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="cv-select" value={filters.courtLocation} onChange={(e) => setFilters({ ...filters, courtLocation: e.target.value })}>
              <option value="">All jurisdictions</option>{uniqueCourtLocations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select className="cv-select" value={filters.stage} onChange={(e) => setFilters({ ...filters, stage: e.target.value })}>
              <option value="">All stages</option>{stageNames.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select className="cv-select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All status</option>{statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="cv-seg">
            {['Active', 'Archived'].map((t) => (
              <button
                key={t}
                className={`cv-seg__btn${filters.view === t.toLowerCase() ? ' active' : ''}`}
                onClick={() => setFilters({ ...filters, view: t.toLowerCase() })}
              >
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="cv-spinner-wrap">
              <div className="cv-spinner" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="cv-empty">No cases found.</div>
          ) : (
            filtered.map((c) => (
              <article key={c.id} className={`cv-case-card${c.archived ? ' cv-case-card--archived' : ''}`}>
                <div className="cv-case-card__row1">
                  <div className="cv-case-card__left">
                    <button
                      className={`cv-case-card__star${c.watch ? ' starred' : ''}`}
                      onClick={() => act(() => caseLogic.toggleWatch(c.id, !c.watch))}
                      aria-label={c.watch ? 'Remove from starred' : 'Star this case'}
                    >
                      <Icon name="star" size={17} fill={c.watch} />
                    </button>
                    <div className="cv-case-card__title-row">
                      <span className="cv-case-card__title">{formatCaseNum(c)}</span>
                    </div>
                  </div>
                  <div className="cv-case-card__right">
                    <span className="cv-case-card__badge">
                      <span className="cv-case-card__badge-dot" />
                      {c.stage || c.status || (c.archived ? 'Archived' : 'Active')}
                    </span>
                  </div>
                </div>

                <p className="cv-case-card__parties">{c.title}</p>

                <div className="cv-case-card__court-row">
                  <Icon name="building" size={13} /> {c.courtName || combinedCourt(c)}
                </div>
                <div className="cv-case-card__meta-row">
                  <span><Icon name="users" size={13} /> {c.bench_type || '—'}</span>
                  <span><Icon name="user" size={13} /> {c.judge || '—'}</span>
                </div>

                <div className="cv-case-card__dates">
                  <div className="cv-case-card__dates-item cv-case-card__dates-item--next">
                    <span className="cv-case-card__dates-label">Next Hearing</span>
                    <span className="cv-case-card__dates-value"><Icon name="calendar" size={12} /> {formatDate(c.nextHearing) || '—'}</span>
                  </div>
                  <div className="cv-case-card__dates-divider" />
                  <div className="cv-case-card__dates-item cv-case-card__dates-item--last">
                    <span className="cv-case-card__dates-label">Last Hearing</span>
                    <span className="cv-case-card__dates-value"><Icon name="calendar" size={12} /> {formatDate(c.updatedAt || c.registration_date) || '—'}</span>
                  </div>
                </div>

                <div className="cv-case-card__actions" role="toolbar" aria-label="Case actions">
                  <button className="cv-action-btn" onClick={() => nav(`/cases/${c.id}`)} aria-label="View case">
                    <Icon name="eye" size={16} /><span>View</span>
                  </button>
                  <PermissionGate perm="manageCase.edit">
                    <button className="cv-action-btn" onClick={() => nav(`/cases/${c.id}?edit=1`)} aria-label="Edit case">
                      <Icon name="edit" size={16} /><span>Edit</span>
                    </button>
                  </PermissionGate>
                  <PermissionGate perm="manageCase.create">
                    <button className="cv-action-btn" onClick={() => act(() => caseLogic.duplicate(c.id, user), 'Case duplicated.')} aria-label="Duplicate case">
                      <Icon name="layers" size={16} /><span>Duplicate</span>
                    </button>
                  </PermissionGate>
                  <button className="cv-action-btn" onClick={() => nav(`/cases/${c.id}?tab=Documents`)} aria-label="Documents">
                    <Icon name="documents" size={16} /><span>Documents</span>
                  </button>
                  <button className="cv-action-btn" onClick={() => nav(`/cases/${c.id}?tab=Hearings`)} aria-label="Hearings">
                    <Icon name="video" size={16} /><span>Hearings</span>
                  </button>
                  <PermissionGate perm="manageCase.delete">
                    <button className="cv-action-btn" onClick={() => remove(c)} aria-label="Delete case">
                      <Icon name="trash" size={16} /><span>Delete</span>
                    </button>
                  </PermissionGate>
                </div>
              </article>
            ))
          )}

          <Modal open={open} title="New Case" size="lg" onClose={() => setOpen(false)}>
            <CaseForm onSubmit={save} onCancel={() => setOpen(false)} busy={busy} submitLabel="Create Cases" />
          </Modal>
        </div>
      )}
    </>
  );
}

