import { useState, useEffect } from 'react';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { Input, Textarea, Select } from '@/components/Field.jsx';
import { actLogic } from '@/logic/actLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import ConfirmDialog from '@/components/setup/wizard/ConfirmDialog.jsx';
import Modal from '@/components/Modal.jsx';

const ACTIONS = [
  { key: 'add', label: 'Add', icon: 'plus', variant: 'primary' },
  { key: 'edit', label: 'Edit', icon: 'edit', variant: 'outline' },
  { key: 'delete', label: 'Delete', icon: 'trash', variant: 'danger-outline' },
  { key: 'import', label: 'Import', icon: 'upload', variant: 'outline' },
];

export default function ActLibrary() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ totalActs: 0, totalSections: 0, totalAmendments: 0, lastUpdated: '—' });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [viewMode, setViewMode] = useState('list');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [activeAction, setActiveAction] = useState(null);
  const [subMode, setSubMode] = useState('single');

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('');
  const [newJurisdiction, setNewJurisdiction] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newSections, setNewSections] = useState('');
  const [newAmendments, setNewAmendments] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStatus, setNewStatus] = useState('Active');
  const [newCode, setNewCode] = useState('');

  const [editId, setEditId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState('');
  const [editJurisdiction, setEditJurisdiction] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editSections, setEditSections] = useState('');
  const [editAmendments, setEditAmendments] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [editCode, setEditCode] = useState('');

  const [delId, setDelId] = useState('');
  const [viewItem, setViewItem] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [dupTarget, setDupTarget] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [importFile, setImportFile] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([actLogic.list(), actLogic.stats()]).then(([list, s]) => {
      setItems(Array.isArray(list) ? list : []);
      if (s && !s.error) setStats(s);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const types = [...new Set(items.map(i => i.act_type).filter(Boolean))];

  const filtered = items.filter(i => {
    if (search && !i.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType && i.act_type !== filterType) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'title') return a.title?.localeCompare?.(b.title) || 0;
    if (sortBy === 'type') return (a.act_type || '').localeCompare(b.act_type || '');
    if (sortBy === 'sections') return (b.sections_count || 0) - (a.sections_count || 0);
    if (sortBy === 'amendments') return (b.amendments_count || 0) - (a.amendments_count || 0);
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const activeActs = items.filter(i => (i.status || 'Active').toLowerCase() === 'active').length;
  const actsWithAmendments = items.filter(i => (i.amendments_count || 0) > 0).length;

  useEffect(() => { setPage(1); }, [search, filterType]);

  const reset = () => {
    setActiveAction(null);
    setSubMode('single');
    setNewTitle(''); setNewType(''); setNewJurisdiction(''); setNewYear(''); setNewSections(''); setNewAmendments(''); setNewDesc(''); setNewStatus('Active'); setNewCode('');
    setEditId(''); setEditTitle(''); setEditType(''); setEditJurisdiction(''); setEditYear(''); setEditSections(''); setEditAmendments(''); setEditDesc(''); setEditStatus('Active'); setEditCode('');
    setDelId(''); setImportFile(null);
    setEditTarget(null); setDupTarget(null);
    setPage(1);
  };

  const activate = (key) => {
    if (activeAction === key) { reset(); return; }
    setActiveAction(key);
    setSubMode('single');
  };

  const doAdd = async () => {
    if (!newTitle.trim()) { toast.push('Title is required.', 'error'); return; }
    setBusy(true);
    const res = await actLogic.create({ title: newTitle, act_type: newType, jurisdiction: newJurisdiction, year: parseInt(newYear) || 0, sections_count: parseInt(newSections) || 0, amendments_count: parseInt(newAmendments) || 0, description: newDesc, status: newStatus, short_code: newCode });
    setBusy(false);
    if (res.ok) { reset(); toast.push('Act added.', 'success'); load(); }
    else toast.push(res.error || 'Failed to add act.', 'error');
  };

  const doEdit = async () => {
    if (!editId) { toast.push('Select an act to edit.', 'error'); return; }
    if (!editTitle.trim()) { toast.push('Title cannot be empty.', 'error'); return; }
    setBusy(true);
    const res = await actLogic.update(editId, { title: editTitle, act_type: editType, jurisdiction: editJurisdiction, year: parseInt(editYear) || 0, sections_count: parseInt(editSections) || 0, amendments_count: parseInt(editAmendments) || 0, description: editDesc, status: editStatus, short_code: editCode });
    setBusy(false);
    if (res.ok) { setEditId(''); setEditTarget(null); reset(); toast.push('Act updated.', 'success'); load(); }
    else toast.push(res.error || 'Failed to update act.', 'error');
  };

  const doDelete = async () => {
    if (!delId) { toast.push('Select an act to delete.', 'error'); return; }
    const item = items.find(x => x.id === delId);
    setConfirmState({
      title: 'Delete Act',
      message: `Delete act "${item?.title}"?`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmState(null);
        setBusy(true);
        const res = await actLogic.remove(delId);
        setBusy(false);
        if (res.ok || !res.error) { setDelId(''); toast.push('Act deleted.', 'success'); load(); }
        else toast.push(res.error, 'error');
      },
      onCancel: () => setConfirmState(null),
    });
  };

  const doImport = async () => {
    if (!importFile) { toast.push('Select a CSV file.', 'error'); return; }
    setBusy(true);
    toast.push('CSV import coming soon.', 'info');
    setBusy(false);
  };

  const typeColors = {
    criminal: '#dc2626',
    civil: '#2563eb',
    corporate: '#7c3aed',
    tax: '#ca8a04',
    labour: '#0891b2',
    constitutional: '#be123c',
    family: '#db2777',
    property: '#65a30d',
    commercial: '#0d9488',
    environmental: '#16a34a',
  };
  const getTypeColor = (type) => typeColors[type?.toLowerCase()] || '#6b7280';

  const startEdit = (item) => {
    setActiveAction(null);
    setEditId(item.id);
    setEditTitle(item.title || '');
    setEditType(item.act_type || '');
    setEditJurisdiction(item.jurisdiction || '');
    setEditYear(item.year?.toString() || '');
    setEditSections(item.sections_count?.toString() || '');
    setEditAmendments(item.amendments_count?.toString() || '');
    setEditDesc(item.description || '');
    setEditStatus(item.status || 'Active');
    setEditCode(item.short_code || '');
    setEditTarget(item);
  };

  const startDelete = (item) => {
    setActiveAction('delete');
    setSubMode('single');
    setDelId(item.id);
  };

  const startDuplicate = (item) => {
    setNewTitle((item.title || '') + ' (copy)');
    setNewType(item.act_type || '');
    setNewJurisdiction(item.jurisdiction || '');
    setNewYear(item.year?.toString() || '');
    setNewSections(item.sections_count?.toString() || '');
    setNewAmendments(item.amendments_count?.toString() || '');
    setNewDesc(item.description || '');
    setNewStatus(item.status || 'Active');
    setNewCode(item.short_code || '');
    setDupTarget(item);
  };

  const confirmDeleteItem = (item) => {
    setConfirmState({
      title: 'Delete Act',
      message: `Delete act "${item?.title}"? This action cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmState(null);
        setBusy(true);
        const res = await actLogic.remove(item.id);
        setBusy(false);
        if (res.ok || !res.error) { toast.push('Act deleted.', 'success'); load(); }
        else toast.push(res.error, 'error');
      },
      onCancel: () => setConfirmState(null),
    });
  };

  if (loading) return <div className="fade-in bench-types__loading"><div className="spinner" /></div>;

  return (
    <div className="fade-in bench-types">
      <div className="bench-types__hero">
        <div className="bench-types__hero-icon"><Icon name="book" size={34} /></div>
        <div className="bench-types__hero-text">
          <h2>Acts Library</h2>
          <p>Browse and search legal acts, their sections, and amendments.</p>
          <div className="bench-types__hero-accent" />
        </div>
        <Icon name="book" className="bench-types__hero-watermark bench-types__watermark-icon" />
      </div>

      <div className="bench-types__stats-row">
        <div className="bench-types__statcard">
          <div className="bench-types__statcard-icon bench-types__statcard-icon--total"><Icon name="book" size={16} /></div>
          <div className="bench-types__statcard-body">
            <div className="bench-types__statcard-label">Total Acts</div>
            <div className="bench-types__statcard-value">{stats.totalActs}</div>
            <div className="bench-types__statcard-sub">All acts</div>
          </div>
        </div>
        <div className="bench-types__statcard">
          <div className="bench-types__statcard-icon bench-types__statcard-icon--active"><Icon name="file" size={16} /></div>
          <div className="bench-types__statcard-body">
            <div className="bench-types__statcard-label">Sections</div>
            <div className="bench-types__statcard-value">{stats.totalSections}</div>
            <div className="bench-types__statcard-sub">Total sections</div>
          </div>
        </div>
        <div className="bench-types__statcard">
          <div className="bench-types__statcard-icon bench-types__statcard-icon--inactive"><Icon name="layers" size={16} /></div>
          <div className="bench-types__statcard-body">
            <div className="bench-types__statcard-label">Amendments</div>
            <div className="bench-types__statcard-value bench-types__statcard-value--sm">{stats.totalAmendments}</div>
            <div className="bench-types__statcard-sub">Total amendments</div>
          </div>
        </div>
        <div className="bench-types__statcard">
          <div className="bench-types__statcard-icon bench-types__statcard-icon--most-used"><Icon name="check-circle" size={16} /></div>
          <div className="bench-types__statcard-body">
            <div className="bench-types__statcard-label">Active Acts</div>
            <div className="bench-types__statcard-value bench-types__statcard-value--sm">{activeActs}</div>
            <div className="bench-types__statcard-sub">Currently in force</div>
          </div>
        </div>
        <div className="bench-types__statcard">
          <div className="bench-types__statcard-icon bench-types__statcard-icon--created-month"><Icon name="calendar" size={16} /></div>
          <div className="bench-types__statcard-body">
            <div className="bench-types__statcard-label">With Amendments</div>
            <div className="bench-types__statcard-value bench-types__statcard-value--sm">{actsWithAmendments}</div>
            <div className="bench-types__statcard-sub">Acts amended</div>
          </div>
        </div>
        <div className="bench-types__statcard">
          <div className="bench-types__statcard-icon bench-types__statcard-icon--assignments"><Icon name="clock" size={16} /></div>
          <div className="bench-types__statcard-body">
            <div className="bench-types__statcard-label">Last Updated</div>
            <div className="bench-types__statcard-value bench-types__statcard-value--sm">{stats.lastUpdated !== '—' ? new Date(stats.lastUpdated).toLocaleDateString() : '—'}</div>
            <div className="bench-types__statcard-sub">Most recent update</div>
          </div>
        </div>
      </div>

      {/* ── Toolbar: actions + search + filters + view toggle ── */}
      <div className="bench-types__toolbar">
        <div className="bench-types__toolbar-left">
          {ACTIONS.map(a => (
            <Button
              key={a.key}
              icon={a.icon}
              variant={activeAction === a.key ? a.variant : 'ghost'}
              onClick={() => activate(a.key)}
              className={a.variant === 'danger-outline' ? 'cmp-btn-danger-outline' : ''}
            >
              {a.label}
            </Button>
          ))}
        </div>
        <div className="bench-types__toolbar-right">
          <div className="bench-types__view-toggle">
            <button className={`bench-types__view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')} title="List view">
              <Icon name="list" size={16} />
            </button>
            <button className={`bench-types__view-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')} title="Grid view">
              <Icon name="grid" size={16} />
            </button>
          </div>
        </div>
      </div>

      <button className="bench-types__import-mobile bench-types__mobile-only" onClick={() => activate('import')}>
        <Icon name="upload" size={16} /> Import
      </button>

      {/* ── Action forms ── */}
      {activeAction && (
        <Card className="bench-types__form">
          <div className="bench-types__form-header">
            <Icon name={ACTIONS.find(a => a.key === activeAction)?.icon || 'file'} size={18} />
            <span className="bench-types__form-header-title">{ACTIONS.find(a => a.key === activeAction)?.label} Act</span>
            <button className="iconbtn bench-types__form-close" onClick={reset} title="Close"><Icon name="close" size={18} /></button>
          </div>
          <div className="bench-types__form-body">
            {activeAction === 'add' && (
              <div className="bench-types__form-grid">
                <div className="bench-types__field bench-types__field--full">
                  <label className="bench-types__label">Title <span className="bench-types__required">*</span></label>
                  <Input value={newTitle} placeholder="e.g., Indian Penal Code" onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && doAdd()} />
                </div>
                <div className="bench-types__field">
                  <label className="bench-types__label">Short Code</label>
                  <Input value={newCode} placeholder="e.g., IPC" onChange={e => setNewCode(e.target.value)} />
                </div>
                <div className="bench-types__field">
                  <label className="bench-types__label">Type</label>
                  <Input value={newType} placeholder="e.g., Criminal" onChange={e => setNewType(e.target.value)} />
                </div>
                <div className="bench-types__field">
                  <label className="bench-types__label">Jurisdiction</label>
                  <Input value={newJurisdiction} placeholder="e.g., National" onChange={e => setNewJurisdiction(e.target.value)} />
                </div>
                <div className="bench-types__field">
                  <label className="bench-types__label">Year</label>
                  <Input type="number" value={newYear} placeholder="e.g., 1860" onChange={e => setNewYear(e.target.value)} />
                </div>
                <div className="bench-types__field">
                  <label className="bench-types__label">Sections</label>
                  <Input type="number" value={newSections} placeholder="0" onChange={e => setNewSections(e.target.value)} />
                </div>
                <div className="bench-types__field">
                  <label className="bench-types__label">Amendments</label>
                  <Input type="number" value={newAmendments} placeholder="0" onChange={e => setNewAmendments(e.target.value)} />
                </div>
                <div className="bench-types__field">
                  <label className="bench-types__label">Status</label>
                  <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                    <option>Active</option>
                    <option>Inactive</option>
                  </Select>
                </div>
                <div className="bench-types__field bench-types__field--full">
                  <label className="bench-types__label">Description <span className="bench-types__optional">(optional)</span></label>
                  <Textarea value={newDesc} placeholder="Brief description…" onChange={e => setNewDesc(e.target.value)} maxLength={500} />
                </div>
              </div>
            )}
            {activeAction === 'edit' && (
              <div className="bench-types__form-grid">
                <div className="bench-types__field bench-types__field--full">
                  <label className="bench-types__label">Select Act <span className="bench-types__required">*</span></label>
                  <Select value={editId} onChange={e => { setEditId(e.target.value); const item = items.find(x => x.id === e.target.value); if (item) { setEditTitle(item.title || ''); setEditType(item.act_type || ''); setEditJurisdiction(item.jurisdiction || ''); setEditYear(item.year?.toString() || ''); setEditSections(item.sections_count?.toString() || ''); setEditAmendments(item.amendments_count?.toString() || ''); setEditDesc(item.description || ''); setEditStatus(item.status || 'Active'); setEditCode(item.short_code || ''); } }}>
                    <option value="">— choose —</option>
                    {items.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
                  </Select>
                </div>
                {editId && (
                  <>
                    <div className="bench-types__field bench-types__field--full">
                      <label className="bench-types__label">Title <span className="bench-types__required">*</span></label>
                      <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                    </div>
                    <div className="bench-types__field">
                      <label className="bench-types__label">Short Code</label>
                      <Input value={editCode} onChange={e => setEditCode(e.target.value)} />
                    </div>
                    <div className="bench-types__field">
                      <label className="bench-types__label">Type</label>
                      <Input value={editType} onChange={e => setEditType(e.target.value)} />
                    </div>
                    <div className="bench-types__field">
                      <label className="bench-types__label">Jurisdiction</label>
                      <Input value={editJurisdiction} onChange={e => setEditJurisdiction(e.target.value)} />
                    </div>
                    <div className="bench-types__field">
                      <label className="bench-types__label">Year</label>
                      <Input type="number" value={editYear} onChange={e => setEditYear(e.target.value)} />
                    </div>
                    <div className="bench-types__field">
                      <label className="bench-types__label">Sections</label>
                      <Input type="number" value={editSections} onChange={e => setEditSections(e.target.value)} />
                    </div>
                    <div className="bench-types__field">
                      <label className="bench-types__label">Amendments</label>
                      <Input type="number" value={editAmendments} onChange={e => setEditAmendments(e.target.value)} />
                    </div>
                    <div className="bench-types__field">
                      <label className="bench-types__label">Status</label>
                      <Select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                        <option>Active</option>
                        <option>Inactive</option>
                      </Select>
                    </div>
                    <div className="bench-types__field bench-types__field--full">
                      <label className="bench-types__label">Description</label>
                      <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={500} />
                    </div>
                  </>
                )}
              </div>
            )}
            {activeAction === 'delete' && (
              <div className="bench-types__form-grid">
                <div className="bench-types__field bench-types__field--full">
                  <label className="bench-types__label">Select Act <span className="bench-types__required">*</span></label>
                  <Select value={delId} onChange={e => setDelId(e.target.value)}>
                    <option value="">— choose —</option>
                    {items.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
                  </Select>
                </div>
                {delId && (
                  <div className="bench-types__warning">
                    <Icon name="alert" size={16} />
                    <span>This action cannot be undone. All associated data will be removed.</span>
                  </div>
                )}
              </div>
            )}
            {activeAction === 'import' && (
              <div className="bench-types__import">
                <div className="bench-types__import-icon"><Icon name="upload" size={28} /></div>
                <div className="bench-types__import-title">Import from CSV</div>
                <div className="bench-types__import-hint">CSV columns: title, act_type, jurisdiction, year, sections_count, amendments_count</div>
                <label className="bench-types__import-btn">
                  <input type="file" accept=".csv" className="bench-types__file-input" onChange={e => setImportFile(e.target.files[0])} />
                  <span className="btn btn--ghost">{importFile ? importFile.name : 'Choose CSV file'}</span>
                </label>
                {importFile && <div className="bench-types__import-file">Selected: {importFile.name}</div>}
              </div>
            )}
          </div>
          <div className="bench-types__form-footer">
            <Button variant="ghost" onClick={reset} disabled={busy}>Cancel</Button>
            {activeAction === 'add' && <Button icon="plus" onClick={doAdd} disabled={busy}>{busy ? 'Adding…' : 'Add Act'}</Button>}
            {activeAction === 'edit' && <Button icon="check" onClick={doEdit} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</Button>}
            {activeAction === 'delete' && <Button variant="danger" icon="trash" onClick={doDelete} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</Button>}
            {activeAction === 'import' && <Button icon="upload" onClick={doImport} disabled={!importFile || busy}>Import</Button>}
          </div>
        </Card>
      )}

      {/* ── Search & filter bar in one row ── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '0 0 16px', flexWrap: 'wrap' }}>
        <div className="bench-types__search" style={{ flex: 1, minWidth: 220 }}>
          <Icon name="search" size={18} />
          <input value={search} placeholder="Search acts by title..." autoComplete="off" onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div style={{ width: 180 }}>
          <Select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <div style={{ width: 180 }}>
          <Select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="title">Sort: Title</option>
            <option value="type">Sort: Type</option>
            <option value="sections">Sort: Sections</option>
            <option value="amendments">Sort: Amendments</option>
          </Select>
        </div>
      </div>

      {/* ── Mobile stat cards ── */}
      <div className="bench-types__stat-cards bench-types__mobile-only">
        <div className="bench-types__stat-card bench-types__stat-card--total">
          <div className="bench-types__stat-card-row1">
            <div className="bench-types__stat-card-icon"><Icon name="book" size={18} /></div>
            <span className="bench-types__stat-card-num">{stats.totalActs}</span>
          </div>
          <div className="bench-types__stat-card-label">ACTS</div>
        </div>
        <div className="bench-types__stat-card bench-types__stat-card--active">
          <div className="bench-types__stat-card-row1">
            <div className="bench-types__stat-card-icon"><Icon name="file" size={18} /></div>
            <span className="bench-types__stat-card-num">{stats.totalSections}</span>
          </div>
          <div className="bench-types__stat-card-label">SECTIONS</div>
        </div>
        <div className="bench-types__stat-card bench-types__stat-card--inactive">
          <div className="bench-types__stat-card-row1">
            <div className="bench-types__stat-card-icon"><Icon name="layers" size={18} /></div>
            <span className="bench-types__stat-card-num">{stats.totalAmendments}</span>
          </div>
          <div className="bench-types__stat-card-label">AMENDMENTS</div>
        </div>
      </div>

      {/* ── List view ── */}
      {viewMode === 'list' ? (
        <>
          <div className="bench-types__table-card">
            <table className="bench-types__table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>TITLE</th>
                  <th>TYPE</th>
                  <th>JURISDICTION</th>
                  <th>YEAR</th>
                  <th>SECTIONS</th>
                  <th>AMENDMENTS</th>
                  <th className="bench-types__th--w136">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td className="bench-types__empty" colSpan={8}>No acts found.</td></tr>
                ) : paged.map((item, idx) => (
                  <tr key={item.id}>
                    <td><span className="cmp-order-num">{(safePage - 1) * perPage + idx + 1}</span></td>
                    <td>
                      <div className="cmp-name-cell">
                        <span className="cmp-color-swatch-lg" style={{ '--swatch-color': getTypeColor(item.act_type) }} />
                        <span className="cmp-name-avatar"><Icon name="book" size={15} /></span>
                        <span className="cmp-cell-name">{item.title}</span>
                      </div>
                    </td>
                    <td>{item.act_type ? <span className="badge badge--info">{item.act_type}</span> : '—'}</td>
                    <td>{item.jurisdiction || '—'}</td>
                    <td>{item.year || '—'}</td>
                    <td>{item.sections_count || 0}</td>
                    <td>{item.amendments_count || 0}</td>
                    <td>
                      <div className="cmp-actions">
                        <button className="cmp-act-btn cmp-act-btn--view" title="View" onClick={() => setViewItem(item)}><Icon name="eye" size={15} /></button>
                        <button className="cmp-act-btn cmp-act-btn--edit" title="Edit" onClick={() => startEdit(item)}><Icon name="edit" size={15} /></button>
                        <button className="cmp-act-btn cmp-act-btn--copy" title="Duplicate" onClick={() => { startDuplicate(item); setActiveAction('add'); }}><Icon name="copy" size={15} /></button>
                        <button className="cmp-act-btn cmp-act-btn--del" title="Delete" onClick={() => confirmDeleteItem(item)}><Icon name="trash" size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bench-types__table-footer">
              <div>Showing {(safePage - 1) * perPage + 1} to {Math.min(safePage * perPage, filtered.length)} of {filtered.length} acts</div>
              <span className="bench-types__ft-perpage" onClick={() => setPerPage(perPage === 10 ? 20 : perPage === 20 ? 50 : 10)}>
                {perPage} / page <Icon name="chevronDown" size={13} />
              </span>
              {totalPages > 1 && (
                <div className="bench-types__pagination">
                  <button className="bench-types__page-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}><Icon name="chevronLeft" size={14} /></button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const start = Math.max(1, Math.min(safePage - Math.floor(5 / 2), totalPages - 4));
                    const p = start + i;
                    if (p > totalPages) return null;
                    return <button key={p} className={`bench-types__page-btn${safePage === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
                  })}
                  <button className="bench-types__page-btn" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}><Icon name="chevron" size={14} /></button>
                </div>
              )}
            </div>
          </div>

          <div className="bench-types__mobile-section-header bench-types__mobile-only">
            <span className="bench-types__mobile-section-title">All Acts</span>
            <span className="bench-types__mobile-section-count">{Math.min(perPage, filtered.length)} of {filtered.length}</span>
            <span className="bench-types__mobile-per-page" onClick={() => setPerPage(perPage === 10 ? 20 : perPage === 20 ? 50 : 10)}>{perPage} / page <Icon name="chevronDown" size={13} /></span>
          </div>
          <div className="bench-types__mobile-list bench-types__mobile-only">
            {paged.length === 0 ? (
              <div className="bench-types__empty">No acts found.</div>
            ) : paged.map((item) => (
              <div key={item.id} className="bench-types__mobile-card">
                <div className="bench-types__mobile-card-row1">
                  <span className="bench-types__mobile-avatar"><Icon name="book" size={18} /></span>
                  <div className="bench-types__mobile-card-info">
                    <div className="bench-types__mobile-card-top">
                      <span className="bench-types__mobile-card-name">{item.title}</span>
                      {item.act_type && <span className="badge badge--info">{item.act_type}</span>}
                    </div>
                    <span className="bench-types__mobile-code">{item.jurisdiction || '—'} · {item.sections_count || 0} sections</span>
                  </div>
                </div>
                <div className="bench-types__mobile-divider"></div>
                <div className="bench-types__mobile-card-row2">
                  <button className="bench-types__mobile-action" title="View" onClick={() => setViewItem(item)}>
                    <span className="bench-types__mobile-action-icon"><Icon name="eye" size={15} /></span>
                    <span className="bench-types__mobile-action-label">View</span>
                  </button>
                  <button className="bench-types__mobile-action" title="Edit" onClick={() => startEdit(item)}>
                    <span className="bench-types__mobile-action-icon"><Icon name="edit" size={15} /></span>
                    <span className="bench-types__mobile-action-label">Edit</span>
                  </button>
                  <button className="bench-types__mobile-action bench-types__mobile-action--copy" title="Duplicate" onClick={() => { startDuplicate(item); setActiveAction('add'); }}>
                    <span className="bench-types__mobile-action-icon"><Icon name="copy" size={15} /></span>
                    <span className="bench-types__mobile-action-label">Duplicate</span>
                  </button>
                  <button className="bench-types__mobile-action bench-types__mobile-action--del" title="Delete" onClick={() => confirmDeleteItem(item)}>
                    <span className="bench-types__mobile-action-icon"><Icon name="trash" size={15} /></span>
                    <span className="bench-types__mobile-action-label">Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* ── Grid view ── */}
          <div className="bench-types__table-footer bench-types__desktop-only">
            <div>Showing {(safePage - 1) * perPage + 1} to {Math.min(safePage * perPage, filtered.length)} of {filtered.length} acts</div>
            <span className="bench-types__ft-perpage" onClick={() => setPerPage(perPage === 10 ? 20 : perPage === 20 ? 50 : 10)}>
              {perPage} / page <Icon name="chevronDown" size={13} />
            </span>
            {totalPages > 1 && (
              <div className="bench-types__pagination">
                <button className="bench-types__page-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}><Icon name="chevronLeft" size={14} /></button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(safePage - Math.floor(5 / 2), totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return <button key={p} className={`bench-types__page-btn${safePage === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
                })}
                <button className="bench-types__page-btn" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}><Icon name="chevron" size={14} /></button>
              </div>
            )}
          </div>
          <div className="bench-types__mobile-section-header bench-types__mobile-only">
            <span className="bench-types__mobile-section-title">All Acts</span>
            <span className="bench-types__mobile-section-count">{Math.min(perPage, filtered.length)} of {filtered.length}</span>
          </div>
          <div className="bench-types__grid">
            {paged.length === 0 ? (
              <div className="bench-types__empty" style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center' }}>No acts found.</div>
            ) : paged.map((item) => (
              <div key={item.id} className="bench-types__grid-card">
                <div className="bench-types__grid-card-header">
                  <div className="bench-types__grid-card-icon" style={{ background: `${getTypeColor(item.act_type)}1a`, color: getTypeColor(item.act_type) }}><Icon name="book" size={22} /></div>
                  <div className="bench-types__grid-card-title">{item.title}</div>
                </div>
                <div className="bench-types__grid-card-body">
                  {item.act_type && <span className="badge badge--info">{item.act_type}</span>}
                  {item.jurisdiction && <span className="bench-types__grid-card-meta"><Icon name="map-pin" size={13} />{item.jurisdiction}</span>}
                  <div className="bench-types__grid-card-stats">
                    <div className="bench-types__grid-card-stat">
                      <span className="bench-types__grid-card-stat-value">{item.sections_count || 0}</span>
                      <span className="bench-types__grid-card-stat-label">Sections</span>
                    </div>
                    <div className="bench-types__grid-card-stat">
                      <span className="bench-types__grid-card-stat-value">{item.amendments_count || 0}</span>
                      <span className="bench-types__grid-card-stat-label">Amendments</span>
                    </div>
                  </div>
                  <div className="bench-types__grid-card-actions">
                    <button className="cmp-act-btn" title="View" onClick={() => setViewItem(item)}><Icon name="eye" size={15} /><span>View</span></button>
                    <button className="cmp-act-btn" title="Edit" onClick={() => startEdit(item)}><Icon name="edit" size={15} /><span>Edit</span></button>
                    <button className="cmp-act-btn" title="Duplicate" onClick={() => { startDuplicate(item); setActiveAction('add'); }}><Icon name="copy" size={15} /><span>Copy</span></button>
                    <button className="cmp-act-btn" title="Delete" onClick={() => confirmDeleteItem(item)}><Icon name="trash" size={15} /><span>Delete</span></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="bench-types__mobile-pagination bench-types__mobile-only">
            <div className="bench-types__mobile-pag-info">Showing {(safePage - 1) * perPage + 1} to {Math.min(safePage * perPage, filtered.length)} of {filtered.length}</div>
            {totalPages > 1 && (
              <div className="bench-types__pagination" style={{ justifyContent: 'center', marginTop: 12 }}>
                <button className="bench-types__page-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}><Icon name="chevronLeft" size={14} /></button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return <button key={p} className={`bench-types__page-btn${safePage === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
                })}
                <button className="bench-types__page-btn" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}><Icon name="chevron" size={14} /></button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── View Modal ── */}
      <Modal open={!!viewItem} title={viewItem?.title || 'Act Details'} onClose={() => setViewItem(null)}>
        <div className="bench-types__detail-body">
          <div className="bench-types__detail-row">
            <span className="bench-types__detail-label">Title</span>
            <span className="bench-types__detail-value">
              <span className="cmp-color-swatch-lg" style={{ '--swatch-color': getTypeColor(viewItem?.act_type), marginRight: 8 }} />
              {viewItem?.title || '—'}
            </span>
          </div>
          <div className="bench-types__detail-row">
            <span className="bench-types__detail-label">Short Code</span>
            <span className="bench-types__detail-value">{viewItem?.short_code || '—'}</span>
          </div>
          <div className="bench-types__detail-row">
            <span className="bench-types__detail-label">Type</span>
            <span className="bench-types__detail-value">{viewItem?.act_type || '—'}</span>
          </div>
          <div className="bench-types__detail-row">
            <span className="bench-types__detail-label">Jurisdiction</span>
            <span className="bench-types__detail-value">{viewItem?.jurisdiction || '—'}</span>
          </div>
          <div className="bench-types__detail-row">
            <span className="bench-types__detail-label">Year</span>
            <span className="bench-types__detail-value">{viewItem?.year || '—'}</span>
          </div>
          <div className="bench-types__detail-row">
            <span className="bench-types__detail-label">Sections</span>
            <span className="bench-types__detail-value">{viewItem?.sections_count || 0}</span>
          </div>
          <div className="bench-types__detail-row">
            <span className="bench-types__detail-label">Amendments</span>
            <span className="bench-types__detail-value">{viewItem?.amendments_count || 0}</span>
          </div>
          <div className="bench-types__detail-row">
            <span className="bench-types__detail-label">Status</span>
            <span className={`badge badge--${(viewItem?.status || '').toLowerCase() === 'active' ? 'active' : 'inactive'}`}>{viewItem?.status || 'Active'}</span>
          </div>
          <div className="bench-types__detail-row">
            <span className="bench-types__detail-label">Description</span>
            <span className="bench-types__detail-value">{viewItem?.description || '—'}</span>
          </div>
        </div>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal open={!!editTarget} title="Edit Act" onClose={() => setEditTarget(null)}
        footer={<div className="cmp-modal-footer">
          <Button variant="ghost" onClick={() => setEditTarget(null)} disabled={busy}>Cancel</Button>
          <Button icon="check" onClick={doEdit} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</Button>
        </div>}>
        <div className="bench-types__form-grid">
          <div className="bench-types__field bench-types__field--full">
            <label className="bench-types__label">Title <span className="bench-types__required">*</span></label>
            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
          </div>
          <div className="bench-types__field">
            <label className="bench-types__label">Short Code</label>
            <Input value={editCode} onChange={e => setEditCode(e.target.value)} />
          </div>
          <div className="bench-types__field">
            <label className="bench-types__label">Type</label>
            <Input value={editType} onChange={e => setEditType(e.target.value)} />
          </div>
          <div className="bench-types__field">
            <label className="bench-types__label">Jurisdiction</label>
            <Input value={editJurisdiction} onChange={e => setEditJurisdiction(e.target.value)} />
          </div>
          <div className="bench-types__field">
            <label className="bench-types__label">Year</label>
            <Input type="number" value={editYear} onChange={e => setEditYear(e.target.value)} />
          </div>
          <div className="bench-types__field">
            <label className="bench-types__label">Sections</label>
            <Input type="number" value={editSections} onChange={e => setEditSections(e.target.value)} />
          </div>
          <div className="bench-types__field">
            <label className="bench-types__label">Amendments</label>
            <Input type="number" value={editAmendments} onChange={e => setEditAmendments(e.target.value)} />
          </div>
          <div className="bench-types__field">
            <label className="bench-types__label">Status</label>
            <Select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </Select>
          </div>
          <div className="bench-types__field bench-types__field--full">
            <label className="bench-types__label">Description</label>
            <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={500} />
          </div>
        </div>
      </Modal>

      {/* ── Duplicate Modal ── */}
      <Modal open={!!editTarget} title="Edit Act" onClose={() => setEditTarget(null)}
        footer={<div className="cmp-modal-footer">
          <Button variant="ghost" onClick={() => setDupTarget(null)} disabled={busy}>Cancel</Button>
          <Button icon="plus" onClick={doAdd} disabled={busy}>{busy ? 'Adding…' : 'Add Act'}</Button>
        </div>}>
        <div className="bench-types__form-grid">
          <div className="bench-types__field bench-types__field--full">
            <label className="bench-types__label">Title <span className="bench-types__required">*</span></label>
            <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          </div>
          <div className="bench-types__field">
            <label className="bench-types__label">Short Code</label>
            <Input value={newCode} onChange={e => setNewCode(e.target.value)} />
          </div>
          <div className="bench-types__field">
            <label className="bench-types__label">Type</label>
            <Input value={newType} onChange={e => setNewType(e.target.value)} />
          </div>
          <div className="bench-types__field">
            <label className="bench-types__label">Jurisdiction</label>
            <Input value={newJurisdiction} onChange={e => setNewJurisdiction(e.target.value)} />
          </div>
          <div className="bench-types__field">
            <label className="bench-types__label">Year</label>
            <Input type="number" value={newYear} onChange={e => setNewYear(e.target.value)} />
          </div>
          <div className="bench-types__field">
            <label className="bench-types__label">Sections</label>
            <Input type="number" value={newSections} onChange={e => setNewSections(e.target.value)} />
          </div>
          <div className="bench-types__field">
            <label className="bench-types__label">Amendments</label>
            <Input type="number" value={newAmendments} onChange={e => setNewAmendments(e.target.value)} />
          </div>
          <div className="bench-types__field">
            <label className="bench-types__label">Status</label>
            <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </Select>
          </div>
          <div className="bench-types__field bench-types__field--full">
            <label className="bench-types__label">Description</label>
            <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} maxLength={500} />
          </div>
        </div>
      </Modal>

      {busy && (
        <div className="bench-types__busy-overlay">
          <div className="bench-types__busy-box">
            <div className="spinner" />
            <span>Please wait…</span>
          </div>
        </div>
      )}

      {confirmState && (
        <ConfirmDialog
          open={true}
          title={confirmState.title}
          message={confirmState.message}
          variant={confirmState.variant}
          confirmLabel={confirmState.confirmLabel}
          onConfirm={confirmState.onConfirm}
          onCancel={confirmState.onCancel}
        />
      )}
    </div>
  );
}

