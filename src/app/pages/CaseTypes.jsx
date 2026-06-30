import { useState, useCallback, useRef, useEffect } from 'react';
import { useCaseTypes } from '@/hooks/useCaseTypes.js';
import { caseTypeLogic } from '@/logic/caseTypeLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import Card from '@/components/Card.jsx';
import { Input, Textarea, Select } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';
import DebugPanel, { useLogCapture } from '@/components/DebugPanel.jsx';

const ENTITY_PREFIX = 'CT';

const ACTIONS = [
  { key: 'add', label: 'Add', icon: 'plus', variant: 'primary' },
  { key: 'edit', label: 'Edit', icon: 'edit', variant: 'outline' },
  { key: 'delete', label: 'Delete', icon: 'trash', variant: 'danger-outline' },
  { key: 'import', label: 'Import', icon: 'upload', variant: 'outline' },
];

const SUB_MODES = {
  add: [
    { key: 'single', label: 'Single Add', icon: 'plus' },
    { key: 'bulk', label: 'Bulk Add', icon: 'users' },
  ],
  edit: [
    { key: 'single', label: 'Single Edit', icon: 'edit' },
    { key: 'bulk', label: 'Bulk Edit', icon: 'edit' },
  ],
  delete: [
    { key: 'single', label: 'Single Delete', icon: 'trash' },
    { key: 'bulk', label: 'Bulk Delete', icon: 'trash' },
  ],
};

export default function CaseTypes() {
  const { caseTypes, loading, refresh } = useCaseTypes();
  const toast = useToast();
  const { logs, clearLogs, copyLogs } = useLogCapture();
  const [search, setSearch] = useState('');
  const [activeAction, setActiveAction] = useState(null);
  const [subMode, setSubMode] = useState('single');
  const [page, setPage] = useState(1);
  const [showFilter, setShowFilter] = useState(false);
  const [moreMenu, setMoreMenu] = useState(null);
  const searchRef = useRef(null);
  const [perPage, setPerPage] = useState(10);

  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [bulkAddText, setBulkAddText] = useState('');

  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [bulkEditText, setBulkEditText] = useState('');

  const [delId, setDelId] = useState('');
  const [bulkDelSelected, setBulkDelSelected] = useState(new Set());

  const [importFile, setImportFile] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  const [dragIdx, setDragIdx] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const dragOrder = useRef(null);

  const [lastError, setLastError] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [formCollapsed, setFormCollapsed] = useState(false);

  const filtered = caseTypes.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.short_code || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const reset = () => {
    setActiveAction(null);
    setSubMode('single');
    setNewName(''); setNewCode('');
    setBulkAddText(''); setBulkEditText('');
    setEditId(''); setEditName(''); setEditCode('');
    setDelId(''); setImportFile(null);
    setBulkDelSelected(new Set());
    setFormCollapsed(false);
    setPage(1);
  };

  const activate = (key) => {
    if (activeAction === key) { reset(); return; }
    setActiveAction(key);
    setSubMode('single');
    setFormCollapsed(false);
  };

  const autoCode = (name) => {
    const slug = name.trim().replace(/\s+/g, '-').toUpperCase();
    return `${ENTITY_PREFIX}-${slug}`;
  };

  const doAdd = async () => {
    if (!newName.trim() || !newCode.trim()) { toast.push('Name and code are required.', 'error'); return; }
    try {
      const res = await caseTypeLogic.create({ name: newName, short_code: newCode });
      if (res.ok) { setNewName(''); setNewCode(''); toast.push('Case type added.', 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { setLastError(err?.message || String(err)); toast.push(err?.message || 'Failed to create case type.', 'error'); }
  };

  const doBulkAdd = async () => {
    const lines = bulkAddText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.push('Paste at least one entry.', 'error'); return; }
    try {
      const records = lines.map((line) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) {
          const name = line;
          const short_code = autoCode(name);
          return { name, short_code };
        }
        const name = line.slice(0, colonIdx).trim();
        const code = line.slice(colonIdx + 1).trim().toUpperCase();
        return { name, short_code: code || autoCode(name) };
      }).filter(r => r.name);
      const res = await caseTypeLogic.bulkCreate(records);
      setBulkAddText('');
      if (res.ok) { toast.push(`${res.data.count} case type(s) added.`, 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { setLastError(err?.message || String(err)); toast.push(err?.message || 'Bulk add failed.', 'error'); }
  };

  const doEdit = async () => {
    if (!editId) { toast.push('Select a case type to edit.', 'error'); return; }
    if (!editName.trim() || !editCode.trim()) { toast.push('Name and code cannot be empty.', 'error'); return; }
    try {
      const res = await caseTypeLogic.update(editId, { name: editName, short_code: editCode });
      if (res.ok) { setEditId(''); toast.push('Case type updated.', 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { setLastError(err?.message || String(err)); toast.push(err?.message || 'Failed to update case type.', 'error'); }
  };

  const doBulkEdit = async () => {
    const lines = bulkEditText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.push('Paste at least one entry.', 'error'); return; }
    let updated = 0, skipped = 0;
    for (const line of lines) {
      const [idPart, namePart] = line.split('|').map(s => s.trim());
      const item = caseTypes.find(x => x.short_code === idPart || x.name === idPart || x.id === idPart);
      if (!item || !namePart) { skipped++; continue; }
      const [name, code] = namePart.split(':').map(s => s.trim());
      const res = await caseTypeLogic.update(item.id, { name: name || item.name, short_code: code || item.short_code });
      if (res.ok) updated++; else skipped++;
    }
    setBulkEditText('');
    toast.push(`${updated} updated.${skipped ? ` ${skipped} skipped.` : ''}`, updated ? 'success' : 'info');
    await refresh();
  };

  const doDelete = async () => {
    if (!delId) { toast.push('Select a case type to delete.', 'error'); return; }
    const item = caseTypes.find(x => x.id === delId);
    if (!window.confirm(`Delete case type "${item?.name}"?`)) return;
    try {
      const res = await caseTypeLogic.remove(delId);
      if (res.ok || !res.error) { setDelId(''); toast.push('Case type deleted.', 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { setLastError(err?.message || String(err)); }
  };

  const toggleBulkDel = (id) => {
    setBulkDelSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (bulkDelSelected.size === filtered.length) {
      setBulkDelSelected(new Set());
    } else {
      setBulkDelSelected(new Set(filtered.map(i => i.id)));
    }
  };

  const doBulkDelete = async () => {
    if (!bulkDelSelected.size) { toast.push('Select at least one case type.', 'error'); return; }
    if (!window.confirm(`Delete ${bulkDelSelected.size} case type(s)?`)) return;
    try {
      for (const id of bulkDelSelected) await caseTypeLogic.remove(id);
      const count = bulkDelSelected.size;
      setBulkDelSelected(new Set());
      toast.push(`${count} deleted.`, 'success');
      await refresh();
    } catch (err) { setLastError(err?.message || String(err)); }
  };

  const doImport = async () => {
    if (!importFile) { toast.push('Select a CSV file.', 'error'); return; }
    toast.push('CSV import coming soon.', 'info');
  };

  const handleToggle = useCallback(async (type) => {
    try {
      const newStatus = type.status === 'Active' ? 'Inactive' : 'Active';
      const res = await caseTypeLogic.setStatus(type.id, newStatus);
      if (res.ok) { toast.push(`Case type ${newStatus === 'Active' ? 'enabled' : 'disabled'}.`, 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { setLastError(err?.message || String(err)); }
  }, [refresh, toast]);

  const handleDragStart = useCallback((e, idx) => {
    setDragIdx(idx);
    setDraggingId(filtered[idx]?.id);
    dragOrder.current = filtered.map((t) => t.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', filtered[idx]?.id);
  }, [filtered]);

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx || !dragOrder.current || search) return;
    const items = [...dragOrder.current];
    const [moved] = items.splice(dragIdx, 1);
    items.splice(idx, 0, moved);
    dragOrder.current = items;
    setDragIdx(idx);
  }, [dragIdx, search]);

  const handleDragEnd = useCallback(async () => {
    if (dragIdx === null || !dragOrder.current) { setDragIdx(null); setDraggingId(null); return; }
    try {
      const ids = dragOrder.current;
      const res = await caseTypeLogic.reorder(ids);
      if (res.ok) { toast.push('Order updated.', 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { setLastError(err?.message || String(err)); }
    setDragIdx(null);
    setDraggingId(null);
    dragOrder.current = null;
  }, [dragIdx, refresh, toast]);

  useEffect(() => {
    if (!moreMenu) return;
    const handler = (e) => { if (!e.target.closest('.cmp-act-more-wrap')) setMoreMenu(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreMenu]);

  const startEdit = (item) => {
    setActiveAction('edit');
    setSubMode('single');
    setEditId(item.id);
    setEditName(item.name);
    setEditCode(item.short_code || '');
  };

  const confirmDeleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      const res = await caseTypeLogic.remove(item.id);
      if (res.ok || !res.error) { toast.push('Case type deleted.', 'success'); await refresh(); }
      else { toast.push(res.error, 'error'); }
    } catch (err) { toast.push(err?.message || 'Failed to delete case type.', 'error'); }
  };

  const startDelete = (item) => {
    setActiveAction('delete');
    setSubMode('single');
    setDelId(item.id);
  };

  if (loading) return <div className="fade-in loading-page"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      {/* Hero with watermark */}
      <div className="cmp-hero">
        <div className="cmp-hero-icon"><Icon name="grid" size={34} /></div>
        <div className="cmp-hero-text">
          <h2>Case Types</h2>
          <p>Manage case types used in case forms and filters.</p>
          <div className="cmp-hero-accent" />
        </div>
        <svg className="cmp-hero-watermark" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <rect x="44" y="12" width="12" height="48" rx="2" fill="currentColor"/>
          <ellipse cx="50" cy="62" rx="28" ry="6" fill="currentColor"/>
          <ellipse cx="50" cy="62" rx="28" ry="6" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
          <rect x="47" y="0" width="6" height="12" rx="2" fill="currentColor"/>
          <circle cx="50" cy="0" r="6" fill="currentColor"/>
          <circle cx="50" cy="0" r="3" fill="#fff"/>
          <circle cx="50" cy="0" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
          <rect x="8" y="28" width="84" height="4" rx="2" fill="currentColor"/>
          <circle cx="50" cy="30" r="4" fill="currentColor" opacity="0.7"/>
          <line x1="18" y1="30" x2="8" y2="58" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
          <line x1="18" y1="30" x2="28" y2="58" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
          <path d="M4 58 q8 18 24 0q-8 0-24 0z" fill="currentColor" opacity="0.8"/>
          <ellipse cx="22" cy="58" rx="16" ry="4" fill="currentColor" opacity="0.6"/>
          <line x1="82" y1="30" x2="72" y2="58" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
          <line x1="82" y1="30" x2="92" y2="58" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
          <path d="M72 58 q8 18 24 0q-8 0-24 0z" fill="currentColor" opacity="0.8"/>
          <ellipse cx="78" cy="58" rx="16" ry="4" fill="currentColor" opacity="0.6"/>
          <circle cx="16" cy="4" r="2.5" fill="currentColor" opacity="0.5"/>
          <circle cx="84" cy="10" r="2" fill="currentColor" opacity="0.4"/>
          <circle cx="90" cy="85" r="3" fill="currentColor" opacity="0.3"/>
          <circle cx="8" cy="78" r="2" fill="currentColor" opacity="0.35"/>
        </svg>
      </div>

      {/* 6 Stat Cards */}
      <div className="cmp-stats-row">
        {[
          { label: 'Total Case Types', value: caseTypes.length, icon: 'grid', bg: '#EEF2FF', color: '#6366F1', sub: 'All case types' },
          { label: 'Active', value: caseTypes.filter(t => (t.status||'Active').toLowerCase()==='active').length, icon: 'check', bg: '#ECFDF5', color: '#22C55E', sub: 'Active case types' },
          { label: 'Inactive', value: caseTypes.filter(t => (t.status||'Active').toLowerCase()!=='active').length, icon: 'close', bg: '#FFF7ED', color: '#F59E0B', sub: 'Inactive case types' },
          { label: 'Most Used', value: '—', icon: 'bar-chart', bg: '#F0F0FF', color: '#8B5CF6', sub: 'Most frequently used' },
          { label: 'Created This Month', value: caseTypes.filter(t => { const d = new Date(t.created_at); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length, icon: 'calendar', bg: '#FFF1F2', color: '#F43F5E', sub: 'This month' },
          { label: 'Total', value: caseTypes.length, icon: 'grid', bg: '#F0F9FF', color: '#0EA5E9', sub: 'All case types' },
        ].map((s, i) => (
          <div key={i} className="cmp-statcard">
            <div className="cmp-statcard-icon" style={{ background: s.bg, color: s.color }}><Icon name={s.icon} size={20} /></div>
            <div className="cmp-statcard-body">
              <div className="cmp-statcard-label">{s.label}</div>
              <div className="cmp-statcard-value">{s.value}</div>
              <div className="cmp-statcard-sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar with filter */}
      <div className="cmp-toolbar">
        <div className="cmp-toolbar-left">
          {ACTIONS.map(a => (
            <button
              key={a.key}
              className={a.variant === 'primary' ? 'btn btn--primary' : a.variant === 'danger-outline' ? 'cmp-btn-danger-outline' : 'btn btn--ghost'}
              onClick={() => { activate(a.key); setShowFilter(true); }}
            >
              <Icon name={a.icon} size={15} /> {a.label}
            </button>
          ))}
        </div>
        <div className="cmp-toolbar-right">
          <button className={`cmp-tb-filter${showFilter ? ' active' : ''}`} onClick={() => { setShowFilter(!showFilter); searchRef.current?.focus(); }}>
            <Icon name="filter" size={16} /><span>Filter</span>
          </button>
        </div>
      </div>

      {/* Form Card */}
      {activeAction && showFilter && (
        <Card className="cmp-form">
          <div className="cmp-form-header">
            <Icon name={ACTIONS.find(a => a.key === activeAction)?.icon || 'file'} size={18} />
            <span className="cmp-form-header-title">{ACTIONS.find(a => a.key === activeAction)?.label} Case Type</span>
            {SUB_MODES[activeAction] && (
              <div className="cmp-form-toggle">
                {SUB_MODES[activeAction].map(m => (
                  <button
                    key={m.key}
                    className={`cmp-form-toggle-btn${subMode === m.key ? ' active' : ''}`}
                    onClick={() => setSubMode(m.key)}
                  >
                    <Icon name={m.icon} size={13} /> {m.label}
                  </button>
                ))}
              </div>
            )}
            <button className="cmp-form-collapse" onClick={() => setFormCollapsed(!formCollapsed)} title={formCollapsed ? 'Expand' : 'Collapse'}>
              <Icon name="chevrons-up-down" size={16} />
            </button>
            <button className="cmp-form-close" onClick={reset} title="Close"><Icon name="close" size={18} /></button>
          </div>
          {!formCollapsed && (
            <div className="cmp-form-body">
              {activeAction === 'add' && subMode === 'single' && (
                <div className="cmp-form-grid">
                  <div className="cmp-field">
                    <label className="cmp-label">Name <span className="cmp-required">*</span></label>
                    <Input value={newName} placeholder="e.g., Civil" onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && doAdd()} />
                  </div>
                  <div className="cmp-field">
                    <label className="cmp-label">Code <span className="cmp-required">*</span></label>
                    <Input value={newCode} placeholder="e.g., CIV" onChange={e => setNewCode(e.target.value.toUpperCase().slice(0, 6))} onKeyDown={e => e.key === 'Enter' && doAdd()} />
                  </div>
                </div>
              )}
              {activeAction === 'add' && subMode === 'bulk' && (
                <div className="cmp-form-grid">
                  <div className="cmp-field cmp-field--full">
                    <label className="cmp-label">Paste entries — one per line</label>
                    <Textarea value={bulkAddText} onChange={e => setBulkAddText(e.target.value)}
                      placeholder={`Civil—auto: ${ENTITY_PREFIX}-CIVIL\nCivil:CIV—manual: CIV\nCriminal:CRIM\nFamily:FAM`}
                      rows={8} />
                    <span className="cmp-hint">Use <code>Name:CODE</code> for manual codes. Without <code>:CODE</code>, code auto-generates as <code>{ENTITY_PREFIX}-NAME-IN-HYPHENS</code>.</span>
                  </div>
                </div>
              )}
              {activeAction === 'edit' && subMode === 'single' && (
                <div className="cmp-form-grid">
                  <div className="cmp-field cmp-field--full">
                    <label className="cmp-label">Select Case Type <span className="cmp-required">*</span></label>
                    <Select value={editId} onChange={e => { setEditId(e.target.value); const item = caseTypes.find(x => x.id === e.target.value); if (item) { setEditName(item.name); setEditCode(item.short_code || ''); } }}>
                      <option value="">— choose —</option>
                      {caseTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </Select>
                  </div>
                  {editId && (
                    <>
                      <div className="cmp-field">
                        <label className="cmp-label">Name <span className="cmp-required">*</span></label>
                        <Input value={editName} onChange={e => setEditName(e.target.value)} />
                      </div>
                      <div className="cmp-field">
                        <label className="cmp-label">Code <span className="cmp-required">*</span></label>
                        <Input value={editCode} onChange={e => setEditCode(e.target.value.toUpperCase().slice(0, 6))} />
                      </div>
                    </>
                  )}
                </div>
              )}
              {activeAction === 'edit' && subMode === 'bulk' && (
                <div className="cmp-form-grid">
                  <div className="cmp-field cmp-field--full">
                    <label className="cmp-label">Format: <code>CurrentName|NewName:NEWCODE</code> — one per line</label>
                    <Textarea value={bulkEditText} onChange={e => setBulkEditText(e.target.value)}
                      placeholder={'Civil|Civil Case:CIVC\nCriminal|Criminal Case:CRMC'} rows={8} />
                    <span className="cmp-hint">Match by name, short code, or id before the pipe.</span>
                  </div>
                </div>
              )}
              {activeAction === 'delete' && subMode === 'single' && (
                <div className="cmp-form-grid">
                  <div className="cmp-field cmp-field--full">
                    <label className="cmp-label">Select Case Type <span className="cmp-required">*</span></label>
                    <Select value={delId} onChange={e => setDelId(e.target.value)}>
                      <option value="">— choose —</option>
                      {caseTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </Select>
                  </div>
                  {delId && (
                    <div className="cmp-warning">
                      <Icon name="alert" size={16} />
                      <span>This action cannot be undone. All associated data will be removed.</span>
                    </div>
                  )}
                </div>
              )}
              {activeAction === 'delete' && subMode === 'bulk' && (
                <div className="cmp-form-grid">
                  <div className="cmp-field cmp-field--full">
                    <label className="cmp-label">Select case types to delete</label>
                    <div className="cmp-checkbox-toolbar">
                      <label className="cmp-checkbox-all">
                        <input type="checkbox" checked={bulkDelSelected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                        <span>Select all {filtered.length}</span>
                      </label>
                      <span className="cmp-checkbox-count">{bulkDelSelected.size} selected</span>
                    </div>
                    <div className="cmp-checkbox-list">
                      {filtered.length === 0 ? (
                        <div className="cmp-checkbox-empty">No case types to display.</div>
                      ) : filtered.map(item => (
                        <label key={item.id} className={`cmp-checkbox-row${bulkDelSelected.has(item.id) ? ' checked' : ''}`}>
                          <input type="checkbox" checked={bulkDelSelected.has(item.id)} onChange={() => toggleBulkDel(item.id)} />
                          <span className="cmp-checkbox-name">{item.name}</span>
                          <span className="cmp-code-pill" style={{ marginLeft: 8 }}>{item.short_code}</span>
                        </label>
                      ))}
                    </div>
                    {bulkDelSelected.size > 0 && (
                      <div className="cmp-warning">
                        <Icon name="alert" size={16} />
                        <span>{bulkDelSelected.size} case type(s) will be permanently deleted.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeAction === 'import' && (
                <div className="cmp-import">
                  <div className="cmp-import-icon"><Icon name="upload" size={28} /></div>
                  <div className="cmp-import-title">Import from CSV</div>
                  <div className="cmp-import-hint">CSV columns: name, short_code, status (optional)</div>
                  <label className="cmp-import-btn">
                    <input type="file" accept=".csv" style={{ display: 'none' }} onChange={e => setImportFile(e.target.files[0])} />
                    <span className="btn btn--ghost">{importFile ? importFile.name : 'Choose CSV file'}</span>
                  </label>
                  {importFile && <div className="cmp-import-file">Selected: {importFile.name}</div>}
                </div>
              )}
            </div>
          )}
          {!formCollapsed && (
            <div className="cmp-form-footer">
              <button className="btn btn--ghost" onClick={reset}>Cancel</button>
              {activeAction === 'add' && subMode === 'single' && <button className="btn btn--primary" onClick={doAdd}><Icon name="plus" size={15} /> Add Case Type</button>}
              {activeAction === 'add' && subMode === 'bulk' && <button className="btn btn--primary" onClick={doBulkAdd}><Icon name="users" size={15} /> Add All</button>}
              {activeAction === 'edit' && subMode === 'single' && <button className="btn btn--primary" onClick={doEdit}><Icon name="check" size={15} /> Save Changes</button>}
              {activeAction === 'edit' && subMode === 'bulk' && <button className="btn btn--primary" onClick={doBulkEdit}><Icon name="check" size={15} /> Save All Changes</button>}
              {activeAction === 'delete' && subMode === 'single' && <button className="btn btn--danger" onClick={doDelete}><Icon name="trash" size={15} /> Delete</button>}
              {activeAction === 'delete' && subMode === 'bulk' && <button className="btn btn--danger" onClick={doBulkDelete}><Icon name="trash" size={15} /> Delete All Matched</button>}
              {activeAction === 'import' && <button className="btn btn--primary" onClick={doImport} disabled={!importFile}><Icon name="upload" size={15} /> Import</button>}
            </div>
          )}
        </Card>
      )}

      {/* View Detail Card */}
      {viewItem && (
        <Card className="cmp-detail">
          <div className="cmp-detail-header">
            <span className="cmp-detail-title">{viewItem.name}</span>
            <span className="cmp-code-pill">{viewItem.short_code}</span>
            <span className={`cmp-status-pill cmp-status-pill--${(viewItem.status || '').toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
              {viewItem.status || 'Active'}
            </span>
            <button className="cmp-detail-close" onClick={() => setViewItem(null)}><Icon name="close" size={16} /></button>
          </div>
          <div className="cmp-detail-body">
            <div className="cmp-detail-row">
              <span className="cmp-detail-label">Display Order</span>
              <span className="cmp-detail-value">{viewItem.display_order ?? '—'}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Standalone Search */}
      <div className="cmp-search">
        <Icon name="search" size={18} />
        <input ref={searchRef} value={search} placeholder="Search case types…" autoComplete="off" onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* Table Card */}
      <div className="cmp-table-card">
        <table className="cmp-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th style={{ width: 32 }}></th>
              <th>NAME</th>
              <th>CODE</th>
              <th>ORDER</th>
              <th>STATUS</th>
              <th style={{ width: 180 }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td className="cmp-empty" colSpan={7}>No case types found.</td></tr>
            ) : paged.map((item, idx) => {
              const actualIdx = (safePage - 1) * perPage + idx;
              return (
                <tr key={item.id} draggable={!search}
                  onDragStart={(e) => handleDragStart(e, actualIdx)}
                  onDragOver={(e) => handleDragOver(e, actualIdx)}
                  onDragEnd={handleDragEnd}
                  className={`cmp-row${dragIdx === actualIdx ? ' cmp-row--dragging' : ''}`}
                >
                  <td className="cmp-drag-cell">
                    <input type="checkbox" checked={bulkDelSelected.has(item.id)} onChange={() => toggleBulkDel(item.id)} />
                  </td>
                  <td className="cmp-drag-cell">
                    <span className="cmp-drag-handle" title="Drag to reorder"><Icon name="grip" size={15} /></span>
                  </td>
                  <td>
                    <div className="cmp-name-cell">
                      <span className="cmp-name-avatar"><Icon name="grid" size={15} /></span>
                      <span className="cmp-cell-name">{item.name}</span>
                    </div>
                  </td>
                  <td><span className="cmp-code-pill">{item.short_code}</span></td>
                  <td>{item.display_order ?? '—'}</td>
                  <td>
                    <span className={`cmp-status-pill cmp-status-pill--${(item.status || '').toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
                      <span className="cmp-status-dot"></span>
                      {item.status || 'Active'}
                    </span>
                  </td>
                  <td>
                    <div className="cmp-actions">
                      <button className="cmp-act-btn" title="View" onClick={() => setViewItem(item)}><Icon name="eye" size={15} /></button>
                      <button className="cmp-act-btn cmp-act-btn--edit" title="Edit" onClick={() => startEdit(item)}><Icon name="edit" size={15} /></button>
                      <button className="cmp-act-btn cmp-act-btn--del" title="Delete" onClick={() => confirmDeleteItem(item)}><Icon name="trash" size={15} /></button>
                      <button className="cmp-act-btn" title={`Toggle to ${item.status === 'Active' ? 'Inactive' : 'Active'}`} onClick={() => handleToggle(item)}>
                        {item.status === 'Active' ? <Icon name="check" size={15} /> : <Icon name="play" size={12} />}
                      </button>
                      <div className="cmp-act-more-wrap">
                        <button className="cmp-act-btn cmp-act-btn--more" title="More" onClick={() => setMoreMenu(moreMenu === item.id ? null : item.id)}><Icon name="more-horizontal" size={15} /></button>
                        {moreMenu === item.id && (
                          <div className="cmp-act-dropdown">
                            <button className="cmp-act-dropdown-item" onClick={() => { setMoreMenu(null); setNewName(item.name + ' (copy)'); setNewCode(item.short_code || ''); setActiveAction('add'); setSubMode('single'); setFormCollapsed(false); setShowFilter(true); }}>
                              <Icon name="copy" size={14} /> Duplicate
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="cmp-table-footer">
          <div>Showing {(safePage - 1) * perPage + 1} to {Math.min(safePage * perPage, filtered.length)} of {filtered.length} case types</div>
          <span className="cmp-ft-perpage" title="Change per page" onClick={() => setPerPage(perPage === 10 ? 20 : perPage === 20 ? 50 : 10)}>
            {perPage} / page <Icon name="chevronDown" size={13} />
          </span>
          {totalPages > 1 && (
            <div className="cmp-pagination">
              <button className="cmp-page-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}><Icon name="chevronLeft" size={14} /></button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <button key={p} className={`cmp-page-btn${safePage === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                );
              })}
              <button className="cmp-page-btn" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}><Icon name="chevron" size={14} /></button>
            </div>
          )}
        </div>
      </div>

      {!search && <div className="muted cmp-drag-hint">Drag rows to reorder. Order applies to every case form.</div>}

      <DebugPanel logs={logs} error={lastError} result={lastResult} onClear={clearLogs} onCopy={copyLogs} />
    </div>
  );
}
