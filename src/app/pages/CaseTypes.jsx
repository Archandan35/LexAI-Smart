import React, { useState, useCallback, useRef } from 'react';
import { useCaseTypes } from '@/hooks/useCaseTypes.js';
import { caseTypeLogic } from '@/logic/caseTypeLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { Input, Textarea } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';
import DebugPanel, { useLogCapture } from '@/components/DebugPanel.jsx';

function CaseTypeRow({ type, editId, editName, editCode, onEditNameChange, onEditCodeChange, onSaveEdit, onCancelEdit, onDelete, onToggle, onSelect, selected, search, dragHandlers, dragRef, isDragging, onStartEdit }) {
  const isEditing = editId === type.id;
  return (
    <tr
      className={`case-types__row ${isDragging ? 'case-types__row--dragging' : ''}`}
      draggable={!search}
      onDragStart={dragHandlers.handleDragStart}
      onDragOver={dragHandlers.handleDragOver}
      onDragEnd={dragHandlers.handleDragEnd}
      ref={dragRef}
    >
      <td className="case-types__cell case-types__cell--drag" style={{ width: 30 }}>
        <input type="checkbox" checked={selected.has(type.id)} onChange={() => onSelect(type.id)} />
      </td>
      <td className="case-types__cell case-types__cell--drag" style={{ width: 30, cursor: search ? 'default' : 'grab' }}>
        <span className="case-types__drag-handle">⠿</span>
      </td>
      <td className="case-types__cell">
        {isEditing ? (
          <Input value={editName} autoFocus onChange={(e) => onEditNameChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSaveEdit()} />
        ) : (
          <span style={{ fontWeight: 600 }}>{type.name}</span>
        )}
      </td>
      <td className="case-types__cell">
        {isEditing ? (
          <Input value={editCode} onChange={(e) => onEditCodeChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSaveEdit()} />
        ) : (
          <code className="case-types__code">{type.short_code}</code>
        )}
      </td>
      <td className="case-types__cell">{type.display_order}</td>
      <td className="case-types__cell">
        <span className={`case-types__status case-types__status--${(type.status || 'Active').toLowerCase()}`}>
          {type.status || 'Active'}
        </span>
      </td>
      <td className="case-types__cell case-types__cell--actions">
        <div className="row-actions">
          {isEditing ? (
            <>
              <button className="iconbtn" title="Save" onClick={onSaveEdit}><Icon name="check" size={15} /></button>
              <button className="iconbtn" title="Cancel" onClick={onCancelEdit}><Icon name="close" size={15} /></button>
            </>
          ) : (
            <>
              <button className="iconbtn" title="Edit" onClick={() => onStartEdit(type)}><Icon name="edit" size={15} /></button>
              <button className="iconbtn" title="Toggle status" onClick={() => onToggle(type)}>
                {type.status === 'Active' ? <Icon name="check" size={15} /> : <span style={{ fontSize: 15 }}>▶</span>}
              </button>
              <button className="iconbtn iconbtn--danger" title="Delete" onClick={() => onDelete(type)}><Icon name="trash" size={15} /></button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function CaseTypes() {
  const { caseTypes, loading, refresh } = useCaseTypes();
  const toast = useToast();
  const { logs, clearLogs, copyLogs } = useLogCapture();
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('single');
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [dragIdx, setDragIdx] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const dragNode = useRef(null);
  const [lastError, setLastError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const filtered = caseTypes.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.short_code.toLowerCase().includes(search.toLowerCase())
  );

  const add = async () => {
    try {
      if (!newName.trim() || !newCode.trim()) { toast.push('Name and short code are required.', 'error'); return; }
      console.log('Creating case type:', { name: newName, short_code: newCode });
      const res = await caseTypeLogic.create({ name: newName, short_code: newCode });
      console.log('Create result:', res);
      if (res.ok) { setNewName(''); setNewCode(''); toast.push('Case type added.', 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { console.error('Create exception:', err); setLastError(err?.message || String(err)); toast.push(err?.message || 'Failed to create case type.', 'error'); }
  };

  const addBulk = async () => {
    try {
      const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) { toast.push('Paste at least one case type (name, code per line).', 'error'); return; }
      const records = lines.map((line) => {
        const parts = line.split(',').map((s) => s.trim());
        const name = parts[0];
        const code = parts[1] || name.slice(0, 6).toUpperCase();
        return { name, short_code: code };
      }).filter((r) => r.name);
      console.log('Bulk creating case types:', records);
      const res = await caseTypeLogic.bulkCreate(records);
      console.log('Bulk create result:', res);
      setBulkText('');
      if (res.ok) { toast.push(`${res.data.count} case type(s) added.`, 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { console.error('Bulk create exception:', err); setLastError(err?.message || String(err)); toast.push(err?.message || 'Bulk add failed.', 'error'); }
  };

  const saveEdit = async () => {
    try {
      if (!editName.trim() || !editCode.trim()) { toast.push('Name and code cannot be empty.', 'error'); return; }
      const type = caseTypes.find((t) => t.id === editId);
      if (!type) return;
      console.log('Updating case type:', { id: editId, name: editName, short_code: editCode });
      const res = await caseTypeLogic.update(editId, { name: editName, short_code: editCode, display_order: type.display_order, status: type.status });
      console.log('Update result:', res);
      if (res.ok) { setEditId(null); toast.push('Case type updated.', 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { console.error('Update exception:', err); setLastError(err?.message || String(err)); toast.push(err?.message || 'Failed to update case type.', 'error'); }
  };

  const handleToggle = useCallback(async (type) => {
    try {
      const newStatus = type.status === 'Active' ? 'Inactive' : 'Active';
      const res = await caseTypeLogic.setStatus(type.id, newStatus);
      if (res.ok) { toast.push(`Case type ${newStatus === 'Active' ? 'enabled' : 'disabled'}.`, 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { console.error('Toggle exception:', err); setLastError(err?.message || String(err)); toast.push(err?.message || 'Failed to toggle status.', 'error'); }
  }, [refresh, toast]);

  const handleDelete = useCallback(async (type) => {
    try {
      if (!window.confirm(`Delete case type "${type.name}"?`)) return;
      await caseTypeLogic.remove(type.id);
      toast.push('Case type deleted.', 'success');
      await refresh();
    } catch (err) { console.error('Delete exception:', err); setLastError(err?.message || String(err)); toast.push(err?.message || 'Failed to delete case type.', 'error'); }
  }, [refresh, toast]);

  const removeBulk = async () => {
    try {
      if (!selected.size) return;
      if (!window.confirm(`Delete ${selected.size} case type(s)?`)) return;
      const res = await caseTypeLogic.bulkRemove([...selected]);
      setSelected(new Set());
      toast.push(`${res.data?.deleted || selected.size} case type(s) deleted.`, 'success');
      await refresh();
    } catch (err) { console.error('Bulk remove exception:', err); setLastError(err?.message || String(err)); toast.push(err?.message || 'Bulk delete failed.', 'error'); }
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

  const handleDragStart = useCallback((e, idx) => {
    setDragIdx(idx);
    setDraggingId(filtered[idx]?.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', filtered[idx]?.id);
  }, [filtered]);

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const items = [...filtered];
    const [moved] = items.splice(dragIdx, 1);
    items.splice(idx, 0, moved);
    setDragIdx(idx);
  }, [dragIdx, filtered]);

  const handleDragEnd = useCallback(async () => {
    if (dragIdx === null) return;
    try {
      const ids = filtered.map((t) => t.id);
      const res = await caseTypeLogic.reorder(ids);
      if (res.ok) { toast.push('Order updated.', 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { console.error('Reorder exception:', err); setLastError(err?.message || String(err)); }
    setDragIdx(null);
    setDraggingId(null);
  }, [dragIdx, filtered, refresh, toast]);

  if (loading) return <div className="fade-in" style={{ display: 'grid', placeItems: 'center', padding: 60 }}><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <PageHeader
        icon="grid"
        title="Case Types"
        subtitle="Manage case types used in case forms and filters."
        actions={(
          <button className="btn btn--primary" onClick={() => { setMode('single'); setNewName(''); setNewCode(''); setBulkText(''); }}>
            <Icon name="plus" size={15} /> Add Case Type
          </button>
        )}
      />

      <Card title="Add Case Type" className="case-types__form">
        {mode === 'single' ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px', minWidth: 0 }}>
              <Input value={newName} placeholder="Name…" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
            </div>
            <div style={{ flex: '0 1 120px', minWidth: 0 }}>
              <Input value={newCode} placeholder="Code…" onChange={(e) => setNewCode(e.target.value.toUpperCase().slice(0, 6))} onKeyDown={(e) => e.key === 'Enter' && add()} />
            </div>
            <button className="btn btn--primary" onClick={add}><Icon name="plus" size={15} /> Add</button>
            <button className="btn btn--ghost" onClick={() => { setMode('bulk'); setBulkText(''); }}>Bulk Add</button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Bulk Add &mdash; one per line: <code>Name, CODE</code></span>
              <button className="btn btn--ghost btn--sm" onClick={() => setMode('single')}>Single Add</button>
            </div>
            <Textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Civil, CIV\nCriminal, CRIM\nFamily, FAM\nWrit, WRT`}
              rows={5}
            />
            <button className="btn btn--primary" style={{ marginTop: 8 }} onClick={addBulk}><Icon name="plus" size={15} /> Add All</button>
          </div>
        )}
      </Card>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div className="datatable__search" style={{ flex: 1 }}>
          <Icon name="search" size={15} />
          <input value={search} placeholder="Search case types…" onChange={(e) => setSearch(e.target.value)} />
        </div>
        {selected.size > 0 && (
          <button className="btn btn--danger btn--sm" onClick={removeBulk}><Icon name="trash" size={14} /> Delete ({selected.size})</button>
        )}
      </div>

      <Card bodyClass="card__body--flush">
        <table className="table case-types__table">
          <thead>
            <tr>
              <th className="case-types__cell" style={{ width: 30 }}><input type="checkbox" onChange={handleSelectAll} checked={selected.size === filtered.length && filtered.length > 0} /></th>
              <th className="case-types__cell case-types__cell--drag" style={{ width: 30 }} />
              <th className="case-types__cell">Name</th>
              <th className="case-types__cell">Code</th>
              <th className="case-types__cell">Order</th>
              <th className="case-types__cell">Status</th>
              <th className="case-types__cell case-types__cell--actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td className="case-types__empty" colSpan={7}>No case types found.</td></tr>
            ) : filtered.map((type, idx) => (
              <CaseTypeRow
                key={type.id}
                type={type}
                editId={editId}
                editName={editName}
                editCode={editCode}
                onEditNameChange={setEditName}
                onEditCodeChange={setEditCode}
                onStartEdit={(t) => { setEditId(t.id); setEditName(t.name); setEditCode(t.short_code); }}
                onSaveEdit={saveEdit}
                onCancelEdit={() => setEditId(null)}
                onDelete={handleDelete}
                onToggle={handleToggle}
                onSelect={handleSelect}
                selected={selected}
                search={search}
                dragHandlers={{
                  handleDragStart: (e) => handleDragStart(e, idx),
                  handleDragOver: (e) => handleDragOver(e, idx),
                  handleDragEnd,
                }}
                dragRef={dragNode}
                isDragging={draggingId === type.id}
              />
            ))}
          </tbody>
        </table>
      </Card>
      {!search && <div className="muted" style={{ marginTop: 10 }}>Drag rows to reorder. Order applies to every case form.</div>}

      <DebugPanel logs={logs} error={lastError} result={lastResult} onClear={clearLogs} onCopy={copyLogs} />
    </div>
  );
}
