import { useState, useCallback, useEffect, useRef } from 'react';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { Input, Textarea, Select } from '@/components/Field.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { caseStageLogic } from '@/logic/caseStageLogic.js';
import ConfirmDialog from '@/components/setup/wizard/ConfirmDialog.jsx';
import Modal from '@/components/Modal.jsx';
import ColorPicker from '@/components/ColorPicker.jsx';

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

const ENTITY_PREFIX = 'ST';


export default function CaseStages() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeAction, setActiveAction] = useState(null);
  const [subMode, setSubMode] = useState('single');
  const [page, setPage] = useState(1);
  const [showFilter, setShowFilter] = useState(false);
  const searchRef = useRef(null);
  const [perPage, setPerPage] = useState(10);

  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [newStatus, setNewStatus] = useState('Active');
  const [newDesc, setNewDesc] = useState('');
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editColor, setEditColor] = useState('#6b7280');
  const [editStatus, setEditStatus] = useState('Active');
  const [editDesc, setEditDesc] = useState('');
  const [delId, setDelId] = useState('');

  const [bulkAddText, setBulkAddText] = useState('');
  const [bulkEditText, setBulkEditText] = useState('');
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

  const load = async () => {
    setLoading(true);
    const res = await caseStageLogic.list();
    if (Array.isArray(res)) {
      let data = res;
      const allZero = data.every((i) => !i.display_order);
      if (allZero) {
        data = data.map((i, idx) => ({ ...i, display_order: idx + 1 }));
        for (const item of data) {
          await caseStageLogic.update(item.id, { display_order: item.display_order }).catch(() => {});
        }
      }
      setItems(data);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setActiveAction(null);
    setSubMode('single');
    setNewName(''); setNewCode(''); setNewColor('#6b7280'); setNewStatus('Active'); setNewDesc('');
    setEditId(''); setEditName(''); setEditCode(''); setEditColor('#6b7280'); setEditStatus('Active'); setEditDesc('');
    setDelId(''); setImportFile(null);
    setBulkAddText(''); setBulkEditText(''); setBulkDelSelected(new Set());
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

  const exists = (name) =>
    items.some(i => i.name.toLowerCase() === name.trim().toLowerCase());

  const autoCode = (name) => {
    const slug = name.trim().replace(/\s+/g, '-').toUpperCase();
    return `${ENTITY_PREFIX}-${slug}`;
  };

  const doAdd = async () => {
    if (!newName.trim() || !newCode.trim()) { toast.push('Name and code are required.', 'error'); return; }
    if (exists(newName)) { toast.push(`"${newName.trim()}" already exists.`, 'error'); return; }
    setBusy(true);
    const res = await caseStageLogic.add({ name: newName.trim(), short_code: newCode, color: newColor, status: newStatus, description: newDesc });
    setBusy(false);
    if (res.ok) { setNewName(''); setNewCode(''); setNewColor('#6b7280'); setNewStatus('Active'); setNewDesc(''); setDupTarget(null); toast.push('Case stage added.', 'success'); load(); }
    else toast.push(res.error, 'error');
  };

  const doBulkAdd = async () => {
    const lines = bulkAddText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.push('Paste at least one entry.', 'error'); return; }
    setBusy(true);
    setProgress({ current: 0, total: lines.length, itemName: 'Preparing…', percent: 0 });
    let added = 0, skipped = 0;
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const colonIdx = line.indexOf(':');
      const name = colonIdx === -1 ? line : line.slice(0, colonIdx).trim();
      const code = colonIdx === -1 ? autoCode(name) : line.slice(colonIdx + 1).trim().toUpperCase();
      setProgress({ current: idx + 1, total: lines.length, itemName: name, percent: Math.round(((idx + 1) / lines.length) * 100) });
      if (exists(name)) { skipped++; continue; }
      const res = await caseStageLogic.add({ name, short_code: code, status: 'Active' });
      if (res.ok) added++; else skipped++;
    }
    setBusy(false);
    setProgress(null);
    setBulkAddText('');
    toast.push(`${added} added.${skipped ? ` ${skipped} skipped.` : ''}`, added ? 'success' : 'info');
    load();
  };

  const doEdit = async () => {
    if (!editId) { toast.push('Select a case stage to edit.', 'error'); return; }
    if (!editName.trim()) { toast.push('Stage name cannot be empty.', 'error'); return; }
    setBusy(true);
    const res = await caseStageLogic.update(editId, { name: editName.trim(), short_code: editCode, color: editColor, status: editStatus });
    setBusy(false);
    if (res.ok) { setEditId(''); setEditTarget(null); toast.push('Case stage updated.', 'success'); load(); }
    else toast.push(res.error, 'error');
  };

  const doBulkEdit = async () => {
    const lines = bulkEditText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.push('Paste at least one entry.', 'error'); return; }
    setBusy(true);
    let updated = 0, skipped = 0;
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const [idPart, namePart] = line.split('|').map(s => s.trim());
      setProgress({ current: idx + 1, total: lines.length, itemName: idPart, percent: Math.round(((idx + 1) / lines.length) * 100) });
      const item = items.find(x => x.name === idPart || x.id === idPart);
      if (!item || !namePart) { skipped++; continue; }
      const res = await caseStageLogic.rename(item.id, namePart);
      if (res.ok) updated++; else skipped++;
    }
    setBusy(false);
    setProgress(null);
    setBulkEditText('');
    toast.push(`${updated} updated.${skipped ? ` ${skipped} skipped.` : ''}`, updated ? 'success' : 'info');
    load();
  };

  const doDelete = async () => {
    if (!delId) { toast.push('Select a case stage to delete.', 'error'); return; }
    const item = items.find(x => x.id === delId);
    setConfirmState({
      title: 'Delete Case Stage',
      message: `Delete case stage "${item?.name}"?`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmState(null);
        setBusy(true);
        const res = await caseStageLogic.remove(delId);
        setBusy(false);
        if (res.ok || !res.error) { setDelId(''); toast.push('Case stage deleted.', 'success'); load(); }
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
    if (!bulkDelSelected.size) { toast.push('Select at least one case stage.', 'error'); return; }
    const count = bulkDelSelected.size;
    setConfirmState({
      title: 'Delete Case Stages',
      message: `Delete ${count} case stage(s)?`,
      variant: 'danger',
      confirmLabel: 'Delete All',
      onConfirm: async () => {
        setConfirmState(null);
        setBusy(true);
        setProgress({ current: 0, total: count, itemName: 'Starting…', percent: 0 });
        const ids = [...bulkDelSelected];
        for (let idx = 0; idx < ids.length; idx++) {
          const item = items.find(x => x.id === ids[idx]);
          setProgress({ current: idx + 1, total: ids.length, itemName: item?.name || '…', percent: Math.round(((idx + 1) / ids.length) * 100) });
          await caseStageLogic.remove(ids[idx]);
        }
        setBusy(false);
        setProgress(null);
        setBulkDelSelected(new Set());
        toast.push(`${count} deleted.`, 'success');
        load();
      },
      onCancel: () => setConfirmState(null),
    });
  };

  const doImport = async () => {
    if (!importFile) { toast.push('Select a CSV file.', 'error'); return; }
    toast.push('CSV import coming soon.', 'info');
  };

  const filtered = items.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  useEffect(() => {
    if (!moreMenu) return;
    const handler = (e) => { if (!e.target.closest('.cmp-actions, .cmp-act-more-wrap')) setMoreMenu(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreMenu]);

  const handleToggle = useCallback(async (stage) => {
    try {
      const newStatus = stage.status === 'Active' ? 'Inactive' : 'Active';
      const res = await caseStageLogic.setStatus(stage.id, newStatus);
      if (res.ok) { toast.push(`Case stage ${newStatus === 'Active' ? 'enabled' : 'disabled'}.`, 'success'); load(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { setLastError(err?.message || String(err)); }
  }, [toast]);

  const handleDragStart = (e, idx) => {
    setDragIdx(idx);
    dragOrder.current = filtered.map(t => t.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', filtered[idx]?.id);
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx || !dragOrder.current || search) return;
    const ids = [...dragOrder.current];
    const [moved] = ids.splice(dragIdx, 1);
    ids.splice(idx, 0, moved);
    dragOrder.current = ids;
    setDragIdx(idx);
  };

  const handleDragEnd = useCallback(async () => {
    if (dragIdx === null || !dragOrder.current) { setDragIdx(null); setDraggingId(null); return; }
    try {
      const ids = dragOrder.current;
      await caseStageLogic.reorder(ids);
      toast.push('Order updated.', 'success');
    } catch (err) { setLastError(err?.message || String(err)); toast.push(err?.message || 'Failed to reorder.', 'error'); }
    setDragIdx(null);
    setDraggingId(null);
    dragOrder.current = null;
    load();
  }, [dragIdx, toast]);

  const startEdit = (item) => {
    setEditId(item.id);
    setEditName(item.name);
    setEditCode(item.short_code || '');
    setEditColor(item.color || '#6b7280');
    setEditStatus(item.status || 'Active');
    setEditDesc(item.description || '');
    setEditTarget(item);
  };

  const startDelete = (item) => {
    setActiveAction('delete');
    setSubMode('single');
    setDelId(item.id);
  };

  const startDuplicate = (item) => {
    setNewName(item.name + ' (copy)');
    setNewColor('#6b7280');
    setNewStatus(item.status || 'Active');
    setDupTarget(item);
  };

  const confirmDeleteItem = (item) => {
    setConfirmState({
      title: 'Delete Case Stage',
      message: `Delete case stage "${item?.name}"? This action cannot be undone. All associated data will be removed.`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmState(null);
        setBusy(true);
        const res = await caseStageLogic.remove(item.id);
        setBusy(false);
        if (res.ok || !res.error) { toast.push('Case stage deleted.', 'success'); load(); }
        else toast.push(res.error, 'error');
      },
      onCancel: () => setConfirmState(null),
    });
  };

  const stats = [
    { label: 'Total Case Stages', value: items.length, icon: 'layers', bg: '#EEF2FF', color: '#6366F1', sub: 'All case stages' },
    { label: 'Active', value: items.filter(i => (i.status||'Active').toLowerCase()==='active').length, icon: 'check', bg: '#ECFDF5', color: '#22C55E', sub: 'Active case stages' },
    { label: 'Inactive', value: items.filter(i => (i.status||'Active').toLowerCase()!=='active').length, icon: 'close', bg: '#FFF7ED', color: '#F59E0B', sub: 'Inactive case stages' },
    { label: 'Most Used', value: '—', icon: 'bar-chart', bg: '#F0F0FF', color: '#8B5CF6', sub: 'Most frequently used' },
    { label: 'Created This Month', value: items.filter(t => { const d = new Date(t.created_at); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length, icon: 'calendar', bg: '#FFF1F2', color: '#F43F5E', sub: 'This month' },
    { label: 'Total', value: items.length, icon: 'briefcase', bg: '#F0F9FF', color: '#0EA5E9', sub: 'All case stages' },
  ];

  if (loading) return <div className="fade-in cmp-loading"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="cmp-hero">
        <div className="cmp-hero-icon"><Icon name="layers" size={34} /></div>
        <div className="cmp-hero-text">
          <h2>Case Stages</h2>
          <p>Manage case stages (filing, hearing, judgment, etc.).</p>
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

      <div className="cmp-stats-row">
        {stats.map((s, i) => (
          <div key={i} className="cmp-statcard">
            <div className="cmp-statcard-icon" style={{ '--sc-bg': s.bg, '--sc-color': s.color }}><Icon name={s.icon} size={20} /></div>
            <div className="cmp-statcard-body">
              <div className="cmp-statcard-label">{s.label}</div>
              <div className="cmp-statcard-value">{s.value}</div>
              {s.sub && <div className="cmp-statcard-sub">{s.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="cmp-toolbar">
        <div className="cmp-toolbar-left">
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
        <div className="cmp-toolbar-right">
          <button className={`cmp-tb-filter${showFilter ? ' active' : ''}`} onClick={() => { setShowFilter(!showFilter); searchRef.current?.focus(); }}>
            <Icon name="filter" size={16} /><span>Filter</span>
          </button>
        </div>
      </div>

      <button className="cmp-mobile-import cmp-mobile-only" onClick={() => activate('import')}>
        <Icon name="upload" size={14} /> Import CSV
      </button>

      {activeAction && (
        <Card className="cmp-form">
          <div className="cmp-form-header">
            <Icon name={ACTIONS.find(a => a.key === activeAction)?.icon || 'file'} size={18} />
            <span className="cmp-form-header-title">{ACTIONS.find(a => a.key === activeAction)?.label} Case Stage</span>
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
                  <Input value={newName} placeholder="e.g., Filing" onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && doAdd()} />
                </div>
                <div className="cmp-field cmp-field--full">
                  <label className="cmp-label">Badge Color</label>
                  <ColorPicker value={newColor} onChange={setNewColor} />
                </div>
                <div className="cmp-field">
                  <label className="cmp-label">Status</label>
                  <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Select>
                </div>
              </div>
            )}
            {activeAction === 'add' && subMode === 'bulk' && (
              <div className="cmp-form-grid">
                <div className="cmp-field cmp-field--full">
                  <label className="cmp-label">Paste entries — one per line</label>
                  <Textarea value={bulkAddText} onChange={e => setBulkAddText(e.target.value)}
                    placeholder={`Filing\nHearing\nJudgment\nResolution`}
                    rows={8} />
                  <span className="cmp-hint">Each line is one stage name.</span>
                </div>
              </div>
            )}
            {activeAction === 'edit' && subMode === 'single' && (
              <div className="cmp-form-grid">
                <div className="cmp-field cmp-field--full">
                  <label className="cmp-label">Select Case Stage <span className="cmp-required">*</span></label>
                  <Select value={editId} onChange={e => { setEditId(e.target.value); const item = items.find(x => x.id === e.target.value); if (item) { setEditName(item.name); setEditCode(item.short_code || ''); setEditColor(item.color || '#6b7280'); setEditStatus(item.status || 'Active'); setEditDesc(item.description || ''); } }}>
                    <option value="">— choose —</option>
                    {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </Select>
                </div>
                {editId && (
                  <>
                    <div className="cmp-field">
                      <label className="cmp-label">Name <span className="cmp-required">*</span></label>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>
                    <div className="cmp-field cmp-field--full">
                      <label className="cmp-label">Badge Color</label>
                      <ColorPicker value={editColor} onChange={setEditColor} />
                    </div>
                    <div className="cmp-field">
                      <label className="cmp-label">Status</label>
                      <Select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            )}
            {activeAction === 'edit' && subMode === 'bulk' && (
              <div className="cmp-form-grid">
                <div className="cmp-field cmp-field--full">
                  <label className="cmp-label">Format: <code>CurrentName|NewName</code> — one per line</label>
                  <Textarea value={bulkEditText} onChange={e => setBulkEditText(e.target.value)}
                    placeholder={'Filing|Case Filing\nHearing|Case Hearing'} rows={8} />
                  <span className="cmp-hint">Match by name or id before the pipe.</span>
                </div>
              </div>
            )}
            {activeAction === 'delete' && subMode === 'single' && (
              <div className="cmp-form-grid">
                <div className="cmp-field cmp-field--full">
                  <label className="cmp-label">Select Case Stage <span className="cmp-required">*</span></label>
                  <Select value={delId} onChange={e => setDelId(e.target.value)}>
                    <option value="">— choose —</option>
                    {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
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
                  <label className="cmp-label">Select case stages to delete</label>
                  <div className="cmp-checkbox-toolbar">
                    <label className="cmp-checkbox-all">
                      <input type="checkbox" checked={bulkDelSelected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                      <span>Select all {filtered.length}</span>
                    </label>
                    <span className="cmp-checkbox-count">{bulkDelSelected.size} selected</span>
                  </div>
                  <div className="cmp-checkbox-list">
                    {filtered.length === 0 ? (
                      <div className="cmp-empty">No case stages to display.</div>
                    ) : filtered.map(item => (
                      <label key={item.id} className={`cmp-checkbox-row${bulkDelSelected.has(item.id) ? ' checked' : ''}`}>
                        <input type="checkbox" checked={bulkDelSelected.has(item.id)} onChange={() => toggleBulkDel(item.id)} />
                        <div className="cmp-color-swatch-sm" style={{ '--swatch-color': item.color || '#6b7280' }} />
                        <span className="cmp-checkbox-name">{item.name}</span>
                        <span className="cmp-checkbox-status">{item.status || 'Active'}</span>
                      </label>
                    ))}
                  </div>
                  {bulkDelSelected.size > 0 && (
                    <div className="cmp-warning">
                      <Icon name="alert" size={16} />
                      <span>{bulkDelSelected.size} case stage(s) will be permanently deleted.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeAction === 'import' && (
              <div className="cmp-import">
                <div className="cmp-import-icon"><Icon name="upload" size={28} /></div>
                <div className="cmp-import-title">Import from CSV</div>
                <div className="cmp-import-hint">CSV columns: name</div>
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
            <Button variant="ghost" onClick={reset} disabled={busy}>Cancel</Button>
            {activeAction === 'add' && subMode === 'single' && <Button icon="plus" onClick={doAdd} disabled={busy}>{busy ? 'Adding…' : 'Add Case Stage'}</Button>}
            {activeAction === 'add' && subMode === 'bulk' && <Button icon="users" onClick={doBulkAdd} disabled={busy}>{busy ? 'Adding…' : 'Add All'}</Button>}
            {activeAction === 'edit' && subMode === 'single' && <Button icon="check" onClick={doEdit} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</Button>}
            {activeAction === 'edit' && subMode === 'bulk' && <Button icon="check" onClick={doBulkEdit} disabled={busy}>{busy ? 'Saving…' : 'Save All Changes'}</Button>}
            {activeAction === 'delete' && subMode === 'single' && <Button variant="danger" icon="trash" onClick={doDelete} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</Button>}
            {activeAction === 'delete' && subMode === 'bulk' && <Button variant="danger" icon="trash" onClick={doBulkDelete} disabled={busy}>{busy ? 'Deleting…' : 'Delete All Matched'}</Button>}
            {activeAction === 'import' && <Button icon="upload" onClick={doImport} disabled={busy || !importFile}>{busy ? 'Importing…' : 'Import'}</Button>}
          </div>
          )}
        </Card>
      )}

      <div className="cmp-search">
        <Icon name="search" size={18} />
        <input ref={searchRef} value={search} placeholder="Search..." autoComplete="off" onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <Modal open={!!viewItem} title={viewItem?.name} onClose={() => setViewItem(null)}>
        <div className="cmp-detail-body">
          <div className="cmp-color-swatch-md" style={{ '--swatch-color': viewItem?.color || '#6b7280' }} />
          <div className="cmp-detail-row">
            <span className="cmp-detail-label">Name</span>
            <span className="cmp-detail-value">{viewItem?.name}</span>
          </div>
          <div className="cmp-detail-row">
            <span className="cmp-detail-label">Status</span>
            <span className={`cmp-status-pill cmp-status-pill--${(viewItem?.status || 'Active').toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
              <span className="cmp-status-dot"></span>{viewItem?.status || 'Active'}
            </span>
          </div>
          <div className="cmp-detail-row">
            <span className="cmp-detail-label">Order</span>
            <span className="cmp-detail-value">{viewItem?.order ?? '—'}</span>
          </div>
        </div>
      </Modal>

      <Modal open={!!editTarget} title="Edit Case Stage" onClose={() => setEditTarget(null)}
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
            <label className="cmp-label">Short Code</label>
            <Input value={editCode} onChange={e => setEditCode(e.target.value.toUpperCase().slice(0, 6))} />
          </div>
          <div className="cmp-field cmp-field--full">
            <label className="cmp-label">Badge Color</label>
            <ColorPicker value={editColor} onChange={setEditColor} />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Status</label>
            <Select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
        </div>
      </Modal>

      <Modal open={!!dupTarget} title="Duplicate Case Stage" onClose={() => setDupTarget(null)}
        footer={<div className="cmp-modal-footer">
          <Button variant="ghost" onClick={() => setDupTarget(null)} disabled={busy}>Cancel</Button>
          <Button icon="plus" onClick={doAdd} disabled={busy}>{busy ? 'Adding…' : 'Add Case Stage'}</Button>
        </div>}>
        <div className="cmp-form-grid">
          <div className="cmp-field">
            <label className="cmp-label">Name <span className="cmp-required">*</span></label>
            <Input value={newName} placeholder="e.g., Filing" onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && doAdd()} />
          </div>
          <div className="cmp-field cmp-field--full">
            <label className="cmp-label">Badge Color</label>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Status</label>
            <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
        </div>
      </Modal>

      <div className="cmp-table-card">
        <table className="cmp-table">
          <thead>
            <tr>
              <th className="cmp-th--w32"></th>
              <th className="cmp-th--w40">CLR</th>
              <th><span className="cmp-sort">NAME <Icon name="chevrons-up-down" size={12} /></span></th>
              <th className="cmp-th--w80"><span className="cmp-sort">STATUS <Icon name="chevrons-up-down" size={12} /></span></th>
              <th className="cmp-th--w200">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td className="cmp-empty" colSpan={5}>No case stages found.</td></tr>
            ) : paged.map((item, idx) => (
              <tr key={item.id} draggable={!search}
                onDragStart={(e) => handleDragStart(e, (safePage - 1) * perPage + idx)}
                onDragOver={(e) => handleDragOver(e, (safePage - 1) * perPage + idx)}
                onDragEnd={handleDragEnd}
                className={`cmp-row${dragIdx === (safePage - 1) * perPage + idx ? ' cmp-row--dragging' : ''}`}
              >
                <td className="cmp-drag-cell">
                  <span className="cmp-drag-handle" title="Drag to reorder"><Icon name="grip" size={15} /></span>
                </td>
                <td><div className="cmp-color-swatch-lg" style={{ '--swatch-color': item.color || '#6b7280' }} /></td>
                <td>
                  <div className="cmp-name-cell">
                    <span className="cmp-name-avatar"><Icon name="layers" size={15} /></span>
                    <span className="cmp-cell-name">{item.name}</span>
                  </div>
                </td>
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
            ))}
          </tbody>
        </table>
        <div className="cmp-table-footer">
          <div>Showing {(safePage - 1) * perPage + 1} to {Math.min(safePage * perPage, filtered.length)} of {filtered.length} case stages</div>
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
              <div className="cmp-mobile-stat-icon cmp-mobile-stat-icon--total"><Icon name="layers" size={16} /></div>
              <span className="cmp-mobile-stat-num">{items.length}</span>
            </div>
            <div className="cmp-mobile-stat-label">Total</div>
          </div>
          <div className="cmp-mobile-stat-card">
            <div className="cmp-mobile-stat-row1">
              <div className="cmp-mobile-stat-icon cmp-mobile-stat-icon--active"><Icon name="check" size={16} /></div>
              <span className="cmp-mobile-stat-num">{items.filter(i => i.status === 'Active').length}</span>
            </div>
            <div className="cmp-mobile-stat-label">Active</div>
          </div>
          <div className="cmp-mobile-stat-card">
            <div className="cmp-mobile-stat-row1">
              <div className="cmp-mobile-stat-icon cmp-mobile-stat-icon--inactive"><Icon name="close" size={16} /></div>
              <span className="cmp-mobile-stat-num">{items.filter(i => i.status !== 'Active').length}</span>
            </div>
            <div className="cmp-mobile-stat-label">Inactive</div>
          </div>
        </div>

        <div className="cmp-mobile-section-header">
          <span className="cmp-mobile-section-title">All Case Stages</span>
          <span className="cmp-mobile-section-count">{Math.min(perPage, filtered.length)} of {filtered.length}</span>
          <span className="cmp-mobile-per-page" onClick={() => setPerPage(perPage === 10 ? 20 : perPage === 20 ? 50 : 10)}>
            {perPage} / page <Icon name="chevronDown" size={13} />
          </span>
        </div>

        <div className="cmp-mobile-list">
          {paged.length === 0 ? (
            <div className="cmp-empty">No case stages found.</div>
          ) : paged.map(item => (
            <div key={item.id} className="cmp-mobile-card">
              <div className="cmp-mobile-card-row1">
                <span className="cmp-mobile-drag-handle"><Icon name="grip" size={15} /></span>
                <span className="cmp-mobile-avatar"><Icon name="layers" size={18} /></span>
                <div className="cmp-mobile-card-info">
                  <div className="cmp-mobile-card-top">
                    <span className="cmp-mobile-card-name">{item.name}</span>
                    <span className={`cmp-status-pill cmp-status-pill--${(item.status || '').toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
                      <span className="cmp-status-dot"></span>{item.status || 'Active'}
                    </span>
                  </div>
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
