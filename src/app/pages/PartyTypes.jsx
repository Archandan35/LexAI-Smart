import { useState, useCallback, useRef, useEffect } from 'react';
import { usePartyTypes } from '@/hooks/usePartyTypes.js';
import { partyTypeLogic } from '@/logic/partyTypeLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { Input, Textarea, Select } from '@/components/Field.jsx';

const ENTITY_PREFIX = 'PT';
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

export default function PartyTypes() {
  const { partyTypes, loading, refresh } = usePartyTypes();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [activeAction, setActiveAction] = useState(null);
  const [subMode, setSubMode] = useState('single');
  const [page, setPage] = useState(1);

  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [bulkAddText, setBulkAddText] = useState('');

  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  const [delId, setDelId] = useState('');

  const [bulkEditText, setBulkEditText] = useState('');
  const [selected, setSelected] = useState(new Set());

  const [importFile, setImportFile] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const dragOrder = useRef(null);

  const reset = () => {
    setActiveAction(null);
    setSubMode('single');
    setNewName(''); setNewCode('');
    setEditId(''); setEditName(''); setEditCode('');
    setDelId(''); setImportFile(null);
    setBulkAddText(''); setBulkEditText('');
    if (activeAction !== 'delete' || subMode !== 'bulk') setSelected(new Set());
    setPage(1);
  };

  const activate = (key) => {
    if (activeAction === key) { reset(); return; }
    setActiveAction(key);
    setSubMode('single');
  };

  const doAdd = async () => {
    try {
      if (!newName.trim() || !newCode.trim()) { toast.push('Name and code are required.', 'error'); return; }
      const res = await partyTypeLogic.create({ name: newName, short_code: newCode });
      if (res.ok) { setNewName(''); setNewCode(''); toast.push('Party type added.', 'success'); await refresh(); }
      else toast.push(res.error, 'error');
    } catch (err) { toast.push(err?.message || 'Failed to create party type.', 'error'); }
  };

  const autoCode = (name) => {
    const slug = name.trim().replace(/\s+/g, '-').toUpperCase();
    return `${ENTITY_PREFIX}-${slug}`;
  };

  const doBulkAdd = async () => {
    try {
      const lines = bulkAddText.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) { toast.push('Paste at least one entry.', 'error'); return; }
      let added = 0, skipped = 0;
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) {
          const name = line;
          const short_code = autoCode(name);
          const res = await partyTypeLogic.create({ name, short_code });
          if (res.ok) added++; else skipped++;
        } else {
          const name = line.slice(0, colonIdx).trim();
          const code = line.slice(colonIdx + 1).trim();
          if (!name) { skipped++; continue; }
          const res = await partyTypeLogic.create({ name, short_code: code.toUpperCase() });
          if (res.ok) added++; else skipped++;
        }
      }
      setBulkAddText('');
      toast.push(`${added} added.${skipped ? ` ${skipped} skipped.` : ''}`, added ? 'success' : 'info');
      await refresh();
    } catch (err) { toast.push(err?.message || 'Bulk add failed.', 'error'); }
  };

  const doEdit = async () => {
    try {
      if (!editId) { toast.push('Select a party type to edit.', 'error'); return; }
      if (!editName.trim() || !editCode.trim()) { toast.push('Name and code cannot be empty.', 'error'); return; }
      const res = await partyTypeLogic.update(editId, { name: editName, short_code: editCode });
      if (res.ok) { setEditId(''); toast.push('Party type updated.', 'success'); await refresh(); }
      else toast.push(res.error, 'error');
    } catch (err) { toast.push(err?.message || 'Failed to update party type.', 'error'); }
  };

  const doBulkEdit = async () => {
    try {
      const lines = bulkEditText.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) { toast.push('Paste at least one entry.', 'error'); return; }
      let updated = 0, skipped = 0;
      for (const line of lines) {
        const [idPart, namePart] = line.split('|').map(s => s.trim());
        const item = partyTypes.find(x => x.short_code === idPart || x.name === idPart || x.id === idPart);
        if (!item || !namePart) { skipped++; continue; }
        const [name, code] = namePart.split(':').map(s => s.trim());
        const res = await partyTypeLogic.update(item.id, { name: name || item.name, short_code: code || item.short_code });
        if (res.ok) updated++; else skipped++;
      }
      setBulkEditText('');
      toast.push(`${updated} updated.${skipped ? ` ${skipped} skipped.` : ''}`, updated ? 'success' : 'info');
      await refresh();
    } catch (err) { toast.push(err?.message || 'Bulk edit failed.', 'error'); }
  };

  const doDelete = async () => {
    try {
      if (!delId) { toast.push('Select a party type to delete.', 'error'); return; }
      const item = partyTypes.find(x => x.id === delId);
      if (!window.confirm(`Delete party type "${item?.name}"?`)) return;
      const res = await partyTypeLogic.remove(delId);
      if (res.ok || !res.error) { setDelId(''); toast.push('Party type deleted.', 'success'); await refresh(); }
      else toast.push(res.error, 'error');
    } catch (err) { toast.push(err?.message || 'Failed to delete party type.', 'error'); }
  };

  const toggleBulkDel = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(i => i.id)));
    }
  };

  const doBulkDelete = async () => {
    try {
      if (!selected.size) { toast.push('Select at least one party type.', 'error'); return; }
      if (!window.confirm(`Delete ${selected.size} party type(s)?`)) return;
      const res = await partyTypeLogic.bulkRemove([...selected]);
      if (res.ok || !res.error) { setSelected(new Set()); toast.push(`${selected.size} party type(s) deleted.`, 'success'); await refresh(); }
      else toast.push(res.error, 'error');
    } catch (err) { toast.push(err?.message || 'Bulk delete failed.', 'error'); }
  };

  const doImport = async () => {
    if (!importFile) { toast.push('Select a CSV file.', 'error'); return; }
    toast.push('CSV import coming soon.', 'info');
  };

  const handleToggle = useCallback(async (type) => {
    try {
      const newStatus = type.status === 'Active' ? 'Inactive' : 'Active';
      const res = await partyTypeLogic.setStatus(type.id, newStatus);
      if (res.ok) { toast.push(`Party type ${newStatus === 'Active' ? 'enabled' : 'disabled'}.`, 'success'); await refresh(); }
      else toast.push(res.error, 'error');
    } catch (err) { toast.push(err?.message || 'Failed to toggle status.', 'error'); }
  }, [refresh, toast]);

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

  const filtered = partyTypes.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.short_code || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const handleDragStart = useCallback((e, idx) => {
    setDragIdx(idx);
    dragOrder.current = filtered.map((t) => t.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', filtered[idx]?.id);
  }, [filtered]);

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx || !dragOrder.current || search) return;
    const ids = [...dragOrder.current];
    const [moved] = ids.splice(dragIdx, 1);
    ids.splice(idx, 0, moved);
    dragOrder.current = ids;
    setDragIdx(idx);
  }, [dragIdx, search]);

  const handleDragEnd = useCallback(async () => {
    if (dragIdx === null || !dragOrder.current) { setDragIdx(null); return; }
    const ids = dragOrder.current;
    setDragIdx(null);
    dragOrder.current = null;
    const res = await partyTypeLogic.reorder(ids);
    if (res.ok) { toast.push('Order updated.', 'success'); await refresh(); }
    else toast.push(res.error, 'error');
  }, [dragIdx, refresh, toast]);

  if (loading) return <div className="fade-in cmp-loading"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="cmp-hero">
        <div className="cmp-hero-icon"><Icon name="users" size={30} /></div>
        <div className="cmp-hero-text">
          <h2>Party Types</h2>
          <p>Manage party types used in case forms and filters.</p>
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
        <div className="cmp-form">
          <div className="cmp-form-header">
            <span className="cmp-form-header-icon"><Icon name={ACTIONS.find(a => a.key === activeAction)?.icon || 'file'} size={18} /></span>
            <span className="cmp-form-header-title">{ACTIONS.find(a => a.key === activeAction)?.label} Party Type</span>
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
            <button className="cmp-form-close" onClick={reset} title="Close"><Icon name="close" size={18} /></button>
          </div>
          <div className="cmp-form-body">
            {activeAction === 'add' && subMode === 'single' && (
              <div className="cmp-form-grid">
                <div className="cmp-field--full">
                  <label className="cmp-label">Name <span className="cmp-required">*</span></label>
                  <Input value={newName} placeholder="e.g., Plaintiff" onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && doAdd()} />
                </div>
                <div className="cmp-field--full">
                  <label className="cmp-label">Short Code <span className="cmp-required">*</span></label>
                  <Input value={newCode} placeholder="e.g., PL" onChange={e => setNewCode(e.target.value.toUpperCase().slice(0, 6))} onKeyDown={e => e.key === 'Enter' && doAdd()} />
                </div>
              </div>
            )}
            {activeAction === 'add' && subMode === 'bulk' && (
              <div className="cmp-form-grid">
                <div className="cmp-field--full">
                  <label className="cmp-label">Paste entries — one per line</label>
                  <Textarea value={bulkAddText} onChange={e => setBulkAddText(e.target.value)}
                    placeholder={`Plaintiff          → auto: ${ENTITY_PREFIX}-PLAINTIFF\nPlaintiff:PL       → manual: PL\nDefendant:DEF\nAppellant`}
                    rows={8} />
                  <span className="cmp-hint">Use <code>Name:CODE</code> for manual codes. Without <code>:CODE</code>, code auto-generates as <code>{ENTITY_PREFIX}-NAME-IN-HYPHENS</code>.</span>
                </div>
              </div>
            )}
            {activeAction === 'edit' && subMode === 'single' && (
              <div className="cmp-form-grid">
                <div className="cmp-field--full">
                  <label className="cmp-label">Select Party Type <span className="cmp-required">*</span></label>
                  <Select value={editId} onChange={e => { setEditId(e.target.value); const item = partyTypes.find(x => x.id === e.target.value); if (item) { setEditName(item.name); setEditCode(item.short_code || ''); } }}>
                    <option value="">— choose —</option>
                    {partyTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </Select>
                </div>
                {editId && (
                  <>
                    <div className="cmp-field--full">
                      <label className="cmp-label">Name <span className="cmp-required">*</span></label>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>
                    <div className="cmp-field--full">
                      <label className="cmp-label">Short Code <span className="cmp-required">*</span></label>
                      <Input value={editCode} onChange={e => setEditCode(e.target.value.toUpperCase().slice(0, 6))} />
                    </div>
                  </>
                )}
              </div>
            )}
            {activeAction === 'edit' && subMode === 'bulk' && (
              <div className="cmp-form-grid">
                <div className="cmp-field--full">
                  <label className="cmp-label">Format: <code>CurrentName|NewName:NEWCODE</code> — one per line</label>
                  <Textarea value={bulkEditText} onChange={e => setBulkEditText(e.target.value)}
                    placeholder={'Plaintiff|Claimant:CL\nDefendant|Respondent:RES'} rows={8} />
                  <span className="cmp-hint">Match by name, short code, or id before the pipe.</span>
                </div>
              </div>
            )}
            {activeAction === 'delete' && subMode === 'single' && (
              <div className="cmp-form-grid">
                <div className="cmp-field--full">
                  <label className="cmp-label">Select Party Type <span className="cmp-required">*</span></label>
                  <Select value={delId} onChange={e => setDelId(e.target.value)}>
                    <option value="">— choose —</option>
                    {partyTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
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
                <div className="cmp-field--full">
                  <label className="cmp-label">Select party types to delete</label>
                  <div className="cmp-checkbox-toolbar">
                    <label className="cmp-checkbox-all">
                      <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                      <span>Select all {filtered.length}</span>
                    </label>
                    <span className="cmp-checkbox-count">{selected.size} selected</span>
                  </div>
                  <div className="cmp-checkbox-list">
                    {filtered.length === 0 ? (
                      <div className="cmp-checkbox-empty">No party types to display.</div>
                    ) : filtered.map(item => (
                      <label key={item.id} className={`cmp-checkbox-row${selected.has(item.id) ? ' checked' : ''}`}>
                        <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleBulkDel(item.id)} />
                        <span className="cmp-checkbox-name">{item.name}</span>
                        <span className="cmp-checkbox-code">{item.short_code}</span>
                      </label>
                    ))}
                  </div>
                  {selected.size > 0 && (
                    <div className="cmp-warning">
                      <Icon name="alert" size={16} />
                      <span>{selected.size} party type(s) will be permanently deleted.</span>
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
            {activeAction === 'add' && subMode === 'single' && <Button icon="plus" onClick={doAdd}>Add Party Type</Button>}
            {activeAction === 'add' && subMode === 'bulk' && <Button icon="users" onClick={doBulkAdd}>Add All</Button>}
            {activeAction === 'edit' && subMode === 'single' && <Button icon="check" onClick={doEdit}>Save Changes</Button>}
            {activeAction === 'edit' && subMode === 'bulk' && <Button icon="check" onClick={doBulkEdit}>Save All Changes</Button>}
            {activeAction === 'delete' && subMode === 'single' && <Button variant="danger" icon="trash" onClick={doDelete}>Delete</Button>}
            {activeAction === 'delete' && subMode === 'bulk' && <Button variant="danger" icon="trash" onClick={doBulkDelete}>Delete All Matched</Button>}
            {activeAction === 'import' && <Button icon="upload" onClick={doImport} disabled={!importFile}>Import</Button>}
          </div>
        </div>
      )}

      <div className="cmp-search-row">
        <div className="cmp-search">
          <Icon name="search" size={18} />
          <input value={search} placeholder="Search party types…" onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="cmp-stat">
          <div className="cmp-stat-icon"><Icon name="users" size={20} /></div>
          <div>
            <div className="cmp-stat-label">Total Party Types</div>
            <div className="cmp-stat-value">{partyTypes.length}</div>
          </div>
        </div>
      </div>

      {viewItem && (
        <div className="cmp-detail">
          <div className="cmp-detail-header">
            <span className="cmp-detail-title">{viewItem.name}</span>
            <span className="cmp-detail-code">{viewItem.short_code}</span>
            <span className={`cmp-status-pill cmp-status-pill--${(viewItem.status || '').toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
              <span className="cmp-status-dot"></span>
              {viewItem.status || 'Active'}
            </span>
            <button className="cmp-detail-close" onClick={() => setViewItem(null)}><Icon name="close" size={16} /></button>
          </div>
          <div className="cmp-detail-body">
            <div className="cmp-detail-row">
              <span className="cmp-detail-label">Code</span>
              <span className="cmp-detail-value">{viewItem.short_code}</span>
            </div>
            <div className="cmp-detail-row">
              <span className="cmp-detail-label">Display Order</span>
              <span className="cmp-detail-value">{viewItem.display_order ?? '—'}</span>
            </div>
          </div>
        </div>
      )}

      <table className="cmp-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}></th>
            <th style={{ width: 32 }}></th>
            <th><span>NAME</span></th>
            <th><span>CODE</span></th>
            <th><span>ORDER</span></th>
            <th><span>STATUS</span></th>
            <th style={{ width: 130 }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {paged.length === 0 ? (
            <tr><td className="cmp-empty" colSpan={7}>No party types found.</td></tr>
          ) : paged.map((item, idx) => (
            <tr key={item.id}
              draggable={!search}
              onDragStart={(e) => handleDragStart(e, (safePage - 1) * PER_PAGE + idx)}
              onDragOver={(e) => handleDragOver(e, (safePage - 1) * PER_PAGE + idx)}
              onDragEnd={handleDragEnd}
              className={`cmp-row${dragIdx === (safePage - 1) * PER_PAGE + idx ? ' cmp-row--dragging' : ''}`}
            >
              <td className="cmp-drag-cell">
                <input type="checkbox" checked={selected.has(item.id)}
                  onChange={() => {
                    if (activeAction === 'delete' && subMode === 'bulk') toggleBulkDel(item.id);
                    else {
                      setSelected(prev => {
                        const next = new Set(prev);
                        if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                        return next;
                      });
                    }
                  }} />
              </td>
              <td className="cmp-drag-cell">
                <span className="cmp-drag-handle" title="Drag to reorder">
                  <Icon name="grip" size={15} />
                </span>
              </td>
              <td>
                <div className="cmp-name-cell">
                  <span className="cmp-name-avatar"><Icon name="users" size={15} /></span>
                  <span className="cmp-cell-name">{item.name}</span>
                </div>
              </td>
              <td><span className="cmp-code-pill">{item.short_code}</span></td>
              <td><span className="cmp-cell-desc">{item.display_order ?? '—'}</span></td>
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
                  <button className="cmp-act-btn" title="Toggle status" onClick={() => handleToggle(item)}>
                    {item.status === 'Active' ? <Icon name="check" size={15} /> : <Icon name="play" size={13} />}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="cmp-table-footer">
        <div>Showing {(safePage - 1) * PER_PAGE + 1} to {Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length} party types</div>
        {totalPages > 1 && (
          <div className="cmp-pagination">
            <button className="cmp-page-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}><Icon name="chevron-left" size={14} /></button>
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

      {!search && <div className="cmp-footer">Drag rows to reorder. Order applies to every case form.</div>}
    </div>
  );
}
