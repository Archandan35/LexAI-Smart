import { useState, useEffect, useRef } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { Input, Textarea, Select } from '@/components/Field.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { jurisdictionLogic } from '@/logic/jurisdictionLogic.js';

const ENTITY_PREFIX = 'JUR';
const PER_PAGE = 10;

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

export default function Jurisdictions() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeAction, setActiveAction] = useState(null);
  const [subMode, setSubMode] = useState('single');
  const [page, setPage] = useState(1);

  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newStatus, setNewStatus] = useState('Active');
  const [newDesc, setNewDesc] = useState('');

  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  const [delId, setDelId] = useState('');

  const [bulkAddText, setBulkAddText] = useState('');
  const [bulkEditText, setBulkEditText] = useState('');
  const [bulkDelSelected, setBulkDelSelected] = useState(new Set());

  const [importFile, setImportFile] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const dragOrder = useRef(null);

  const load = async () => {
    setLoading(true);
    const res = await jurisdictionLogic.list();
    if (Array.isArray(res)) {
      let data = res;
      const allZero = data.every(i => !i.display_order);
      if (allZero) {
        data = data.map((i, idx) => ({ ...i, display_order: idx + 1 }));
        for (const item of data) {
          await jurisdictionLogic.update(item.id, { display_order: item.display_order }).catch(() => {});
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
    setNewName(''); setNewCode(''); setNewStatus('Active'); setNewDesc('');
    setEditId(''); setEditName(''); setEditCode('');
    setDelId(''); setImportFile(null);
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
    const res = await jurisdictionLogic.create({ name: newName, short_code: newCode, status: newStatus, description: newDesc });
    if (res.ok) { setNewName(''); setNewCode(''); setNewStatus('Active'); setNewDesc(''); toast.push('Jurisdiction added.', 'success'); load(); }
    else toast.push(res.error, 'error');
  };

  const autoCode = (name) => {
    const slug = name.trim().replace(/\s+/g, '-').toUpperCase();
    return `${ENTITY_PREFIX}-${slug}`;
  };

  const doBulkAdd = async () => {
    const lines = bulkAddText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.push('Paste at least one entry.', 'error'); return; }
    let added = 0, skipped = 0;
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) {
        const name = line;
        const short_code = autoCode(name);
        const res = await jurisdictionLogic.create({ name, short_code });
        if (res.ok) added++; else skipped++;
      } else {
        const name = line.slice(0, colonIdx).trim();
        const code = line.slice(colonIdx + 1).trim();
        if (!name) { skipped++; continue; }
        const res = await jurisdictionLogic.create({ name, short_code: code.toUpperCase() });
        if (res.ok) added++; else skipped++;
      }
    }
    setBulkAddText('');
    toast.push(`${added} added.${skipped ? ` ${skipped} skipped.` : ''}`, added ? 'success' : 'info');
    load();
  };

  const doEdit = async () => {
    if (!editId) { toast.push('Select a jurisdiction to edit.', 'error'); return; }
    if (!editName.trim() || !editCode.trim()) { toast.push('Name and code cannot be empty.', 'error'); return; }
    const item = items.find(x => x.id === editId);
    const res = await jurisdictionLogic.update(editId, { name: editName, short_code: editCode, description: item?.description, display_order: item?.display_order, status: item?.status });
    if (res.ok) { setEditId(''); toast.push('Jurisdiction updated.', 'success'); load(); }
    else toast.push(res.error, 'error');
  };

  const doBulkEdit = async () => {
    const lines = bulkEditText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.push('Paste at least one entry.', 'error'); return; }
    let updated = 0, skipped = 0;
    for (const line of lines) {
      const [idPart, namePart] = line.split('|').map(s => s.trim());
      const item = items.find(x => x.short_code === idPart || x.name === idPart || x.id === idPart);
      if (!item || !namePart) { skipped++; continue; }
      const [name, code] = namePart.split(':').map(s => s.trim());
      const res = await jurisdictionLogic.update(item.id, { name: name || item.name, short_code: code || item.short_code });
      if (res.ok) updated++; else skipped++;
    }
    setBulkEditText('');
    toast.push(`${updated} updated.${skipped ? ` ${skipped} skipped.` : ''}`, updated ? 'success' : 'info');
    load();
  };

  const doDelete = async () => {
    if (!delId) { toast.push('Select a jurisdiction to delete.', 'error'); return; }
    const item = items.find(x => x.id === delId);
    if (!window.confirm(`Delete jurisdiction "${item?.name}"?`)) return;
    const res = await jurisdictionLogic.remove(delId);
    if (res.ok || !res.error) { setDelId(''); toast.push('Jurisdiction deleted.', 'success'); load(); }
    else toast.push(res.error, 'error');
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
    if (!bulkDelSelected.size) { toast.push('Select at least one jurisdiction.', 'error'); return; }
    if (!window.confirm(`Delete ${bulkDelSelected.size} jurisdiction(s)?`)) return;
    for (const id of bulkDelSelected) await jurisdictionLogic.remove(id);
    const count = bulkDelSelected.size;
    setBulkDelSelected(new Set());
    toast.push(`${count} deleted.`, 'success');
    load();
  };

  const doImport = async () => {
    if (!importFile) { toast.push('Select a CSV file.', 'error'); return; }
    toast.push('CSV import coming soon.', 'info');
  };

  const filtered = items.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.short_code || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

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
    await jurisdictionLogic.reorder(ids);
    load();
  };

  const startEdit = (item) => {
    setActiveAction('edit');
    setSubMode('single');
    setEditId(item.id);
    setEditName(item.name);
    setEditCode(item.short_code || '');
  };

  const startDelete = (item) => {
    setActiveAction('delete');
    setSubMode('single');
    setDelId(item.id);
  };

  if (loading) return <div className="fade-in cmp-loading"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="cmp-hero">
        <div className="cmp-hero-icon"><Icon name="grid" size={30} /></div>
        <div className="cmp-hero-text">
          <h2>Jurisdictions</h2>
          <p>Manage court jurisdictions (Civil, Criminal, Family, etc.).</p>
        </div>
      </div>

      <div className="cmp-toolbar">
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

      {activeAction && (
        <Card className="cmp-form">
          <div className="cmp-form-header">
            <Icon name={ACTIONS.find(a => a.key === activeAction)?.icon || 'file'} size={18} />
            <span>{ACTIONS.find(a => a.key === activeAction)?.label} Jurisdiction</span>
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
            <button className="iconbtn" onClick={reset} title="Close"><Icon name="close" size={18} /></button>
          </div>
          <div className="cmp-form-body">
            {activeAction === 'add' && subMode === 'single' && (
              <div className="cmp-form-grid">
                <div className="cmp-field">
                  <label className="cmp-label">Name <span className="cmp-required">*</span></label>
                  <Input value={newName} placeholder="e.g., Civil" onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && doAdd()} />
                </div>
                <div className="cmp-field">
                  <label className="cmp-label">Short Code <span className="cmp-required">*</span></label>
                  <Input value={newCode} placeholder="e.g., CIV" onChange={e => setNewCode(e.target.value.toUpperCase().slice(0, 6))} onKeyDown={e => e.key === 'Enter' && doAdd()} />
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
                    placeholder={`Civil               → auto: ${ENTITY_PREFIX}-CIVIL\nCivil:CIV            → manual: CIV\nCriminal:CRM\nFamily`}
                    rows={8} />
                  <span className="cmp-hint">Use <code>Name:CODE</code> for manual codes. Without <code>:CODE</code>, code auto-generates as <code>{ENTITY_PREFIX}-NAME-IN-HYPHENS</code>.</span>
                </div>
              </div>
            )}
            {activeAction === 'edit' && subMode === 'single' && (
              <div className="cmp-form-grid">
                <div className="cmp-field cmp-field--full">
                  <label className="cmp-label">Select Jurisdiction <span className="cmp-required">*</span></label>
                  <Select value={editId} onChange={e => { setEditId(e.target.value); const item = items.find(x => x.id === e.target.value); if (item) { setEditName(item.name); setEditCode(item.short_code || ''); } }}>
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
                  </>
                )}
              </div>
            )}
            {activeAction === 'edit' && subMode === 'bulk' && (
              <div className="cmp-form-grid">
                <div className="cmp-field cmp-field--full">
                  <label className="cmp-label">Format: <code>CurrentName|NewName:NEWCODE</code> — one per line</label>
                  <Textarea value={bulkEditText} onChange={e => setBulkEditText(e.target.value)}
                    placeholder={'Civil|Civil Jurisdiction:CJ\nCriminal|Criminal Division:CRD'} rows={8} />
                  <span className="cmp-hint">Match by name, short code, or id before the pipe.</span>
                </div>
              </div>
            )}
            {activeAction === 'delete' && subMode === 'single' && (
              <div className="cmp-form-grid">
                <div className="cmp-field cmp-field--full">
                  <label className="cmp-label">Select Jurisdiction <span className="cmp-required">*</span></label>
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
                  <label className="cmp-label">Select jurisdictions to delete</label>
                  <div className="cmp-checkbox-toolbar">
                    <label className="cmp-checkbox-all">
                      <input type="checkbox" checked={bulkDelSelected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                      <span>Select all {filtered.length}</span>
                    </label>
                    <span className="cmp-checkbox-count">{bulkDelSelected.size} selected</span>
                  </div>
                  <div className="cmp-checkbox-list">
                    {filtered.length === 0 ? (
                      <div className="cmp-empty">No jurisdictions to display.</div>
                    ) : filtered.map(item => (
                      <label key={item.id} className={`cmp-checkbox-row${bulkDelSelected.has(item.id) ? ' checked' : ''}`}>
                        <input type="checkbox" checked={bulkDelSelected.has(item.id)} onChange={() => toggleBulkDel(item.id)} />
                        <span className="cmp-checkbox-name">{item.name}</span>
                        <span className={`badge badge--${(item.status || '').toLowerCase() === 'active' ? 'green' : 'grey'}`}>{item.status}</span>
                      </label>
                    ))}
                  </div>
                  {bulkDelSelected.size > 0 && (
                    <div className="cmp-warning">
                      <Icon name="alert" size={16} />
                      <span>{bulkDelSelected.size} jurisdiction(s) will be permanently deleted.</span>
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
          <div className="cmp-form-footer">
            <Button variant="ghost" onClick={reset}>Cancel</Button>
            {activeAction === 'add' && subMode === 'single' && <Button icon="plus" onClick={doAdd}>Add Jurisdiction</Button>}
            {activeAction === 'add' && subMode === 'bulk' && <Button icon="users" onClick={doBulkAdd}>Add All</Button>}
            {activeAction === 'edit' && subMode === 'single' && <Button icon="check" onClick={doEdit}>Save Changes</Button>}
            {activeAction === 'edit' && subMode === 'bulk' && <Button icon="check" onClick={doBulkEdit}>Save All Changes</Button>}
            {activeAction === 'delete' && subMode === 'single' && <Button variant="danger" icon="trash" onClick={doDelete}>Delete</Button>}
            {activeAction === 'delete' && subMode === 'bulk' && <Button variant="danger" icon="trash" onClick={doBulkDelete}>Delete All Matched</Button>}
            {activeAction === 'import' && <Button icon="upload" onClick={doImport} disabled={!importFile}>Import</Button>}
          </div>
        </Card>
      )}

      <div className="cmp-search-row">
        <div className="cmp-search">
          <Icon name="search" size={18} />
          <input value={search} placeholder="Search jurisdictions…" onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="cmp-stat">
          <div className="cmp-stat-icon"><Icon name="layers" size={20} /></div>
          <div>
            <div className="cmp-stat-label">Total Jurisdictions</div>
            <div className="cmp-stat-value">{items.length}</div>
          </div>
        </div>
      </div>

      {viewItem && (
        <Card className="cmp-detail">
          <div className="cmp-detail-header">
            <span className="cmp-detail-title">{viewItem.name}</span>
            <span className="cmp-detail-code">{viewItem.short_code}</span>
            <span className={`badge badge--${(viewItem.status || '').toLowerCase() === 'active' ? 'green' : 'grey'}`}>{viewItem.status}</span>
            <button className="iconbtn cmp-detail-close" onClick={() => setViewItem(null)}><Icon name="close" size={16} /></button>
          </div>
          <div className="cmp-detail-body">
            <div className="cmp-detail-row">
              <span className="cmp-detail-label">Description</span>
              <span className="cmp-detail-value">{viewItem.description || '—'}</span>
            </div>
            <div className="cmp-detail-row">
              <span className="cmp-detail-label">Display Order</span>
              <span className="cmp-detail-value">{viewItem.display_order ?? '—'}</span>
            </div>
          </div>
        </Card>
      )}

      <div className="cmp-table-card">
        <table className="cmp-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th><span className="cmp-sort">NAME <Icon name="chevrons-up-down" size={12} /></span></th>
              <th><span className="cmp-sort">CODE <Icon name="chevrons-up-down" size={12} /></span></th>
              <th><span className="cmp-sort">STATUS <Icon name="chevrons-up-down" size={12} /></span></th>
              <th style={{ width: 120 }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td className="cmp-empty" colSpan={5}>No jurisdictions found.</td></tr>
            ) : paged.map((item, idx) => (
              <tr key={item.id} draggable={!search}
                onDragStart={(e) => handleDragStart(e, (safePage - 1) * PER_PAGE + idx)}
                onDragOver={(e) => handleDragOver(e, (safePage - 1) * PER_PAGE + idx)}
                onDragEnd={handleDragEnd}
                className={`cmp-row${dragIdx === (safePage - 1) * PER_PAGE + idx ? ' cmp-row--dragging' : ''}`}
              >
                <td className="cmp-drag-cell">
                  <span className="cmp-drag-handle" title="Drag to reorder"><Icon name="grip" size={15} /></span>
                </td>
                <td>
                  <div className="cmp-name-cell">
                    <span className="cmp-name-avatar"><Icon name="users" size={15} /></span>
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
                    <button className="cmp-act-btn" title="View" onClick={() => setViewItem(item)}><Icon name="eye" size={15} /></button>
                    <button className="cmp-act-btn cmp-act-btn--edit" title="Edit" onClick={() => startEdit(item)}><Icon name="edit" size={15} /></button>
                    <button className="cmp-act-btn cmp-act-btn--del" title="Delete" onClick={() => startDelete(item)}><Icon name="trash" size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="cmp-table-footer">
          <div>Showing {(safePage - 1) * PER_PAGE + 1} to {Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length} jurisdictions</div>
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
    </div>
  );
}
