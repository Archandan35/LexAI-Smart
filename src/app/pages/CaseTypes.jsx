import React, { useState, useCallback, useRef } from 'react';
import { useCaseTypes } from '@/hooks/useCaseTypes.js';
import { caseTypeLogic } from '@/logic/caseTypeLogic.js';
import { uid } from '@/utils/id.js';

function CaseTypeRow({ type, onEdit, onToggle, onDelete, dragHandlers, dragRef, isDragging }) {
  return (
    <tr
      className={`case-types__row ${isDragging ? 'case-types__row--dragging' : ''}`}
      draggable
      onDragStart={dragHandlers.handleDragStart}
      onDragOver={dragHandlers.handleDragOver}
      onDragEnd={dragHandlers.handleDragEnd}
      ref={dragRef}
    >
      <td className="case-types__cell case-types__cell--drag">
        <span className="case-types__drag-handle" aria-label="Reorder">⠿</span>
      </td>
      <td className="case-types__cell">{type.name}</td>
      <td className="case-types__cell">
        <code className="case-types__code">{type.short_code}</code>
      </td>
      <td className="case-types__cell">{type.display_order}</td>
      <td className="case-types__cell">
        <span className={`case-types__status case-types__status--${(type.status || 'Active').toLowerCase()}`}>
          {type.status || 'Active'}
        </span>
      </td>
      <td className="case-types__cell case-types__cell--actions">
        <button className="btn btn--sm btn--ghost" onClick={() => onEdit(type)} title="Edit">✎</button>
        <button className="btn btn--sm btn--ghost" onClick={() => onToggle(type)} title="Toggle status">
          {type.status === 'Active' ? '⏸' : '▶'}
        </button>
        <button className="btn btn--sm btn--ghost btn--danger" onClick={() => onDelete(type)} title="Delete">✕</button>
      </td>
    </tr>
  );
}

export default function CaseTypes() {
  const { caseTypes, loading, refresh } = useCaseTypes();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', short_code: '' });
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [dragIdx, setDragIdx] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const dragNode = useRef(null);

  const filtered = caseTypes.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.short_code.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = useCallback(() => {
    setForm({ name: '', short_code: '' });
    setEditing(null);
    setShowForm(false);
    setError('');
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.short_code.trim()) {
      setError('Name and short code are required.');
      return;
    }
    const res = editing
      ? await caseTypeLogic.update(editing.id, { ...form, display_order: editing.display_order, status: editing.status })
      : await caseTypeLogic.create(form);
    if (!res.ok) { setError(res.error); return; }
    resetForm();
    await refresh();
  }, [form, editing, refresh, resetForm]);

  const handleEdit = useCallback((type) => {
    setForm({ name: type.name, short_code: type.short_code });
    setEditing(type);
    setShowForm(true);
    setError('');
  }, []);

  const handleToggle = useCallback(async (type) => {
    await caseTypeLogic.setStatus(type.id, type.status === 'Active' ? 'Inactive' : 'Active');
    await refresh();
  }, [refresh]);

  const handleDelete = useCallback(async (type) => {
    if (!window.confirm(`Delete case type "${type.name}"?`)) return;
    await caseTypeLogic.remove(type.id);
    await refresh();
  }, [refresh]);

  const handleSelectAll = useCallback((e) => {
    if (e.target.checked) setSelected(new Set(filtered.map((t) => t.id)));
    else setSelected(new Set());
  }, [filtered]);

  const handleSelect = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} case types?`)) return;
    await caseTypeLogic.bulkRemove([...selected]);
    setSelected(new Set());
    await refresh();
  }, [selected, refresh]);

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
    const items = filtered;
    const ids = items.map((t) => t.id);
    await caseTypeLogic.reorder(ids);
    setDragIdx(null);
    setDraggingId(null);
    await refresh();
  }, [dragIdx, filtered, refresh]);

  if (loading) return <div className="page page--center"><div className="spinner" /></div>;

  return (
    <div className="page case-types">
      <div className="page__header">
        <h1 className="page__title">Case Types</h1>
        <button className="btn btn--primary" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Case Type
        </button>
      </div>

      <div className="page__toolbar">
        <input
          className="input input--search"
          type="text"
          placeholder="Search case types..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {selected.size > 0 && (
          <button className="btn btn--sm btn--danger" onClick={handleBulkDelete}>
            Delete ({selected.size})
          </button>
        )}
      </div>

      {showForm && (
        <form className="card card--form case-types__form" onSubmit={handleSubmit}>
          <h3 className="card__title">{editing ? 'Edit' : 'New'} Case Type</h3>
          {error && <div className="form__error">{error}</div>}
          <div className="form__grid">
            <div className="form__group">
              <label className="form__label">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </div>
            <div className="form__group">
              <label className="form__label">Short Code</label>
              <input className="input" value={form.short_code}
                onChange={(e) => setForm({ ...form, short_code: e.target.value.toUpperCase().slice(0, 6) })} />
            </div>
          </div>
          <div className="form__actions">
            <button className="btn btn--primary" type="submit">{editing ? 'Update' : 'Create'}</button>
            <button className="btn btn--ghost" type="button" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

      <div className="table-wrapper">
        <table className="table case-types__table">
          <thead>
            <tr>
              <th className="case-types__cell case-types__cell--drag">
                <input type="checkbox" onChange={handleSelectAll} checked={selected.size === filtered.length && filtered.length > 0} />
              </th>
              <th className="case-types__cell">Name</th>
              <th className="case-types__cell">Code</th>
              <th className="case-types__cell">Order</th>
              <th className="case-types__cell">Status</th>
              <th className="case-types__cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td className="case-types__empty" colSpan={6}>No case types found.</td></tr>
            ) : filtered.map((type, idx) => (
              <CaseTypeRow
                key={type.id}
                type={type}
                onEdit={handleEdit}
                onToggle={handleToggle}
                onDelete={handleDelete}
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
      </div>
    </div>
  );
}
