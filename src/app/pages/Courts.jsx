import { useState, useEffect, useRef, Fragment, useCallback } from 'react';
import Button from '@/components/Button.jsx';
import Card from '@/components/Card.jsx';
import { Input, Select, Textarea } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { courtsLogic } from '@/logic/courtsLogic.js';
import { orderComparator } from '@/utils/displayOrder.js';
import ConfirmDialog from '@/components/setup/wizard/ConfirmDialog.jsx';
import Modal from '@/components/Modal.jsx';
import ColorPicker from '@/components/ColorPicker.jsx';

const ENTITY_PREFIX = 'COU';

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

export default function Courts() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeAction, setActiveAction] = useState(null);
  const [subMode, setSubMode] = useState('single');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newParent, setNewParent] = useState('');
  const [newStatus, setNewStatus] = useState('Active');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');

  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editParent, setEditParent] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [editColor, setEditColor] = useState('#6b7280');

  const [delId, setDelId] = useState('');

  const [bulkAddText, setBulkAddText] = useState('');
  const [bulkEditText, setBulkEditText] = useState('');
  const [bulkDelSelected, setBulkDelSelected] = useState(new Set());

  const [importFile, setImportFile] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [dupTarget, setDupTarget] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [moreMenu, setMoreMenu] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const dragOrder = useRef(null);
  const searchRef = useRef(null);

  const [selected, setSelected] = useState(new Set());
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    const res = await courtsLogic.normalizeOrder().catch(() => []);
    if (Array.isArray(res)) {
      const seen = new Set();
      const deduped = res.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
      if (deduped.length !== res.length) console.warn('[Courts] Duplicate IDs in list() — deduped', res.length, '→', deduped.length);
      setItems(deduped);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!moreMenu) return;
    const handler = (e) => { if (!e.target.closest('.cmp-act-more-wrap')) setMoreMenu(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreMenu]);

  const reset = () => {
    setActiveAction(null);
    setSubMode('single');
    setNewName(''); setNewCode(''); setNewParent(''); setNewStatus('Active'); setNewDesc('');
    setEditId(''); setEditName(''); setEditCode(''); setEditParent(''); setEditStatus('Active');
    setDelId(''); setImportFile(null);
    setBulkAddText(''); setBulkEditText(''); setBulkDelSelected(new Set());
    setEditTarget(null); setDupTarget(null);
    setPage(1);
  };

  const activate = (key) => {
    if (activeAction === key) { reset(); return; }
    setActiveAction(key);
    setSubMode('single');
  };

  const autoCode = (name) => {
    const slug = name.trim().replace(/\s+/g, '-').toUpperCase();
    return `${ENTITY_PREFIX}-${slug}`;
  };

  const exists = (name, code) =>
    items.some(i => i.name.toLowerCase() === name.trim().toLowerCase() || (code && i.short_code?.toLowerCase() === code.trim().toLowerCase()));

  const doAdd = async () => {
    if (!newName.trim() || !newCode.trim()) { toast.push('Name and code are required.', 'error'); return; }
    if (exists(newName, newCode)) { toast.push(`"${newName.trim()}" already exists.`, 'error'); return; }
    setBusy(true);
    const order = items.reduce((m, i) => Math.max(m, i.display_order ?? 0), 0) + 1;
    const res = await courtsLogic.create({ name: newName, short_code: newCode, parent_id: newParent || null, display_order: order, status: newStatus, description: newDesc, color: newColor });
    setBusy(false);
    if (res.ok) { setNewName(''); setNewCode(''); setNewParent(''); setNewStatus('Active'); setNewDesc(''); setNewColor('#6b7280'); setDupTarget(null); toast.push('Court added.', 'success'); load(); }
    else { toast.push(res.error, 'error'); }
  };

  const doBulkAdd = async () => {
    const lines = bulkAddText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.push('Paste at least one entry.', 'error'); return; }
    setBusy(true);
    setProgress({ current: 0, total: lines.length, itemName: 'Starting…', percent: 0 });
    let added = 0, skipped = 0;
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const colonIdx = line.indexOf(':');
      const name = colonIdx === -1 ? line : line.slice(0, colonIdx).trim();
      const code = colonIdx === -1 ? autoCode(name) : line.slice(colonIdx + 1).trim().toUpperCase();
      setProgress({ current: idx + 1, total: lines.length, itemName: name || '…', percent: Math.round(((idx + 1) / lines.length) * 100) });
      if (!name) { skipped++; continue; }
      if (exists(name, code)) { skipped++; continue; }
      const res = await courtsLogic.create({ name, short_code: code });
      if (res.ok) added++; else skipped++;
    }
    setBusy(false);
    setProgress(null);
    setBulkAddText('');
    toast.push(`${added} added.${skipped ? ` ${skipped} skipped.` : ''}`, added ? 'success' : 'info');
    load();
  };

  const doEdit = async () => {
    if (!editId) { toast.push('Select a court to edit.', 'error'); return; }
    if (!editName.trim() || !editCode.trim()) { toast.push('Name and code cannot be empty.', 'error'); return; }
    setBusy(true);
    const item = items.find(x => x.id === editId);
    const res = await courtsLogic.update(editId, { name: editName, short_code: editCode, parent_id: editParent || null, display_order: item?.display_order, status: editStatus, color: editColor });
    setBusy(false);
    if (res.ok) { setEditId(''); setEditTarget(null); toast.push('Court updated.', 'success'); load(); }
    else toast.push(res.error, 'error');
  };

  const doBulkEdit = async () => {
    const lines = bulkEditText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.push('Paste at least one entry.', 'error'); return; }
    setBusy(true);
    let updated = 0, skipped = 0;
    for (const line of lines) {
      const [idPart, namePart] = line.split('|').map(s => s.trim());
      const item = items.find(x => x.short_code === idPart || x.name === idPart || x.id === idPart);
      if (!item || !namePart) { skipped++; continue; }
      const [name, code] = namePart.split(':').map(s => s.trim());
      const res = await courtsLogic.update(item.id, { name: name || item.name, short_code: code || item.short_code });
      if (res.ok) updated++; else skipped++;
    }
    setBusy(false);
    setBulkEditText('');
    toast.push(`${updated} updated.${skipped ? ` ${skipped} skipped.` : ''}`, updated ? 'success' : 'info');
    load();
  };

  const doDelete = async () => {
    if (!delId) { toast.push('Select a court to delete.', 'error'); return; }
    const item = items.find(x => x.id === delId);
    setConfirmState({
      title: 'Delete Court',
      message: `Delete court "${item?.name}"?`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmState(null);
        setBusy(true);
        const res = await courtsLogic.remove(delId);
        setBusy(false);
        if (res.ok || !res.error) { setDelId(''); toast.push('Court deleted.', 'success'); load(); }
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
    if (!bulkDelSelected.size) { toast.push('Select at least one court.', 'error'); return; }
    const count = bulkDelSelected.size;
    setConfirmState({
      title: 'Delete Courts',
      message: `Delete ${count} court(s)?`,
      variant: 'danger',
      confirmLabel: 'Delete All',
      onConfirm: async () => {
        setConfirmState(null);
        setBusy(true);
        const ids = [...bulkDelSelected];
        setProgress({ current: 0, total: ids.length, itemName: 'Starting…', percent: 0 });
        for (let idx = 0; idx < ids.length; idx++) {
          const item = items.find(x => x.id === ids[idx]);
          setProgress({ current: idx + 1, total: ids.length, itemName: item?.name || '…', percent: Math.round(((idx + 1) / ids.length) * 100) });
          await courtsLogic.remove(ids[idx]);
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

  const startEdit = (item) => {
    setEditId(item.id);
    setEditName(item.name);
    setEditCode(item.short_code || '');
    setEditParent(item.parent_id || '');
    setEditStatus(item.status || 'Active');
    setEditColor(item.color || '#6b7280');
    setEditTarget(item);
  };

  const startDuplicate = (item) => {
    setNewName(item.name + ' (copy)');
    setNewCode(item.short_code || '');
    setNewParent(item.parent_id || '');
    setNewStatus('Active');
    setNewColor(item.color || '#6b7280');
    setDupTarget(item);
  };

  const confirmDeleteItem = (item) => {
    setConfirmState({
      title: 'Delete Court',
      message: `Delete court "${item?.name}"? This action cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmState(null);
        setBusy(true);
        const res = await courtsLogic.remove(item.id);
        setBusy(false);
        if (res.ok || !res.error) { toast.push('Court deleted.', 'success'); load(); }
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

  const handleToggle = useCallback(async (item) => {
    try {
      const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
      const res = await courtsLogic.update(item.id, { name: item.name, status: newStatus });
      if (res.ok) { toast.push(`Court ${newStatus === 'Active' ? 'enabled' : 'disabled'}.`, 'success'); await load(); }
      else toast.push(res.error, 'error');
    } catch (err) { toast.push(err?.message || 'Failed to toggle status.', 'error'); }
  }, [load, toast]);

  // Legacy tree functions
  const removeBulk = async () => {
    if (!selected.size) return;
    const count = selected.size;
    setConfirmState({
      title: 'Delete Courts',
      message: `Delete ${count} court(s)?`,
      variant: 'danger',
      confirmLabel: 'Delete All',
      onConfirm: async () => {
        setConfirmState(null);
        setBusy(true);
        const res = await courtsLogic.bulkRemove([...selected]);
        setBusy(false);
        if (res.ok) {
          setSelected(new Set());
          toast.push(`${res.data?.deleted || count} court(s) deleted.`, 'success');
          await load();
        } else { toast.push(res.error, 'error'); }
      },
      onCancel: () => setConfirmState(null),
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelected(new Set(filtered.map((t) => t.id)));
    else setSelected(new Set());
  };

  const handleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const duplicate = async (item) => {
    const res = await courtsLogic.create({ name: `${item.name} (Copy)`, short_code: item.short_code, parent_id: item.parent_id });
    if (res.ok) { toast.push('Court duplicated.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  // Drag
  const handleDragStart = (e, itemId) => {
    setDragId(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, itemId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(itemId);
  };

  const handleDragLeave = () => { setDropTarget(null); };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    setDropTarget(null);
    const sourceId = dragId;
    if (!sourceId || sourceId === targetId) { setDragId(null); return; }
    const source = items.find((i) => i.id === sourceId);
    const target = items.find((i) => i.id === targetId);
    if (!source || !target) { setDragId(null); return; }
    const siblings = items
      .filter((i) => i.parent_id === source.parent_id)
      .sort((a, b) => a.display_order - b.display_order);
    const srcIdx = siblings.findIndex((i) => i.id === sourceId);
    const tgtIdx = siblings.findIndex((i) => i.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) { setDragId(null); return; }
    siblings.splice(srcIdx, 1);
    siblings.splice(tgtIdx, 0, source);
    const updates = siblings.map((item, idx) => {
      if (item.display_order !== idx + 1) {
        return courtsLogic.update(item.id, { name: item.name, display_order: idx + 1 });
      }
      return null;
    }).filter(Boolean);
    if (updates.length > 0) {
      await Promise.all(updates);
      await load();
    }
    setDragId(null);
  };

  const handleDragEnd = () => { setDragId(null); setDropTarget(null); };

  // Derived data
  const filtered = items.filter((i) =>
    !search ||
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.short_code || '').toLowerCase().includes(search.toLowerCase())
  ).sort(orderComparator);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const rootItems = filtered.filter((i) => !i.parent_id).sort((a, b) => a.display_order - b.display_order);
  const getChildren = (parentId) => filtered.filter((i) => i.parent_id === parentId).sort((a, b) => a.display_order - b.display_order);

  const liveOptions = (excludeId) => items
    .filter((i) => i.id !== excludeId)
    .map((i) => ({ value: i.id, label: i.name }));

  const stopRowDnD = (e) => { e.stopPropagation(); };

  const renderTree = (nodes, depth = 0) => {
    return nodes.map((item) => {
      const children = getChildren(item.id);
      const isDragging = dragId === item.id;
      const isDropOver = dropTarget === item.id;

      return (
        <Fragment key={item.id}>
          <tr
            draggable
            className={isDragging ? 'dragging' : isDropOver ? 'drag-over' : 'courts__row--draggable'}
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragOver={(e) => handleDragOver(e, item.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, item.id)}
            onDragEnd={handleDragEnd}
          >
            <td className="cmp-drag-cell">
              <span className="cmp-drag-handle" title="Drag to reorder"><Icon name="grip" size={15} /></span>
            </td>
            <td><span className="cmp-order-num">{item.display_order}</span></td>
            <td className="courts__cell courts__cell--checkbox">
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => handleSelect(item.id)}
                onClick={stopRowDnD}
              />
            </td>
            <td className="cmp-indent" style={{ '--indent': `${16 + depth * 24}px` }}>
              <div className="cmp-name-cell">
                <span className="cmp-color-swatch-sm" style={{ '--swatch-color': item.color || '#6b7280' }} />
                <span className="courts__name">{item.name}</span>
              </div>
            </td>
            <td>
              <code className="courts__code">{item.short_code || '—'}</code>
            </td>
            <td>
              <span className="muted">
                {item.parent_id ? `Child of ${items.find((i) => i.id === item.parent_id)?.name || '—'}` : 'Root level'}
              </span>
            </td>
            <td><span className={`badge badge--${item.status === 'Active' ? 'green' : 'red'}`}>{item.status}</span></td>
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
          {children.length > 0 && renderTree(children, depth + 1)}
        </Fragment>
      );
    });
  };

  if (loading) return <div className="fade-in loading-page"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      {/* Hero with watermark */}
      <div className="cmp-hero">
        <div className="cmp-hero-icon"><Icon name="layers" size={34} /></div>
        <div className="cmp-hero-text">
          <h2>Courts</h2>
          <p>Define the hierarchical structure of courts.</p>
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
          { label: 'Total Courts', value: items.length, icon: 'layers', bg: '#EEF2FF', color: '#6366F1', sub: 'All courts' },
          { label: 'Active', value: items.filter(i => (i.status||'Active').toLowerCase()==='active').length, icon: 'check', bg: '#ECFDF5', color: '#22C55E', sub: 'Active courts' },
          { label: 'Inactive', value: items.filter(i => (i.status||'Active').toLowerCase()!=='active').length, icon: 'close', bg: '#FFF7ED', color: '#F59E0B', sub: 'Inactive courts' },
          { label: 'Root Courts', value: items.filter(i => !i.parent_id).length, icon: 'home', bg: '#F0F0FF', color: '#8B5CF6', sub: 'Top-level only' },
          { label: 'With Children', value: items.filter(i => items.some(c => c.parent_id === i.id)).length, icon: 'layers', bg: '#FFF1F2', color: '#F43F5E', sub: 'Parent courts' },
          { label: 'Max Depth', value: '—', icon: 'maximize', bg: '#F0F9FF', color: '#0EA5E9', sub: 'Deepest level' },
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
          <button className={`cmp-tb-filter${showFilter ? ' active' : ''}`} title={showFilter ? 'Filter active — click to clear' : 'Filter'} onClick={() => { setShowFilter(!showFilter); searchRef.current?.focus(); }}>
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
            <span className="cmp-form-header-title">{ACTIONS.find(a => a.key === activeAction)?.label} Court</span>
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
                  <Input value={newName} placeholder="e.g., Supreme Court" onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && doAdd()} />
                </div>
                <div className="cmp-field">
                  <label className="cmp-label">Short Code <span className="cmp-required">*</span></label>
                  <Input value={newCode} placeholder="e.g., SC" onChange={e => setNewCode(e.target.value.toUpperCase().slice(0, 6))} onKeyDown={e => e.key === 'Enter' && doAdd()} />
                </div>
                <div className="cmp-field cmp-field--full">
                  <label className="cmp-label">Parent Court</label>
                  <Select value={newParent} onChange={e => setNewParent(e.target.value)} options={[{ value: '', label: '— Root —' }, ...liveOptions(null)]} />
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
                    placeholder={`Supreme Court          → auto: ${ENTITY_PREFIX}-SUPREME-COURT\nSupreme Court:SC       → manual: SC\nHigh Court:HC\nDistrict Court`}
                    rows={8} />
                  <span className="cmp-hint">Use <code>Name:CODE</code> for manual codes. Without <code>:CODE</code>, code auto-generates as <code>{ENTITY_PREFIX}-NAME-IN-HYPHENS</code>.</span>
                </div>
              </div>
            )}
            {activeAction === 'edit' && subMode === 'single' && (
              <div className="cmp-form-grid">
                <div className="cmp-field cmp-field--full">
                  <label className="cmp-label">Select Court <span className="cmp-required">*</span></label>
                  <Select value={editId} onChange={e => { setEditId(e.target.value); const item = items.find(x => x.id === e.target.value); if (item) { setEditName(item.name); setEditCode(item.short_code || ''); setEditParent(item.parent_id || ''); setEditStatus(item.status || 'Active'); setEditColor(item.color || '#6b7280'); } }}>
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
                      <Input value={editCode} onChange={e => setEditCode(e.target.value.toUpperCase().slice(0, 6))} />
                    </div>
                    <div className="cmp-field cmp-field--full">
                      <label className="cmp-label">Parent Court</label>
                      <Select value={editParent} onChange={e => setEditParent(e.target.value)} options={[{ value: '', label: '— Root —' }, ...liveOptions(editId)]} />
                    </div>
                    <div className="cmp-field">
                      <label className="cmp-label">Status</label>
                      <Select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                        <option>Active</option>
                        <option>Inactive</option>
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
                    placeholder={'Supreme Court|Supreme Court of India:SCI\nHigh Court|High Court of Orissa:HCO'} rows={8} />
                  <span className="cmp-hint">Match by name, short code, or id before the pipe.</span>
                </div>
              </div>
            )}
            {activeAction === 'delete' && subMode === 'single' && (
              <div className="cmp-form-grid">
                <div className="cmp-field cmp-field--full">
                  <label className="cmp-label">Select Court <span className="cmp-required">*</span></label>
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
                  <label className="cmp-label">Select courts to delete</label>
                  <div className="cmp-checkbox-toolbar">
                    <label className="cmp-checkbox-all">
                      <input type="checkbox" checked={bulkDelSelected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                      <span>Select all {filtered.length}</span>
                    </label>
                    <span className="cmp-checkbox-count">{bulkDelSelected.size} selected</span>
                  </div>
                  <div className="cmp-checkbox-list">
                    {filtered.length === 0 ? (
                      <div className="cmp-empty">No courts to display.</div>
                    ) : filtered.map(item => (
                      <label key={item.id} className={`cmp-checkbox-row${bulkDelSelected.has(item.id) ? ' checked' : ''}`}>
                        <input type="checkbox" checked={bulkDelSelected.has(item.id)} onChange={() => toggleBulkDel(item.id)} />
                        <span className="cmp-checkbox-name">{item.name}</span>
                        <span className={`badge badge--${(item.status || '').toLowerCase() === 'active' ? 'green' : 'red'}`}>{item.status}</span>
                      </label>
                    ))}
                  </div>
                  {bulkDelSelected.size > 0 && (
                    <div className="cmp-warning">
                      <Icon name="alert" size={16} />
                      <span>{bulkDelSelected.size} court(s) will be permanently deleted.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeAction === 'import' && (
              <div className="cmp-import">
                <div className="cmp-import-icon"><Icon name="upload" size={28} /></div>
                <div className="cmp-import-title">Import from CSV</div>
                <div className="cmp-import-hint">CSV columns: name, short_code, parent_id, status (optional)</div>
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
            {activeAction === 'add' && subMode === 'single' && <Button icon="plus" onClick={doAdd} disabled={busy}>{busy ? 'Adding…' : 'Add Court'}</Button>}
            {activeAction === 'add' && subMode === 'bulk' && <Button icon="users" onClick={doBulkAdd} disabled={busy}>{busy ? 'Adding…' : 'Add All'}</Button>}
            {activeAction === 'edit' && subMode === 'single' && <Button icon="check" onClick={doEdit} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</Button>}
            {activeAction === 'edit' && subMode === 'bulk' && <Button icon="check" onClick={doBulkEdit} disabled={busy}>{busy ? 'Saving…' : 'Save All Changes'}</Button>}
            {activeAction === 'delete' && subMode === 'single' && <Button variant="danger" icon="trash" onClick={doDelete} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</Button>}
            {activeAction === 'delete' && subMode === 'bulk' && <Button variant="danger" icon="trash" onClick={doBulkDelete} disabled={busy}>{busy ? 'Deleting…' : 'Delete All Matched'}</Button>}
            {activeAction === 'import' && <Button icon="upload" onClick={doImport} disabled={!importFile || busy}>Import</Button>}
          </div>
        </Card>
      )}

      <div className={`cmp-search${showFilter ? ' cmp-search--filtered' : ''}`}>
        <Icon name="search" size={18} />
        <input ref={searchRef} value={search} placeholder="Search courts…" autoComplete="off" onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <Modal open={!!viewItem} title={viewItem?.name} onClose={() => setViewItem(null)}>
        <div className="cmp-detail-body">
          <div className="cmp-detail-row">
            <span className="cmp-detail-label">Code</span>
            <span className="cmp-detail-value">{viewItem?.short_code || '—'}</span>
          </div>
          <div className="cmp-detail-row">
            <span className="cmp-detail-label">Status</span>
            <span className={`badge badge--${(viewItem?.status || '').toLowerCase() === 'active' ? 'green' : 'red'}`}>{viewItem?.status || 'Active'}</span>
          </div>
          <div className="cmp-detail-row">
            <span className="cmp-detail-label">Badge Color</span>
            <span className="cmp-detail-value"><div className="cmp-color-swatch-lg" style={{ '--swatch-color': viewItem?.color || '#6b7280' }} /></span>
          </div>
          <div className="cmp-detail-row">
            <span className="cmp-detail-label">Parent</span>
            <span className="cmp-detail-value">{viewItem?.parent_id ? (items.find(i => i.id === viewItem.parent_id)?.name || viewItem.parent_id) : '—'}</span>
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
            <span className="cmp-detail-label">ID</span>
            <span className="cmp-detail-value">{viewItem?.id}</span>
          </div>
        </div>
      </Modal>

      <Modal open={!!editTarget} title="Edit Court" onClose={() => setEditTarget(null)}
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
          <div className="cmp-field cmp-field--full">
            <label className="cmp-label">Parent Court</label>
            <Select value={editParent} onChange={e => setEditParent(e.target.value)} options={[{ value: '', label: '— Root —' }, ...liveOptions(editId)]} />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Status</label>
            <Select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </Select>
          </div>
          <div className="cmp-field cmp-field--full">
            <label className="cmp-label">Badge Color</label>
            <ColorPicker value={editColor} onChange={setEditColor} />
          </div>
        </div>
      </Modal>

      <Modal open={!!dupTarget} title="Duplicate Court" onClose={() => setDupTarget(null)}
        footer={<div className="cmp-modal-footer">
          <Button variant="ghost" onClick={() => setDupTarget(null)} disabled={busy}>Cancel</Button>
          <Button icon="plus" onClick={doAdd} disabled={busy}>{busy ? 'Adding…' : 'Add Court'}</Button>
        </div>}>
        <div className="cmp-form-grid">
          <div className="cmp-field">
            <label className="cmp-label">Name <span className="cmp-required">*</span></label>
            <Input value={newName} placeholder="e.g., Supreme Court" onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && doAdd()} />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">Short Code <span className="cmp-required">*</span></label>
            <Input value={newCode} placeholder="e.g., SC" onChange={e => setNewCode(e.target.value.toUpperCase().slice(0, 6))} onKeyDown={e => e.key === 'Enter' && doAdd()} />
          </div>
          <div className="cmp-field cmp-field--full">
            <label className="cmp-label">Parent Court</label>
            <Select value={newParent} onChange={e => setNewParent(e.target.value)} options={[{ value: '', label: '— Root —' }, ...liveOptions(null)]} />
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
          <div className="cmp-field cmp-field--full">
            <label className="cmp-label">Badge Color</label>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
        </div>
      </Modal>

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

      {/* Table Card */}
      <div className="cmp-table-card">
        <table className="cmp-table">
          <thead>
            <tr>
              <th className="cmp-th--w32"></th>
              <th className="cmp-th--w40">#</th>
              <th className="courts__th-checkbox"><input type="checkbox" onChange={handleSelectAll} checked={selected.size === filtered.length && filtered.length > 0} /></th>
              <th>Court Name</th>
              <th>Shortcode</th>
              <th>Parent</th>
              <th>Status</th>
              <th className="courts__th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rootItems.length === 0 ? (
              <tr><td className="cmp-empty" colSpan={8}>No courts defined.</td></tr>
            ) : renderTree(rootItems)}
          </tbody>
        </table>
        <div className="cmp-table-footer">
          <div>Showing {(safePage - 1) * perPage + 1} to {Math.min(safePage * perPage, filtered.length)} of {filtered.length} courts</div>
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

      {selected.size > 0 && (
        <div className="cmp-mt8">
          <button className="btn btn--danger btn--sm" onClick={removeBulk}><Icon name="trash" size={14} /> Delete ({selected.size})</button>
        </div>
      )}

      {/* ── Mobile View ── */}
      <div className="cmp-mobile-only">
        <div className="cmp-mobile-stats">
          <div className="cmp-mobile-stat-card">
            <div className="cmp-mobile-stat-row1">
              <div className="cmp-mobile-stat-icon cmp-mobile-stat-icon--total"><Icon name="building" size={16} /></div>
              <span className="cmp-mobile-stat-num">{items.length}</span>
            </div>
            <div className="cmp-mobile-stat-label">Total</div>
          </div>
          <div className="cmp-mobile-stat-card">
            <div className="cmp-mobile-stat-row1">
              <div className="cmp-mobile-stat-icon cmp-mobile-stat-icon--active"><Icon name="check" size={16} /></div>
              <span className="cmp-mobile-stat-num">{items.filter(i => (i.status||'Active').toLowerCase()==='active').length}</span>
            </div>
            <div className="cmp-mobile-stat-label">Active</div>
          </div>
          <div className="cmp-mobile-stat-card">
            <div className="cmp-mobile-stat-row1">
              <div className="cmp-mobile-stat-icon cmp-mobile-stat-icon--inactive"><Icon name="close" size={16} /></div>
              <span className="cmp-mobile-stat-num">{items.filter(i => (i.status||'Active').toLowerCase()!=='active').length}</span>
            </div>
            <div className="cmp-mobile-stat-label">Inactive</div>
          </div>
        </div>

        <div className="cmp-mobile-section-header">
          <span className="cmp-mobile-section-title">All Courts</span>
          <span className="cmp-mobile-section-count">{Math.min(perPage, filtered.length)} of {filtered.length}</span>
          <span className="cmp-mobile-per-page" onClick={() => setPerPage(perPage === 10 ? 20 : perPage === 20 ? 50 : 10)}>
            {perPage} / page <Icon name="chevronDown" size={13} />
          </span>
        </div>

        <div className="cmp-mobile-list">
          {paged.length === 0 ? (
            <div className="cmp-empty">No courts found.</div>
          ) : paged.map(item => (
            <div key={item.id} className="cmp-mobile-card">
              <div className="cmp-mobile-card-row1">
                <span className="cmp-mobile-drag-handle"><Icon name="grip" size={15} /></span>
                <span className="cmp-mobile-avatar"><Icon name="building" size={18} /></span>
                <div className="cmp-mobile-card-info">
                  <div className="cmp-mobile-card-top">
                    <span className="cmp-mobile-card-name">{item.name}</span>
                    <span className={`cmp-status-pill cmp-status-pill--${(item.status || 'Active').toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
                      <span className="cmp-status-dot"></span>{item.status || 'Active'}
                    </span>
                  </div>
                  <span className="cmp-mobile-card-code">{item.short_code || '—'}</span>
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
                  title={item.status === 'Active' ? 'Deactivate' : 'Activate'}
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
    </div>
  );
}