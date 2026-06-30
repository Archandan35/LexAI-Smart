import { useState, useEffect, useRef, Fragment } from 'react';
import Button from '@/components/Button.jsx';
import Card from '@/components/Card.jsx';
import { Input, Select, Textarea } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';
import Modal from '@/components/Modal.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { courtsLogic } from '@/logic/courtsLogic.js';

const STOP_WORDS = new Set(['of', 'and', 'the', 'in', 'at', 'a', 'an', 'for', 'to']);

function slugShortCode(name) {
  const cleaned = String(name || '').trim();
  if (!cleaned) return '';
  const parenMatch = cleaned.match(/\(([^)]+)\)/);
  const parenPart = parenMatch ? parenMatch[1] : '';
  let mainName = cleaned.replace(/\([^)]*\)/g, '').trim();
  const mainWords = mainName.split(/\s+/).filter(Boolean);
  const mainAbbrev = mainWords.filter((w) => !STOP_WORDS.has(w.toLowerCase())).map((w) => w[0].toUpperCase()).join('');
  const parenWords = parenPart.split(/\s+/).filter(Boolean);
  const parenAbbrev = parenWords.filter((w) => !STOP_WORDS.has(w.toLowerCase())).map((w) => w[0].toUpperCase()).join('');
  return (mainAbbrev + parenAbbrev).toUpperCase();
}

export default function Courts() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeAction, setActiveAction] = useState('add');
  const [showFilter, setShowFilter] = useState(false);
  const [moreMenu, setMoreMenu] = useState(null);
  const searchRef = useRef(null);
  const [perPage, setPerPage] = useState(10);

  // Add form
  const [mode, setMode] = useState('single');
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newParent, setNewParent] = useState('');

  // Bulk add
  const [bulkTab, setBulkTab] = useState('text');
  const [bulkText, setBulkText] = useState('');
  const fileInputRef = useRef(null);

  // Import summary
  const [importResult, setImportResult] = useState(null);

  // Edit modal
  const [editModal, setEditModal] = useState(null);

  // Bulk delete
  const [selected, setSelected] = useState(new Set());

  // Drag
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    const res = await courtsLogic.list();
    if (Array.isArray(res)) setItems(res);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!moreMenu) return;
    const handler = (e) => { if (!e.target.closest('.cmp-act-more-wrap')) setMoreMenu(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreMenu]);

  // Single add
  const add = async () => {
    if (!newName.trim()) { toast.push('Name is required.', 'error'); return; }
    const order = items.reduce((m, i) => Math.max(m, i.display_order ?? 0), 0) + 1;
    const res = await courtsLogic.create({ name: newName, short_code: newCode, parent_id: newParent || null, display_order: order });
    if (res.ok) { setNewName(''); setNewCode(''); setNewParent(''); toast.push('Court added.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  // Bulk add
  const addBulk = async () => {
    let result;
    setImportResult(null);

    if (bulkTab === 'text') {
      if (!bulkText.trim()) { toast.push('Paste at least one court name.', 'error'); return; }
      result = await courtsLogic.importText(bulkText);
    } else if (bulkTab === 'csv') {
      if (!bulkText.trim()) { toast.push('Paste CSV data.', 'error'); return; }
      result = await courtsLogic.importCSV(bulkText);
    } else if (bulkTab === 'json') {
      if (!bulkText.trim()) { toast.push('Paste JSON data.', 'error'); return; }
      result = await courtsLogic.importJSON(bulkText);
    }

    if (result?.ok) {
      setBulkText('');
      setImportResult(result.data);
      toast.push(`${result.data.imported.length} court(s) imported.`, 'success');
      await load();
    } else {
      toast.push(result?.error || 'Import failed.', 'error');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    let text;
    try { text = await file.text(); } catch { toast.push('Failed to read file.', 'error'); return; }
    setBulkText(text);
    if (ext === 'csv') setBulkTab('csv');
    else if (ext === 'json') setBulkTab('json');
    else setBulkTab('text');
    e.target.value = '';
  };

  // Edit modal
  const startEdit = (item) => {
    setEditModal({
      id: item.id,
      name: item.name,
      short_code: item.short_code || '',
      parent_id: item.parent_id || '',
      preview: item.short_code || slugShortCode(item.name),
    });
  };

  const saveEdit = async () => {
    const m = editModal;
    if (!m) return;
    if (!m.name.trim()) { toast.push('Name cannot be empty.', 'error'); return; }
    const item = items.find((i) => i.id === m.id);
    const res = await courtsLogic.update(m.id, { name: m.name, short_code: m.short_code, parent_id: m.parent_id || null, display_order: item?.display_order, status: item?.status });
    if (res.ok) { setEditModal(null); toast.push('Court updated.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const handleEditPicker = (id) => {
    if (!id) { setEditModal(null); return; }
    const item = items.find((i) => i.id === id);
    if (item) startEdit(item);
  };

  // Delete single
  const confirmDeleteItem = (item) => { remove(item); };
  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    const res = await courtsLogic.remove(item.id);
    if (res.ok) { toast.push('Court deleted.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  // Bulk delete
  const removeBulk = async () => {
    if (!selected.size) return;
    if (!window.confirm(`Delete ${selected.size} court(s)?`)) return;
    const res = await courtsLogic.bulkRemove([...selected]);
    if (res.ok) {
      setSelected(new Set());
      toast.push(`${res.data?.deleted || selected.size} court(s) deleted.`, 'success');
      await load();
    } else { toast.push(res.error, 'error'); }
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

  // Duplicate
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
  );

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
            <td className="courts__cell courts__cell--checkbox">
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => handleSelect(item.id)}
                onClick={stopRowDnD}
              />
            </td>
            <td style={{ paddingLeft: 16 + depth * 24 }}>
              <span className="courts__name">{item.name}</span>
            </td>
            <td>
              <code className="courts__code">{item.short_code || '—'}</code>
            </td>
            <td>
              <span className="muted">
                {item.parent_id ? `Child of ${items.find((i) => i.id === item.parent_id)?.name || '—'}` : 'Root level'}
              </span>
            </td>
            <td><span className={`badge badge--${item.status === 'Active' ? 'green' : 'grey'}`}>{item.status}</span></td>
            <td>
              <div className="cmp-actions">
                <button className="cmp-act-btn cmp-act-btn--edit" title="Edit" onClick={() => startEdit(item)}><Icon name="edit" size={15} /></button>
                <button className="cmp-act-btn cmp-act-btn--del" title="Delete" onClick={() => confirmDeleteItem(item)}><Icon name="trash" size={15} /></button>
                <div className="cmp-act-more-wrap">
                  <button className="cmp-act-btn cmp-act-btn--more" title="More" onClick={() => setMoreMenu(moreMenu === item.id ? null : item.id)}><Icon name="more-horizontal" size={15} /></button>
                  {moreMenu === item.id && (
                    <div className="cmp-act-dropdown">
                      <button className="cmp-act-dropdown-item" onClick={() => { setMoreMenu(null); duplicate(item); }}>
                        <Icon name="copy" size={14} /> Duplicate
                      </button>
                    </div>
                  )}
                </div>
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
          <Button
            icon="plus"
            variant={activeAction === 'add' ? 'primary' : 'ghost'}
            onClick={() => { setActiveAction('add'); setShowFilter(true); setMode('single'); }}
          >
            Add
          </Button>
          <Button
            icon="upload"
            variant={activeAction === 'bulk' ? 'primary' : 'ghost'}
            onClick={() => { setActiveAction('bulk'); setShowFilter(true); setMode('bulk'); setBulkText(''); setBulkTab('text'); }}
          >
            Bulk Add
          </Button>
          <Button
            icon="edit"
            variant={activeAction === 'edit' ? 'primary' : 'ghost'}
            onClick={() => { setActiveAction('edit'); setEditModal({ id: '', name: '', short_code: '', parent_id: '', preview: '' }); }}
          >
            Edit
          </Button>
          <Button
            icon="trash"
            variant={activeAction === 'delete' ? 'danger-outline' : 'ghost'}
            onClick={() => { setActiveAction(activeAction === 'delete' ? 'add' : 'delete'); }}
            className={activeAction === 'delete' ? 'cmp-btn-danger-outline' : ''}
          >
            Delete
          </Button>
        </div>
        <div className="cmp-toolbar-right">
          <button className={`cmp-tb-filter${showFilter ? ' active' : ''}`} onClick={() => { setShowFilter(!showFilter); searchRef.current?.focus(); }}>
            <Icon name="filter" size={16} /><span>Filter</span>
          </button>
        </div>
      </div>

      {/* Form Card */}
      {showFilter && (mode === 'single' ? (
        <Card title="Add Court" className="courts__add-card">
          <div className="courts__add-row">
            <div className="courts__input-wrap">
              <Input value={newName} placeholder="Court name…" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
            </div>
            <div className="courts__code-wrap">
              <Input value={newCode} placeholder="Shortcode (optional)" onChange={(e) => setNewCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
            </div>
            <Select value={newParent} onChange={(e) => setNewParent(e.target.value)} options={[{ value: '', label: '— Root —' }, ...liveOptions(null)]} className="courts__parent-select" />
            <button className="btn btn--primary" onClick={add}><Icon name="plus" size={15} /> Add</button>
          </div>
        </Card>
      ) : (
        <Card title="Bulk Add Courts" className="courts__add-card">
          <div className="courts__bulk-tabs">
            <button className={`courts__bulk-tab ${bulkTab === 'text' ? 'courts__bulk-tab--active' : ''}`} onClick={() => setBulkTab('text')}>Text</button>
            <button className={`courts__bulk-tab ${bulkTab === 'csv' ? 'courts__bulk-tab--active' : ''}`} onClick={() => setBulkTab('csv')}>CSV</button>
            <button className={`courts__bulk-tab ${bulkTab === 'json' ? 'courts__bulk-tab--active' : ''}`} onClick={() => setBulkTab('json')}>JSON</button>
            <div className="courts__bulk-spacer" />
            <button className="btn btn--ghost btn--sm" onClick={() => { setMode('single'); setActiveAction('add'); }}>Single Add</button>
          </div>

          {bulkTab === 'text' && (
            <p className="courts__bulk-hint">One court name per line. Shortcodes are auto-generated.</p>
          )}
          {bulkTab === 'csv' && (
            <p className="courts__bulk-hint">Format: <code>Name, Shortcode, Parent Name</code> — one per line. Shortcode and Parent are optional.</p>
          )}
          {bulkTab === 'json' && (
            <p className="courts__bulk-hint">JSON array of objects: <code>{`{"name": "...", "short_code": "...", "parent_name": "..."}`}</code></p>
          )}

          <div className="courts__bulk-upload-row">
            <Textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={
                bulkTab === 'text'
                  ? `Supreme Court of India\nHigh Court of Orissa\nDistrict Judge, Cuttack\nCivil Judge (Senior Division), Athgarh`
                  : bulkTab === 'csv'
                    ? `Supreme Court of India, SCI,\nHigh Court of Orissa, HCO,\nDistrict Judge, DJ, High Court of Orissa`
                    : `[\n  {"name": "Supreme Court of India", "short_code": "SCI"},\n  {"name": "High Court of Orissa", "short_code": "HCO"}\n]`
              }
              rows={6}
              className="courts__bulk-textarea"
            />
            <div className="courts__bulk-actions">
              <button className="btn btn--primary" onClick={addBulk}><Icon name="plus" size={15} /> Import All</button>
              <button className="btn btn--ghost" onClick={() => fileInputRef.current?.click()}>
                <Icon name="upload" size={15} /> Upload File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.txt"
                className="visually-hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </Card>
      ))}

      {/* Standalone Search */}
      <div className="cmp-search">
        <Icon name="search" size={18} />
        <input ref={searchRef} value={search} placeholder="Search hierarchy…" autoComplete="off" onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table Card */}
      <div className="cmp-table-card">
        <table className="cmp-table">
          <thead>
            <tr>
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
              <tr><td className="cmp-empty" colSpan={6}>No courts defined.</td></tr>
            ) : renderTree(rootItems)}
          </tbody>
        </table>
        <div className="cmp-table-footer">
          <div>Showing all {filtered.length} records</div>
          <span className="cmp-ft-perpage" title="Change per page" onClick={() => setPerPage(perPage === 10 ? 20 : perPage === 20 ? 50 : 10)}>
            {perPage} / page <Icon name="chevronDown" size={13} />
          </span>
        </div>
      </div>

      {selected.size > 0 && (
        <div style={{ marginTop: 8 }}>
          <button className="btn btn--danger btn--sm" onClick={removeBulk}><Icon name="trash" size={14} /> Delete ({selected.size})</button>
        </div>
      )}

      {/* Import Summary Modal */}
      <Modal
        open={!!importResult}
        onClose={() => setImportResult(null)}
        title="Import Summary"
        size="lg"
        footer={
          <button className="btn btn--primary" onClick={() => setImportResult(null)}>Done</button>
        }
      >
        {importResult && (
          <div className="courts__import-summary">
            <div className="courts__import-stats">
              <div className="courts__import-stat courts__import-stat--ok">
                <strong>{importResult.imported.length}</strong> Imported
              </div>
              <div className="courts__import-stat courts__import-stat--skip">
                <strong>{importResult.skipped.length}</strong> Skipped (duplicates)
              </div>
              <div className="courts__import-stat courts__import-stat--fail">
                <strong>{importResult.failed.length}</strong> Failed
              </div>
            </div>

            {importResult.imported.length > 0 && (
              <>
                <h4 className="courts__import-heading">Imported Courts</h4>
                <ul className="courts__import-list">
                  {importResult.imported.map((c, i) => (
                    <li key={i} className="courts__import-item courts__import-item--ok">
                      <Icon name="check" size={13} /> {c.name} <code>{c.short_code}</code>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {importResult.skipped.length > 0 && (
              <>
                <h4 className="courts__import-heading">Skipped (Duplicates)</h4>
                <ul className="courts__import-list">
                  {importResult.skipped.map((s, i) => (
                    <li key={i} className="courts__import-item courts__import-item--skip">
                      <Icon name="close" size={13} /> {s.name} — {s.error}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {importResult.failed.length > 0 && (
              <>
                <h4 className="courts__import-heading">Failed</h4>
                <ul className="courts__import-list">
                  {importResult.failed.map((f, i) => (
                    <li key={i} className="courts__import-item courts__import-item--fail">
                      <Icon name="alert-circle" size={13} /> {f.record?.name || 'Unknown'} — {f.error}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title={editModal?.id ? `Edit Court: ${editModal.name}` : 'Edit Court'}
        footer={
          editModal?.id ? (
            <>
              <button className="btn btn--ghost" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={saveEdit}><Icon name="check" size={15} /> Save</button>
            </>
          ) : (
            <button className="btn btn--ghost" onClick={() => setEditModal(null)}>Cancel</button>
          )
        }
      >
        {editModal && !editModal.id && (
          <div className="courts__edit-modal">
            <div className="flex-col gap-8">
              <div className="flex-col gap-4">
                <label className="field-label">Select Court</label>
                <Select
                  value=""
                  onChange={(e) => handleEditPicker(e.target.value)}
                  options={[{ value: '', label: '— Choose a court —' }, ...liveOptions(null)]}
                />
              </div>
            </div>
          </div>
        )}
        {editModal && editModal.id && (
          <div className="courts__edit-modal">
            <div className="flex-col gap-8">
              <div className="flex-col gap-4">
                <label className="field-label">Name</label>
                <Input
                  value={editModal.name}
                  autoFocus
                  onChange={(e) => setEditModal({ ...editModal, name: e.target.value, preview: slugShortCode(e.target.value) || editModal.short_code })}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                />
              </div>
              <div className="flex-col gap-4">
                <label className="field-label">Short Code <span className="muted">(leave empty to auto-generate)</span></label>
                <Input
                  value={editModal.short_code}
                  onChange={(e) => setEditModal({ ...editModal, short_code: e.target.value })}
                  placeholder={editModal.preview || 'Auto'}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                />
                {!editModal.short_code && editModal.preview && (
                  <span className="courts__preview-hint">Will be generated as: <strong>{editModal.preview}</strong></span>
                )}
              </div>
              <div className="flex-col gap-4">
                <label className="field-label">Parent Court</label>
                <Select
                  value={editModal.parent_id}
                  onChange={(e) => setEditModal({ ...editModal, parent_id: e.target.value })}
                  options={[{ value: '', label: '— No parent —' }, ...liveOptions(editModal.id)]}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
