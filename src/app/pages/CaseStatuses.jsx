import { useState, useEffect, useRef } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { Input, Textarea, Select } from '@/components/Field.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { caseStatusLogic } from '@/logic/caseStatusLogic.js';
import ConfirmDialog from '@/components/setup/wizard/ConfirmDialog.jsx';
import Modal from '@/components/Modal.jsx';
import ColorPicker from '@/components/ColorPicker.jsx';
import { orderComparator } from '@/utils/displayOrder.js';

const ENTITY_PREFIX = 'CASS';


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

export default function CaseStatuses() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeAction, setActiveAction] = useState(null);
  const [subMode, setSubMode] = useState('single');
  const [page, setPage] = useState(1);
  const [showFilter, setShowFilter] = useState(false);
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
  const [editStatus, setEditStatus] = useState('');

  const [delId, setDelId] = useState('');

  const [bulkAddText, setBulkAddText] = useState('');
  const [bulkEditText, setBulkEditText] = useState('');
  const [bulkDelSelected, setBulkDelSelected] = useState(new Set());

  const [importFile, setImportFile] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [dupTarget, setDupTarget] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const dragOrder = useRef(null);
  const searchRef = useRef(null);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  const load = async () => {
    setLoading(true);
    const res = await caseStatusLogic.normalizeOrder().catch(() => []);
    if (Array.isArray(res)) setItems(res);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setActiveAction(null);
    setSubMode('single');
    setNewName(''); setNewCode(''); setNewColor('#6b7280'); setNewStatus('Active'); setNewDesc('');
    setEditId(''); setEditName(''); setEditCode(''); setEditColor('#6b7280'); setEditStatus('');
    setDelId(''); setImportFile(null);
    setEditTarget(null); setDupTarget(null);
    setBulkAddText(''); setBulkEditText(''); setBulkDelSelected(new Set());
    setPage(1);
  };

  const activate = (key) => {
    if (activeAction === key) { reset(); return; }
    setActiveAction(key);
    setSubMode('single');
  };

  const doAdd = async () => {
    if (!newName.trim() || !newCode.trim()) { toast.push('Name and code are required.', 'error'); return; }
    if (exists(newName, newCode)) { toast.push(`"${newName.trim()}" already exists.`, 'error'); return; }
    setBusy(true);
    const res = await caseStatusLogic.create({ name: newName, short_code: newCode, color: newColor, status: newStatus, description: newDesc });
    setBusy(false);
    if (res.ok) { setNewName(''); setNewCode(''); setNewColor('#6b7280'); setNewStatus('Active'); setNewDesc(''); setDupTarget(null); toast.push('Case status added.', 'success'); load(); }
    else toast.push(res.error, 'error');
  };

  const autoCode = (name) => {
    const slug = name.trim().replace(/\s+/g, '-').toUpperCase();
    return `${ENTITY_PREFIX}-${slug}`;
  };

  const exists = (name, code) =>
    items.some(i => i.name.toLowerCase() === name.trim().toLowerCase() || (code && i.short_code?.toLowerCase() === code.trim().toLowerCase()));

  const doBulkAdd = async () => {
    const lines = bulkAddText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.push('Paste at least one entry.', 'error'); return; }
    setBusy(true);
    let added = 0, skipped = 0;
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      setProgress({ current: idx + 1, total: lines.length, itemName: line.split(':')[0], percent: Math.round(((idx + 1) / lines.length) * 100) });
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) {
        const name = line;
        const short_code = autoCode(name);
        if (exists(name, short_code)) { skipped++; continue; }
        const res = await caseStatusLogic.create({ name, short_code });
        if (res.ok) added++; else skipped++;
      } else {
        const name = line.slice(0, colonIdx).trim();
        const code = line.slice(colonIdx + 1).trim();
        if (!name) { skipped++; continue; }
        if (exists(name, code.toUpperCase())) { skipped++; continue; }
        const res = await caseStatusLogic.create({ name, short_code: code.toUpperCase() });
        if (res.ok) added++; else skipped++;
      }
    }
    setBusy(false);
    setProgress(null);
    setBulkAddText('');
    toast.push(`${added} added.${skipped ? ` ${skipped} skipped.` : ''}`, added ? 'success' : 'info');
    load();
  };

  const doEdit = async () => {
    if (!editId) { toast.push('Select a case status to edit.', 'error'); return; }
    if (!editName.trim() || !editCode.trim()) { toast.push('Name and code cannot be empty.', 'error'); return; }
    setBusy(true);
    const item = items.find(x => x.id === editId);
    const res = await caseStatusLogic.update(editId, { name: editName, short_code: editCode, color: editColor, description: item?.description, display_order: item?.display_order, status: editStatus });
    setBusy(false);
    if (res.ok) { setEditId(''); setEditTarget(null); toast.push('Case status updated.', 'success'); load(); }
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
      const item = items.find(x => x.short_code === idPart || x.name === idPart || x.id === idPart);
      if (!item || !namePart) { skipped++; continue; }
      const [name, code] = namePart.split(':').map(s => s.trim());
      const res = await caseStatusLogic.update(item.id, { name: name || item.name, short_code: code || item.short_code });
      if (res.ok) updated++; else skipped++;
    }
    setBusy(false);
    setProgress(null);
    setBulkEditText('');
    toast.push(`${updated} updated.${skipped ? ` ${skipped} skipped.` : ''}`, updated ? 'success' : 'info');
    load();
  };

  const doDelete = async () => {
    if (!delId) { toast.push('Select a case status to delete.', 'error'); return; }
    const item = items.find(x => x.id === delId);
    setConfirmState({
      title: 'Delete Case Status',
      message: `Delete case status "${item?.name}"?`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmState(null);
        setBusy(true);
        const res = await caseStatusLogic.remove(delId);
        setBusy(false);
        if (res.ok || !res.error) { setDelId(''); toast.push('Case status deleted.', 'success'); load(); }
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
    if (!bulkDelSelected.size) { toast.push('Select at least one case status.', 'error'); return; }
    const count = bulkDelSelected.size;
    setConfirmState({
      title: 'Delete Case Statuses',
      message: `Delete ${count} case status(es)?`,
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
          await caseStatusLogic.remove(ids[idx]);
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
    setBusy(true);
    toast.push('CSV import coming soon.', 'info');
    setBusy(false);
  };

  const handleToggle = async (item) => {
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    setBusy(true);
    const res = await caseStatusLogic.update(item.id, { status: newStatus });
    setBusy(false);
    if (res.ok) { toast.push(`Case status ${newStatus === 'Active' ? 'enabled' : 'disabled'}.`, 'success'); load(); }
    else toast.push(res.error, 'error');
  };

  const filtered = items.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.short_code || '').toLowerCase().includes(search.toLowerCase())
  ).sort(orderComparator);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);
  const bulkMode = activeAction === 'delete' && subMode === 'bulk';

  const handleDragStart = (e, idx) => {
    setDragIdx(idx);
    dragOrder.current = filtered.map((t) => t.id);
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

  const handleDragEnd = async () => {
    if (dragIdx === null || !dragOrder.current) { setDragIdx(null); return; }
    const ids = dragOrder.current;
    setDragIdx(null);
    dragOrder.current = null;
    setBusy(true);
    await caseStatusLogic.reorder(ids);
    setBusy(false);
    load();
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setEditName(item.name);
    setEditCode(item.short_code || '');
    setEditColor(item.color || '#6b7280');
    setEditStatus(item.status || 'Active');
    setEditTarget(item);
  };

  const startDelete = (item) => {
    setActiveAction('delete');
    setSubMode('single');
    setDelId(item.id);
  };

  const startDuplicate = (item) => {
    setNewName(item.name + ' (copy)');
    setNewCode(item.short_code || '');
    setNewColor('#6b7280');
    setDupTarget(item);
  };

  const confirmDeleteItem = (item) => {
    setConfirmState({
      title: 'Delete Case Status',
      message: `Delete case status "${item?.name}"? This action cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmState(null);
        setBusy(true);
        const res = await caseStatusLogic.remove(item.id);
        setBusy(false);
        if (res.ok || !res.error) { toast.push('Case status deleted.', 'success'); load(); }
        else toast.push(res.error, 'error');
      },
      onCancel: () => setConfirmState(null),
    });
  };

  if (loading) return <div className="fade-in cmp-loading"><div className="spinner" /></div>;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return (
    <div className="fade-in">
      <div className="cmp-hero">
        <div className="cmp-hero-icon"><Icon name="toggle" size={34} /></div>
        <div className="cmp-hero-text">
          <h2>Case Statuses</h2>
          <p>Manage case statuses (Active, Closed, Archived, Transferred, etc.).</p>
          <div className="cmp-hero-accent" />
        </div>
        <Icon name="courthouse" className="cmp-hero-watermark" />
      </div>

      <div className="cmp-stats-row">
        <div className="cmp-statcard">
          <div className="cmp-statcard-icon cmp-statcard-icon--total"><Icon name="layers" size={20} /></div>
          <div className="cmp-statcard-body">
            <div className="cmp-statcard-label">Total</div>
            <div className="cmp-statcard-value">{items.length}</div>
            <div className="cmp-statcard-sub">All case statuses</div>
          </div>
        </div>
        <div className="cmp-statcard">
          <div className="cmp-statcard-icon cmp-statcard-icon--active"><Icon name="check-circle" size={20} /></div>
          <div className="cmp-statcard-body">
            <div className="cmp-statcard-label">Active</div>
            <div className="cmp-statcard-value">{items.filter(i => (i.status || 'Active').toLowerCase() === 'active').length}</div>
            <div className="cmp-statcard-sub">Currently in use</div>
          </div>
        </div>
        <div className="cmp-statcard">
          <div className="cmp-statcard-icon cmp-statcard-icon--inactive"><Icon name="ban" size={20} /></div>
          <div className="cmp-statcard-body">
            <div className="cmp-statcard-label">Inactive</div>
            <div className="cmp-statcard-value">{items.filter(i => (i.status || 'Active').toLowerCase() !== 'active').length}</div>
            <div className="cmp-statcard-sub">Not in use</div>
          </div>
        </div>
        <div className="cmp-statcard">
          <div className="cmp-statcard-icon cmp-statcard-icon--most-used"><Icon name="bar-chart" size={20} /></div>
          <div className="cmp-statcard-body">
            <div className="cmp-statcard-label">Most Used</div>
            <div className="cmp-statcard-value">—</div>
            <div className="cmp-statcard-sub">Usage tracking N/A</div>
          </div>
        </div>
        <div className="cmp-statcard">
          <div className="cmp-statcard-icon cmp-statcard-icon--created-month"><Icon name="calendar" size={20} /></div>
          <div className="cmp-statcard-body">
            <div className="cmp-statcard-label">Created This Month</div>
            <div className="cmp-statcard-value">{items.filter(i => i.created_at && new Date(i.created_at) >= monthStart).length}</div>
            <div className="cmp-statcard-sub">This calendar month</div>
          </div>
        </div>
        <div className="cmp-statcard">
          <div className="cmp-statcard-icon cmp-statcard-icon--assignments"><Icon name="briefcase" size={20} /></div>
          <div className="cmp-statcard-body">
            <div className="cmp-statcard-label">Total</div>
            <div className="cmp-statcard-value">{items.length}</div>
            <div className="cmp-statcard-sub">All case statuses</div>
          </div>
        </div>
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
          <button className={`cmp-tb-filter${showFilter?' active':''}`} onClick={()=>{setShowFilter(!showFilter);searchRef.current?.focus();}}>
            <Icon name="filter" size={16} /><span>Filter</span>
          </button>
        </div>
      </div>

      <button className="cmp-mobile-import cmp-mobile-only" onClick={() => activate('import')}>
        <Icon name="upload" size={16} /> Import
      </button>

      {activeAction && (
        <Card className="cmp-form">
          <div className="cmp-form-header">
            <Icon name={ACTIONS.find(a => a.key === activeAction)?.icon || 'file'} size={18} />
            <span className="cmp-form-header-title">{ACTIONS.find(a => a.key === activeAction)?.label} Case Status</span>
            {SUB_MODES[activeAction] && (
              <div className="cmp-toggle">
                {SUB_MODES[activeAction].map(m => (
                  <button
                    key={m.key}
                    className={`cmp-toggle-btn${subMode === m.key ? ' active' : ''}`}
                    onClick={() => setSubMode(m.key)}
                  >
                    <Icon name={m.icon} size={13} />
                    {m.label}
                  </button>
                ))}
              </div>
            )}
            <button className="iconbtn cmp-form-close" onClick={reset} title="Close"><Icon name="close" size={18} /></button>
          </div>
          <div className="cmp-form-body">
            {activeAction === 'add' && subMode === 'single' && (
              <div className="cmp-form-grid">
                <div className="cmp-field">
                  <label className="cmp-label">Name <span className="cmp-required">*</span></label>
                  <Input value={newName} placeholder="e.g., Active" onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && doAdd()} />
                </div>
                <div className="cmp-field">
                  <label className="cmp-label">Short Code <span className="cmp-required">*</span></label>
                  <Input value={newCode} placeholder="CASS-PENDING" onChange={e => setNewCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && doAdd()} />
                  <span className="cmp-hint">Example: CASS-PENDING</span>
                </div>
                <div className="cmp-field cmp-field--full">
                  <label className="cmp-label">Badge Color</label>
                  <ColorPicker value={newColor} onChange={setNewColor} />
                </div>
                <div className="cmp-field">
                  <label className="cmp-label">Status</label>
                  <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                    <option>Active</option>
                    <option>Inactive</option>
                  </Select>
                </div>
                <div className="cmp-field cmp-field--full">
                  <label className="cmp-label">Description <span className="cmp-optional">(optional)</span></label>
                  <Textarea value={newDesc} placeholder="Brief description…" onChange={e => setNewDesc(e.target.value)} maxLength={250} />
                  <span className="cmp-char-count">{newDesc.length} / 250</span>
                </div>
              </div>
            )}
            {activeAction === 'add' && subMode === 'bulk' && (
              <div className="cmp-form-grid">
                <div className="cmp-field cmp-field--full">
                  <label className="cmp-label">Paste entries — one per line</label>
                  <Textarea value={bulkAddText} onChange={e => setBulkAddText(e.target.value)}
                    placeholder={`Active          → auto: ${ENTITY_PREFIX}-ACTIVE\nActive:ACTIVE   → manual: ACTIVE\nClosed:CLOSED\nTransferred:XFER`}
                    rows={8} />
                  <span className="cmp-hint">Use <code>Name:CODE</code> for manual codes. Without <code>:CODE</code>, code auto-generates as <code>{ENTITY_PREFIX}-NAME-IN-HYPHENS</code>.</span>
                </div>
              </div>
            )}
            {activeAction === 'edit' && subMode === 'single' && (
              <div className="cmp-form-grid">
                <div className="cmp-field cmp-field--full">
                  <label className="cmp-label">Select Case Status <span className="cmp-required">*</span></label>
                  <Select value={editId} onChange={e => { setEditId(e.target.value); const item = items.find(x => x.id === e.target.value); if (item) { setEditName(item.name); setEditCode(item.short_code || ''); setEditColor(item.color || '#6b7280'); setEditStatus(item.status || 'Active'); } }}>
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
                    <div className="cmp-field">
                      <label className="cmp-label">Short Code <span className="cmp-required">*</span></label>
                      <Input value={editCode} placeholder="CASS-PENDING" onChange={e => setEditCode(e.target.value.toUpperCase())} />
                      <span className="cmp-hint">Example: CASS-PENDING</span>
                    </div>
                    <div className="cmp-field cmp-field--full">
                      <label className="cmp-label">Badge Color</label>
                      <ColorPicker value={editColor} onChange={setEditColor} />
                    </div>
                    <div className="cmp-field">
                      <label className="cmp-label">Status</label>
                      <Select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                        <option>Active</option>
                        <option>Inactive</option>
                      </Select>
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
                    placeholder={'Active|Active:ACT\nClosed|Closed:CLS\nArchived|Archived:ARC'} rows={8} />
                  <span className="cmp-hint">Match by name, short code, or id before the pipe.</span>
                </div>
              </div>
            )}
            {activeAction === 'delete' && subMode === 'single' && (
              <div className="cmp-form-grid">
                <div className="cmp-field cmp-field--full">
                  <label className="cmp-label">Select Case Status <span className="cmp-required">*</span></label>
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
                  <label className="cmp-label">Select case statuses to delete</label>
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
                      <span>{bulkDelSelected.size} case status(es) will be permanently deleted.</span>
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
          <div className="cmp-form-footer">
            <Button variant="ghost" onClick={reset} disabled={busy}>Cancel</Button>
            {activeAction === 'add' && subMode === 'single' && <Button icon="plus" onClick={doAdd} disabled={busy}>{busy ? 'Adding\u2026' : 'Add Case Status'}</Button>}
            {activeAction === 'add' && subMode === 'bulk' && <Button icon="users" onClick={doBulkAdd} disabled={busy}>{busy ? 'Adding\u2026' : 'Add All'}</Button>}
            {activeAction === 'edit' && subMode === 'single' && <Button icon="check" onClick={doEdit} disabled={busy}>{busy ? 'Saving\u2026' : 'Save Changes'}</Button>}
            {activeAction === 'edit' && subMode === 'bulk' && <Button icon="check" onClick={doBulkEdit} disabled={busy}>{busy ? 'Saving\u2026' : 'Save All Changes'}</Button>}
            {activeAction === 'delete' && subMode === 'single' && <Button variant="danger" icon="trash" onClick={doDelete} disabled={busy}>{busy ? 'Deleting\u2026' : 'Delete'}</Button>}
            {activeAction === 'delete' && subMode === 'bulk' && <Button variant="danger" icon="trash" onClick={doBulkDelete} disabled={busy}>{busy ? 'Deleting\u2026' : 'Delete All Matched'}</Button>}
            {activeAction === 'import' && <Button icon="upload" onClick={doImport} disabled={busy || !importFile}>{busy ? 'Importing\u2026' : 'Import'}</Button>}
          </div>
        </Card>
      )}

      <div className="cmp-search">
        <Icon name="search" size={18} />
        <input ref={searchRef} value={search} placeholder="Search..." autoComplete="off" onChange={e=>{setSearch(e.target.value);setPage(1);}} />
      </div>

      <Modal open={!!viewItem} title={viewItem?.name} onClose={() => setViewItem(null)}>
        <div className="cmp-detail-body">
          <div className="cmp-detail-row">
            <span className="cmp-detail-label">Short Code</span>
            <span className="cmp-detail-value">{viewItem?.short_code || '—'}</span>
          </div>
          <div className="cmp-detail-row">
            <span className="cmp-detail-label">Description</span>
            <span className="cmp-detail-value">{viewItem?.description || '—'}</span>
          </div>
          <div className="cmp-detail-row">
            <span className="cmp-detail-label">Display Order</span>
            <span className="cmp-detail-value">{viewItem?.display_order ?? '—'}</span>
          </div>
          <div className="cmp-detail-row">
            <span className="cmp-detail-label">Color</span>
            <span className="cmp-detail-value"><div className="cmp-color-swatch-lg" style={{ '--swatch-color': viewItem?.color || '#6b7280' }} /></span>
          </div>
        </div>
      </Modal>

      <Modal open={!!editTarget} title="Edit Case Status" onClose={() => setEditTarget(null)}
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
            <Input value={editCode} placeholder="CASS-PENDING" onChange={e => setEditCode(e.target.value.toUpperCase())} />
            <span className="cmp-hint">Example: CASS-PENDING</span>
          </div>
          <div className="cmp-field cmp-field--full">
            <label className="cmp-label">Badge Color</label>
            <ColorPicker value={editColor} onChange={setEditColor} />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Status</label>
            <Select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </Select>
          </div>
        </div>
      </Modal>

      <Modal open={!!dupTarget} title="Duplicate Case Status" onClose={() => setDupTarget(null)}
        footer={<div className="cmp-modal-footer">
          <Button variant="ghost" onClick={() => setDupTarget(null)} disabled={busy}>Cancel</Button>
          <Button icon="plus" onClick={doAdd} disabled={busy}>{busy ? 'Adding…' : 'Add Case Status'}</Button>
        </div>}>
        <div className="cmp-form-grid">
          <div className="cmp-field">
            <label className="cmp-label">Name <span className="cmp-required">*</span></label>
            <Input value={newName} placeholder="e.g., Active" onChange={e => setNewName(e.target.value)} />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Short Code <span className="cmp-required">*</span></label>
            <Input value={newCode} placeholder="CASS-PENDING" onChange={e => setNewCode(e.target.value.toUpperCase())} />
            <span className="cmp-hint">Example: CASS-PENDING</span>
          </div>
          <div className="cmp-field cmp-field--full">
            <label className="cmp-label">Badge Color</label>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Status</label>
            <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </Select>
          </div>
          <div className="cmp-field cmp-field--full">
            <label className="cmp-label">Description <span className="cmp-optional">(optional)</span></label>
            <Textarea value={newDesc} placeholder="Brief description…" onChange={e => setNewDesc(e.target.value)} maxLength={250} />
            <span className="cmp-char-count">{newDesc.length} / 250</span>
          </div>
        </div>
      </Modal>

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
              <th className="cmp-th--w180">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td className="cmp-empty" colSpan={bulkMode ? 7 : 6}>No case statuses found.</td></tr>
            ) : paged.map((item, idx) => (
              <tr key={item.id} draggable={!search}
                onDragStart={(e) => handleDragStart(e, (safePage - 1) * perPage + idx)}
                onDragOver={(e) => handleDragOver(e, (safePage - 1) * perPage + idx)}
                onDragEnd={handleDragEnd}
                className={`cmp-row${dragIdx === (safePage - 1) * perPage + idx ? ' cmp-row--dragging' : ''}`}
              >
                {bulkMode && <td className="cmp-check-cell"><input type="checkbox" checked={bulkDelSelected.has(item.id)} onChange={() => toggleBulkDel(item.id)} /></td>}
                <td className="cmp-drag-cell">
                  <span className="cmp-drag-handle" title="Drag to reorder"><Icon name="grip" size={15} /></span>
                </td>
                <td><span className="cmp-order-num">{item.display_order}</span></td>
                <td>
                  <div className="cmp-name-cell">
                    <span className="cmp-color-swatch-lg" style={{ '--swatch-color': item.color || '#6b7280' }} />
                    <span className="cmp-name-avatar"><Icon name="toggle" size={15} /></span>
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
                      <button className={`cmp-act-btn ${item.status === 'Active' ? 'cmp-act-btn--toggle-on' : 'cmp-act-btn--toggle-off'}`}
                        title={item.status === 'Active' ? 'Set Inactive' : 'Set Active'}
                        onClick={() => handleToggle(item)}>
                        <Icon name={item.status === 'Active' ? 'toggle-right' : 'toggle-left'} size={15} />
                      </button>
                      <button className="cmp-act-btn cmp-act-btn--del" title="Delete" onClick={() => confirmDeleteItem(item)}><Icon name="trash" size={15} /></button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="cmp-table-footer">
          <div>Showing {(safePage - 1) * perPage + 1} to {Math.min(safePage * perPage, filtered.length)} of {filtered.length} case statuses</div>
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
              <div className="cmp-mobile-stat-icon cmp-mobile-stat-icon--total"><Icon name="toggle" size={16} /></div>
              <span className="cmp-mobile-stat-num">{items.length}</span>
            </div>
            <div className="cmp-mobile-stat-label">Total</div>
          </div>
          <div className="cmp-mobile-stat-card">
            <div className="cmp-mobile-stat-row1">
              <div className="cmp-mobile-stat-icon cmp-mobile-stat-icon--active"><Icon name="check" size={16} /></div>
              <span className="cmp-mobile-stat-num">{items.filter(i => (i.status || 'Active').toLowerCase() === 'active').length}</span>
            </div>
            <div className="cmp-mobile-stat-label">Active</div>
          </div>
          <div className="cmp-mobile-stat-card">
            <div className="cmp-mobile-stat-row1">
              <div className="cmp-mobile-stat-icon cmp-mobile-stat-icon--inactive"><Icon name="close" size={16} /></div>
              <span className="cmp-mobile-stat-num">{items.filter(i => (i.status || 'Active').toLowerCase() !== 'active').length}</span>
            </div>
            <div className="cmp-mobile-stat-label">Inactive</div>
          </div>
        </div>

        <div className="cmp-mobile-section-header">
          <span className="cmp-mobile-section-title">All Case Statuses</span>
          <span className="cmp-mobile-section-count">{Math.min(perPage, filtered.length)} of {filtered.length}</span>
          <span className="cmp-mobile-per-page" onClick={() => setPerPage(perPage === 10 ? 20 : perPage === 20 ? 50 : 10)}>
            {perPage} / page <Icon name="chevronDown" size={13} />
          </span>
        </div>

        <div className="cmp-mobile-list">
          {paged.length === 0 ? (
            <div className="cmp-empty">No case statuses found.</div>
          ) : paged.map(item => (
            <div key={item.id} className="cmp-mobile-card">
              <div className="cmp-mobile-card-row1">
                <span className="cmp-mobile-drag-handle"><Icon name="grip" size={15} /></span>
                <span className="cmp-mobile-avatar"><Icon name="toggle" size={18} /></span>
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
                <button className={`cmp-mobile-action ${item.status === 'Active' ? 'cmp-mobile-action--toggle-on' : 'cmp-mobile-action--toggle-off'}`}
                  title={item.status === 'Active' ? 'Set Inactive' : 'Set Active'}
                  onClick={() => handleToggle(item)}>
                  <span className="cmp-mobile-action-icon"><Icon name={item.status === 'Active' ? 'toggle-right' : 'toggle-left'} size={15} /></span>
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
                <div className="spinner" />
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
    </div>
  );
}
