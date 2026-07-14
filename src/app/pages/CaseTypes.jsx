import { useState, useCallback, useRef, useEffect } from 'react';
import { useCaseTypes } from '@/hooks/useCaseTypes.js';
import { caseTypeLogic } from '@/logic/caseTypeLogic.js';
import { orderComparator } from '@/utils/displayOrder.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import Card from '@/components/Card.jsx';
import { Input, Textarea, Select } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import ConfirmDialog from '@/components/setup/wizard/ConfirmDialog.jsx';
import Modal from '@/components/Modal.jsx';
import ColorPicker from '@/components/ColorPicker.jsx';

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
  const [search, setSearch] = useState('');
  const [activeAction, setActiveAction] = useState(null);
  const [subMode, setSubMode] = useState('single');
  const [page, setPage] = useState(1);
  const [showFilter, setShowFilter] = useState(false);
  const searchRef = useRef(null);
  const [perPage, setPerPage] = useState(10);

  // One-time normalize: assign a clean 1..N display_order (filling gaps left by
  // deletes) so the list stays stable — editing must never reorder records.
  const renumberedRef = useRef(false);
  useEffect(() => {
    if (renumberedRef.current) return;
    if (loading || !Array.isArray(caseTypes) || !caseTypes.length) return;
    renumberedRef.current = true;
    (async () => {
      await caseTypeLogic.normalizeOrder().catch(() => {});
      refresh();
    })();
  }, [caseTypes, loading, refresh]);

  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newStatus, setNewStatus] = useState('Active');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [bulkAddText, setBulkAddText] = useState('');

  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [editColor, setEditColor] = useState('#6b7280');
  const [bulkEditText, setBulkEditText] = useState('');

  const [delId, setDelId] = useState('');
  const [bulkDelSelected, setBulkDelSelected] = useState(new Set());

  const [importFile, setImportFile] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [dupTarget, setDupTarget] = useState(null);

  const [dragIdx, setDragIdx] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const dragOrder = useRef(null);

  const [lastError, setLastError] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [moreMenu, setMoreMenu] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  const filtered = caseTypes.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.short_code || '').toLowerCase().includes(search.toLowerCase())
  ).sort(orderComparator);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);
  const bulkMode = activeAction === 'delete' && subMode === 'bulk';

  useEffect(() => {
    if (!moreMenu) return;
    const handler = (e) => { if (!e.target.closest('.cmp-actions, .cmp-act-more-wrap')) setMoreMenu(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreMenu]);

  const reset = () => {
    setActiveAction(null);
    setSubMode('single');
    setNewName(''); setNewCode(''); setNewStatus('Active'); setNewDesc(''); setNewColor('#6b7280');
    setBulkAddText(''); setBulkEditText('');
    setEditId(''); setEditName(''); setEditCode(''); setEditStatus('Active');
    setDelId(''); setImportFile(null);
    setBulkDelSelected(new Set());
    setEditTarget(null); setDupTarget(null);
    setFormCollapsed(false);
    setPage(1);
    setMoreMenu(null);
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

  const exists = (name, code) =>
    caseTypes.some(i => i.name.toLowerCase() === name.trim().toLowerCase() || (code && i.short_code?.toLowerCase() === code.trim().toLowerCase()));

  const doAdd = async () => {
    if (!newName.trim() || !newCode.trim()) { toast.push('Name and code are required.', 'error'); return; }
    if (exists(newName, newCode)) { toast.push(`"${newName.trim()}" already exists.`, 'error'); return; }
    setBusy(true);
    try {
      const res = await caseTypeLogic.create({ name: newName, short_code: newCode, status: newStatus, description: newDesc, color: newColor });
      setBusy(false);
      if (res.ok) { setNewName(''); setNewCode(''); setNewStatus('Active'); setNewDesc(''); setNewColor('#6b7280'); setDupTarget(null); toast.push('Case type added.', 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { setBusy(false); setLastError(err?.message || String(err)); toast.push(err?.message || 'Failed to create case type.', 'error'); }
  };

  const doBulkAdd = async () => {
    const lines = bulkAddText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.push('Paste at least one entry.', 'error'); return; }
    setBusy(true);
    setProgress({ current: 0, total: lines.length, itemName: 'Preparing…', percent: 0 });
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
      }).filter(r => r.name && !exists(r.name, r.short_code));
      const res = await caseTypeLogic.bulkCreate(records);
      setProgress(null);
      setBusy(false);
      setBulkAddText('');
      if (res.ok) { toast.push(`${res.data.count} case type(s) added.`, 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { setProgress(null); setBusy(false); setLastError(err?.message || String(err)); toast.push(err?.message || 'Bulk add failed.', 'error'); }
  };

  const doEdit = async () => {
    if (!editId) { toast.push('Select a case type to edit.', 'error'); return; }
    if (!editName.trim() || !editCode.trim()) { toast.push('Name and code cannot be empty.', 'error'); return; }
    const other = caseTypes.filter(i => i.id !== editId);
    if (other.some(i => i.name.toLowerCase() === editName.trim().toLowerCase())) {
      toast.push(`A case type with name "${editName.trim()}" already exists.`, 'error'); return;
    }
    if (other.some(i => i.short_code?.toLowerCase() === editCode.trim().toLowerCase())) {
      toast.push(`A case type with short code "${editCode.trim()}" already exists.`, 'error'); return;
    }
    setBusy(true);
    try {
      const item = caseTypes.find(x => x.id === editId);
      const res = await caseTypeLogic.update(editId, { name: editName, short_code: editCode, status: editStatus, description: item?.description || '', color: editColor });
      setBusy(false);
      if (res.ok) { setEditId(''); setEditTarget(null); toast.push('Case type updated.', 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { setBusy(false); setLastError(err?.message || String(err)); toast.push(err?.message || 'Failed to update case type.', 'error'); }
  };

  const doBulkEdit = async () => {
    const lines = bulkEditText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.push('Paste at least one entry.', 'error'); return; }
    setBusy(true);
    let updated = 0, skipped = 0;
    for (const line of lines) {
      const [idPart, namePart] = line.split('|').map(s => s.trim());
      const item = caseTypes.find(x => x.short_code === idPart || x.name === idPart || x.id === idPart);
      if (!item || !namePart) { skipped++; continue; }
      const [name, code] = namePart.split(':').map(s => s.trim());
      const res = await caseTypeLogic.update(item.id, { name: name || item.name, short_code: code || item.short_code });
      if (res.ok) updated++; else skipped++;
    }
    setBusy(false);
    setBulkEditText('');
    toast.push(`${updated} updated.${skipped ? ` ${skipped} skipped.` : ''}`, updated ? 'success' : 'info');
    await refresh();
  };

  const doDelete = async () => {
    if (!delId) { toast.push('Select a case type to delete.', 'error'); return; }
    const item = caseTypes.find(x => x.id === delId);
    setConfirmState({
      title: 'Delete Case Type',
      message: `Delete case type "${item?.name}"?`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmState(null);
        setBusy(true);
        const res = await caseTypeLogic.remove(delId);
        setBusy(false);
        if (res.ok || !res.error) { setDelId(''); toast.push('Case type deleted.', 'success'); await refresh(); }
        else toast.push(res.error, 'error');
      },
      onCancel: () => setConfirmState(null),
    });
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
    const count = bulkDelSelected.size;
    setConfirmState({
      title: 'Delete Case Types',
      message: `Delete ${count} case type(s)?`,
      variant: 'danger',
      confirmLabel: 'Delete All',
      onConfirm: async () => {
        setConfirmState(null);
        setBusy(true);
        setProgress({ current: 0, total: count, itemName: 'Starting…', percent: 0 });
        const ids = [...bulkDelSelected];
        for (let idx = 0; idx < ids.length; idx++) {
          const item = caseTypes.find(x => x.id === ids[idx]);
          setProgress({ current: idx + 1, total: ids.length, itemName: item?.name || '…', percent: Math.round(((idx + 1) / ids.length) * 100) });
          await caseTypeLogic.remove(ids[idx]);
        }
        setBusy(false);
        setProgress(null);
        setBulkDelSelected(new Set());
        toast.push(`${count} deleted.`, 'success');
        await refresh();
      },
      onCancel: () => setConfirmState(null),
    });
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

  const startEdit = (item) => {
    setEditId(item.id);
    setEditName(item.name);
    setEditCode(item.short_code || '');
    setEditStatus(item.status || 'Active');
    setEditColor(item.color || '#6b7280');
    setEditTarget(item);
  };

  const startDuplicate = (item) => {
    setNewName(item.name + ' (copy)');
    setNewCode(item.short_code || '');
    setNewStatus(item.status || 'Active');
    setNewColor(item.color || '#6b7280');
    setDupTarget(item);
  };

  const confirmDeleteItem = (item) => {
    setConfirmState({
      title: 'Delete Case Type',
      message: `Delete case type "${item?.name}"? This action cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmState(null);
        setBusy(true);
        const res = await caseTypeLogic.remove(item.id);
        setBusy(false);
        if (res.ok || !res.error) { toast.push('Case type deleted.', 'success'); await refresh(); }
        else toast.push(res.error, 'error');
      },
      onCancel: () => setConfirmState(null),
    });
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
            <div className="cmp-statcard-icon" style={{ '--sc-bg': s.bg, '--sc-color': s.color }}><Icon name={s.icon} size={20} /></div>
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

      <button className="cmp-mobile-import cmp-mobile-only" onClick={() => activate('import')}>
        <Icon name="upload" size={14} /> Import CSV
      </button>

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
                  <div className="cmp-field">
                    <label className="cmp-label">Status</label>
                    <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </Select>
                  </div>
                  <div className="cmp-field cmp-field--full">
                    <label className="cmp-label">Description</label>
                    <Input value={newDesc} placeholder="Optional description" onChange={e => setNewDesc(e.target.value)} />
                  </div>
                  <div className="cmp-field cmp-field--full">
                    <label className="cmp-label">Badge Color</label>
                    <ColorPicker value={newColor} onChange={setNewColor} />
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
                    <Select value={editId} onChange={e => { setEditId(e.target.value); const item = caseTypes.find(x => x.id === e.target.value); if (item) { setEditName(item.name); setEditCode(item.short_code || ''); setEditStatus(item.status || 'Active'); setEditColor(item.color || '#6b7280'); } }}>
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
                      <div className="cmp-field">
                        <label className="cmp-label">Status</label>
                        <Select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </Select>
                      </div>
                      <div className="cmp-field cmp-field--full">
                        <label className="cmp-label">Badge Color</label>
                        <ColorPicker value={editColor} onChange={setEditColor} />
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
                    <div className="cmp-drag-hint">Tick the rows in the table below to select records for deletion.</div>
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
                    <input type="file" accept=".csv" className="cmp-file-input" onChange={e => setImportFile(e.target.files[0])} />
                    <span className="btn btn--ghost">{importFile ? importFile.name : 'Choose CSV file'}</span>
                  </label>
                  {importFile && <div className="cmp-import-file">Selected: {importFile.name}</div>}
                </div>
              )}
            </div>
          )}
          {!formCollapsed && (
            <div className="cmp-form-footer">
              <button className="btn btn--ghost" onClick={reset} disabled={busy}>Cancel</button>
              {activeAction === 'add' && subMode === 'single' && <button className="btn btn--primary" onClick={doAdd} disabled={busy}><Icon name="plus" size={15} /> {busy ? 'Adding…' : 'Add Case Type'}</button>}
              {activeAction === 'add' && subMode === 'bulk' && <button className="btn btn--primary" onClick={doBulkAdd} disabled={busy}><Icon name="users" size={15} /> {busy ? 'Adding…' : 'Add All'}</button>}
              {activeAction === 'edit' && subMode === 'single' && <button className="btn btn--primary" onClick={doEdit} disabled={busy}><Icon name="check" size={15} /> {busy ? 'Saving…' : 'Save Changes'}</button>}
              {activeAction === 'edit' && subMode === 'bulk' && <button className="btn btn--primary" onClick={doBulkEdit} disabled={busy}><Icon name="check" size={15} /> {busy ? 'Saving…' : 'Save All Changes'}</button>}
              {activeAction === 'delete' && subMode === 'single' && <button className="btn btn--danger" onClick={doDelete} disabled={busy}><Icon name="trash" size={15} /> {busy ? 'Deleting…' : 'Delete'}</button>}
              {activeAction === 'delete' && subMode === 'bulk' && <button className="btn btn--danger" onClick={doBulkDelete} disabled={busy}><Icon name="trash" size={15} /> {busy ? 'Deleting…' : 'Delete All Matched'}</button>}
              {activeAction === 'import' && <button className="btn btn--primary" onClick={doImport} disabled={!importFile || busy}><Icon name="upload" size={15} /> {busy ? 'Importing…' : 'Import'}</button>}
            </div>
          )}
        </Card>
      )}

      <Modal open={!!viewItem} title={viewItem?.name} onClose={() => setViewItem(null)}>
        <div className="cmp-detail-body">
          <div className="cmp-detail-row">
            <span className="cmp-detail-label">Code</span>
            <span className="cmp-code-pill">{viewItem?.short_code || '—'}</span>
          </div>
          <div className="cmp-detail-row">
            <span className="cmp-detail-label">Status</span>
            <span className={`cmp-status-pill cmp-status-pill--${(viewItem?.status || 'Active').toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
              <span className="cmp-status-dot"></span>{viewItem?.status || 'Active'}
            </span>
          </div>
          <div className="cmp-detail-row">
            <span className="cmp-detail-label">Badge Color</span>
            <span className="cmp-detail-value"><div className="cmp-color-swatch-lg" style={{ '--swatch-color': viewItem?.color || '#6b7280' }} /></span>
          </div>
          <div className="cmp-detail-row">
            <span className="cmp-detail-label">Display Order</span>
            <span className="cmp-detail-value">{viewItem?.display_order ?? '—'}</span>
          </div>
          <div className="cmp-detail-row">
            <span className="cmp-detail-label">Description</span>
            <span className="cmp-detail-value">{viewItem?.description || '—'}</span>
          </div>
        </div>
      </Modal>

      <Modal open={!!editTarget} title="Edit Case Type" onClose={() => setEditTarget(null)}
        footer={<div className="cmp-modal-footer">
          <Button variant="ghost" onClick={() => setEditTarget(null)} disabled={busy}>Cancel</Button>
          <Button icon="check" onClick={doEdit} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</Button>
        </div>}>
        <div className="cmp-form-grid">
          <div className="cmp-field">
            <label className="cmp-label">Name <span className="cmp-required">*</span></label>
            <Input value={editName} onChange={e => setEditName(e.target.value)} />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Short Code <span className="cmp-required">*</span></label>
            <Input value={editCode} onChange={e => setEditCode(e.target.value.toUpperCase().slice(0, 6))} />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Status</label>
            <Select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
          <div className="cmp-field cmp-field--full">
            <label className="cmp-label">Badge Color</label>
            <ColorPicker value={editColor} onChange={setEditColor} />
          </div>
        </div>
      </Modal>

      <Modal open={!!dupTarget} title="Duplicate Case Type" onClose={() => setDupTarget(null)}
        footer={<div className="cmp-modal-footer">
          <Button variant="ghost" onClick={() => setDupTarget(null)} disabled={busy}>Cancel</Button>
          <Button icon="plus" onClick={doAdd} disabled={busy}>{busy ? 'Adding…' : 'Add Case Type'}</Button>
        </div>}>
        <div className="cmp-form-grid">
          <div className="cmp-field">
            <label className="cmp-label">Name <span className="cmp-required">*</span></label>
            <Input value={newName} placeholder="e.g., Civil" onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && doAdd()} />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Code <span className="cmp-required">*</span></label>
            <Input value={newCode} placeholder="e.g., CIV" onChange={e => setNewCode(e.target.value.toUpperCase().slice(0, 6))} onKeyDown={e => e.key === 'Enter' && doAdd()} />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Status</label>
            <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
          <div className="cmp-field cmp-field--full">
            <label className="cmp-label">Description</label>
            <Input value={newDesc} placeholder="Optional description" onChange={e => setNewDesc(e.target.value)} />
          </div>
          <div className="cmp-field cmp-field--full">
            <label className="cmp-label">Badge Color</label>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
        </div>
      </Modal>

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
              {bulkMode && <th className="cmp-th--w40"><input type="checkbox" checked={bulkDelSelected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>}
              <th className="cmp-th--w32"></th>
              <th className="cmp-th--w40">#</th>
              <th><span className="cmp-sort">NAME <Icon name="chevrons-up-down" size={12} /></span></th>
              <th><span className="cmp-sort">CODE <Icon name="chevrons-up-down" size={12} /></span></th>
              <th><span className="cmp-sort">STATUS <Icon name="chevrons-up-down" size={12} /></span></th>
              <th className="cmp-th--w200">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td className="cmp-empty" colSpan={bulkMode ? 7 : 6}>No case types found.</td></tr>
            ) : paged.map((item, idx) => {
              const actualIdx = (safePage - 1) * perPage + idx;
              return (
                <tr key={item.id} draggable={!search}
                  onDragStart={(e) => handleDragStart(e, actualIdx)}
                  onDragOver={(e) => handleDragOver(e, actualIdx)}
                  onDragEnd={handleDragEnd}
                  className={`cmp-row${dragIdx === actualIdx ? ' cmp-row--dragging' : ''}`}
                >
                  {bulkMode && <td className="cmp-check-cell"><input type="checkbox" checked={bulkDelSelected.has(item.id)} onChange={() => toggleBulkDel(item.id)} /></td>}
                  <td className="cmp-drag-cell">
                    <span className="cmp-drag-handle" title="Drag to reorder"><Icon name="grip" size={15} /></span>
                  </td>
                  <td><span className="cmp-order-num">{item.display_order}</span></td>
                  <td>
                    <div className="cmp-name-cell">
                      <span className="cmp-color-swatch-lg" style={{ '--swatch-color': item.color || '#6b7280' }} />
                      <span className="cmp-name-avatar"><Icon name="grid" size={15} /></span>
                      <span className="cmp-cell-name">{item.name}</span>
                    </div>
                  </td>
                  <td><span className="cmp-code-pill">{item.short_code}</span></td>
                  <td>
                    <span className={`cmp-status-pill cmp-status-pill--${(item.status || '').toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
                      <span className="cmp-status-dot"></span>
                      {item.status || 'Active'}
                    </span>
                  </td>
                  <td>
                    <div className="cmp-actions">
                      <button className="cmp-act-btn cmp-act-btn--view" title="View" onClick={() => setViewItem(item)}><Icon name="eye" size={15} /></button>
                      <button className="cmp-act-btn cmp-act-btn--edit" title="Edit" onClick={() => startEdit(item)}><Icon name="edit" size={15} /></button>
                      <button className="cmp-act-btn cmp-act-btn--copy" title="Duplicate" onClick={() => startDuplicate(item)}><Icon name="copy" size={15} /></button>
                      <button className={`cmp-act-btn${item.status === 'Active' ? ' cmp-act-btn--toggle-on' : ' cmp-act-btn--toggle-off'}`}
                        title={item.status === 'Active' ? 'Set Inactive' : 'Set Active'}
                        onClick={() => handleToggle(item)}>
                        {item.status === 'Active' ? <Icon name="toggle-right" size={15} /> : <Icon name="toggle-left" size={15} />}
                      </button>
                      <button className="cmp-act-btn cmp-act-btn--del" title="Delete" onClick={() => confirmDeleteItem(item)}><Icon name="trash" size={15} /></button>
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

      {/* ── Mobile View ── */}
      <div className="cmp-mobile-only">
        <div className="cmp-mobile-stats">
          <div className="cmp-mobile-stat-card">
            <div className="cmp-mobile-stat-row1">
              <div className="cmp-mobile-stat-icon cmp-mobile-stat-icon--total"><Icon name="folder" size={16} /></div>
              <span className="cmp-mobile-stat-num">{caseTypes.length}</span>
            </div>
            <div className="cmp-mobile-stat-label">Total</div>
          </div>
          <div className="cmp-mobile-stat-card">
            <div className="cmp-mobile-stat-row1">
              <div className="cmp-mobile-stat-icon cmp-mobile-stat-icon--active"><Icon name="check" size={16} /></div>
              <span className="cmp-mobile-stat-num">{caseTypes.filter(i => i.status === 'Active').length}</span>
            </div>
            <div className="cmp-mobile-stat-label">Active</div>
          </div>
          <div className="cmp-mobile-stat-card">
            <div className="cmp-mobile-stat-row1">
              <div className="cmp-mobile-stat-icon cmp-mobile-stat-icon--inactive"><Icon name="close" size={16} /></div>
              <span className="cmp-mobile-stat-num">{caseTypes.filter(i => i.status !== 'Active').length}</span>
            </div>
            <div className="cmp-mobile-stat-label">Inactive</div>
          </div>
        </div>

        <div className="cmp-mobile-section-header">
          <span className="cmp-mobile-section-title">All Case Types</span>
          <span className="cmp-mobile-section-count">{Math.min(perPage, filtered.length)} of {filtered.length}</span>
          <span className="cmp-mobile-per-page" onClick={() => setPerPage(perPage === 10 ? 20 : perPage === 20 ? 50 : 10)}>
            {perPage} / page <Icon name="chevronDown" size={13} />
          </span>
        </div>

        <div className="cmp-mobile-list">
          {paged.length === 0 ? (
            <div className="cmp-empty">No case types found.</div>
          ) : paged.map(item => (
            <div key={item.id} className="cmp-mobile-card">
              <div className="cmp-mobile-card-row1">
                <span className="cmp-mobile-drag-handle"><Icon name="grip" size={15} /></span>
                <span className="cmp-mobile-avatar"><Icon name="folder" size={18} /></span>
                <div className="cmp-mobile-card-info">
                  <div className="cmp-mobile-card-top">
                    <span className="cmp-mobile-card-name">{item.name}</span>
                    <span className={`cmp-status-pill cmp-status-pill--${(item.status || '').toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
                      <span className="cmp-status-dot"></span>{item.status || 'Active'}
                    </span>
                  </div>
                  <span className="cmp-mobile-card-code">{item.short_code}</span>
                </div>
              </div>
              <div className="cmp-mobile-divider"></div>
              <div className="cmp-mobile-card-row2">
                <button className="cmp-mobile-action" title="View" onClick={() => setViewItem(item)}>
                  <span className="cmp-mobile-action-icon"><Icon name="eye" size={15} /></span>
                  <span className="cmp-mobile-action-label">View</span>
                </button>
                <button className="cmp-mobile-action" title="Edit" onClick={() => startEdit(item)}>
                  <span className="cmp-mobile-action-icon"><Icon name="edit" size={15} /></span>
                  <span className="cmp-mobile-action-label">Edit</span>
                </button>
                <button className="cmp-mobile-action cmp-mobile-action--copy" title="Duplicate" onClick={() => startDuplicate(item)}>
                  <span className="cmp-mobile-action-icon"><Icon name="copy" size={15} /></span>
                  <span className="cmp-mobile-action-label">Duplicate</span>
                </button>
                <button className={`cmp-mobile-action${item.status === 'Active' ? ' cmp-mobile-action--toggle-on' : ' cmp-mobile-action--toggle-off'}`} title={item.status === 'Active' ? 'Set Inactive' : 'Set Active'} onClick={() => handleToggle(item)}>
                  <span className="cmp-mobile-action-icon">
                    {item.status === 'Active' ? <Icon name="toggle-right" size={15} /> : <Icon name="toggle-left" size={15} />}
                  </span>
                  <span className="cmp-mobile-action-label">{item.status === 'Active' ? 'Active' : 'Inactive'}</span>
                </button>
                <button className="cmp-mobile-action cmp-mobile-action--del" title="Delete" onClick={() => confirmDeleteItem(item)}>
                  <span className="cmp-mobile-action-icon"><Icon name="trash" size={15} /></span>
                  <span className="cmp-mobile-action-label">Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="cmp-mobile-pagination">
          <div className="cmp-mobile-pag-info">Showing {(safePage - 1) * perPage + 1} to {Math.min(safePage * perPage, filtered.length)} of {filtered.length}</div>
          {totalPages > 1 && (
            <div className="cmp-pagination">
              <button className="cmp-page-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}><Icon name="chevronLeft" size={14} /></button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                const p = start + i;
                if (p > totalPages) return null;
                return <button key={p} className={`cmp-page-btn${safePage === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
              })}
              <button className="cmp-page-btn" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}><Icon name="chevron" size={14} /></button>
            </div>
          )}
        </div>

        <nav className="cmp-bottom-nav">
          <button className="cmp-nav-tab cmp-nav-tab--active"><Icon name="home" size={20} /><span>Dashboard</span></button>
          <button className="cmp-nav-tab"><Icon name="briefcase" size={20} /><span>Matters</span></button>
          <button className="cmp-nav-fab"><Icon name="plus" size={24} /></button>
          <button className="cmp-nav-tab"><Icon name="file" size={20} /><span>Order Sheet</span></button>
          <button className="cmp-nav-tab"><Icon name="calendar" size={20} /><span>Calendar</span></button>
        </nav>
      </div>

      {busy && (
        <div className="cmp-busy-overlay">
          <div className="cmp-busy-box">
            {progress ? (
              <>
                <div className="cmp-progress-bar-track">
                  <div className="cmp-progress-fill" style={{ '--fill': `${Math.max(5, progress?.percent ?? 0)}%` }} />
                </div>
                <div className="cmp-progress-text">{progress.current}/{progress.total} ({progress.percent}%)</div>
              </>
            ) : (
              <><div className="spinner" /><span>Please wait…</span></>
            )}
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
      {!search && <div className="muted cmp-drag-hint">Drag rows to reorder. Order applies to every case form.</div>}

    </div>
  );
}
