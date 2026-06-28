import { usePartyTypes } from '@/hooks/usePartyTypes.js';
import { partyTypeLogic } from '@/logic/partyTypeLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { Input, Textarea } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';

function PartyTypeRow({ type, editId, editName, editCode, onEditNameChange, onEditCodeChange, onSaveEdit, onCancelEdit, onDelete, onToggle, onSelect, selected, search, dragHandlers, dragRef, isDragging, onStartEdit }) {
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
      <td className="case-types__cell case-types__cell--drag case-types__cell--checkbox">
        <input type="checkbox" checked={selected.has(type.id)} onChange={() => onSelect(type.id)} />
      </td>
      <td className="case-types__cell case-types__cell--drag" style={{ width: 30, cursor: search ? 'default' : 'grab' }}>
        <span className="case-types__drag-handle">⠿</span>
      </td>
      <td className="case-types__cell">
        {isEditing ? (
          <Input value={editName} autoFocus onChange={(e) => onEditNameChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSaveEdit()} />
        ) : (
          <span className="case-types__name">{type.name}</span>
        )}
      </td>
      <td className="case-types__cell">
        {isEditing ? (
          <Input value={editCode} onChange={(e) => onEditCodeChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSaveEdit()} />
        ) : (
          <code className="case-types__code">{type.short_code}</code>
        )}
      </td>
      <td className="case-types__cell">{type.display_order ?? '—'}</td>
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
                {type.status === 'Active' ? <Icon name="check" size={15} /> : <span className="case-types__toggle-icon"><Icon name="play" size={12} /></span>}
              </button>
              <button className="iconbtn iconbtn--danger" title="Delete" onClick={() => onDelete(type)}><Icon name="trash" size={15} /></button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function PartyTypes() {
  const { partyTypes, loading, refresh } = usePartyTypes();
  const toast = useToast();
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
  const dragOrder = useRef(null);
  const dragNode = useRef(null);

  const filtered = partyTypes.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.short_code || '').toLowerCase().includes(search.toLowerCase())
  );

  const add = async () => {
    try {
      if (!newName.trim() || !newCode.trim()) { toast.push('Name and short code are required.', 'error'); return; }
      const res = await partyTypeLogic.create({ name: newName, short_code: newCode });
      if (res.ok) { setNewName(''); setNewCode(''); toast.push('Party type added.', 'success'); await refresh(); }
      else toast.push(res.error, 'error');
    } catch (err) { toast.push(err?.message || 'Failed to create party type.', 'error'); }
  };

  const addBulk = async () => {
    try {
      const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) { toast.push('Paste at least one party type (name, code per line).', 'error'); return; }
      const records = lines.map((line) => {
        const parts = line.split(',').map((s) => s.trim());
        const name = parts[0];
        const code = parts[1] || name.slice(0, 6).toUpperCase();
        return { name, short_code: code };
      }).filter((r) => r.name);
      const res = await partyTypeLogic.bulkCreate(records);
      setBulkText('');
      if (res.ok) { toast.push(`${res.data.count} party type(s) added.`, 'success'); await refresh(); }
      else toast.push(res.error, 'error');
    } catch (err) { toast.push(err?.message || 'Bulk add failed.', 'error'); }
  };

  const saveEdit = async () => {
    try {
      if (!editName.trim() || !editCode.trim()) { toast.push('Name and code cannot be empty.', 'error'); return; }
      const type = partyTypes.find((t) => t.id === editId);
      if (!type) return;
      const res = await partyTypeLogic.update(editId, { name: editName, short_code: editCode, display_order: type.display_order, status: type.status });
      if (res.ok) { setEditId(null); toast.push('Party type updated.', 'success'); await refresh(); }
      else toast.push(res.error, 'error');
    } catch (err) { toast.push(err?.message || 'Failed to update party type.', 'error'); }
  };

  const handleToggle = useCallback(async (type) => {
    try {
      const newStatus = type.status === 'Active' ? 'Inactive' : 'Active';
      const res = await partyTypeLogic.setStatus(type.id, newStatus);
      if (res.ok) { toast.push(`Party type ${newStatus === 'Active' ? 'enabled' : 'disabled'}.`, 'success'); await refresh(); }
      else toast.push(res.error, 'error');
    } catch (err) { toast.push(err?.message || 'Failed to toggle status.', 'error'); }
  }, [refresh, toast]);

  const handleDelete = useCallback(async (type) => {
    try {
      if (!window.confirm(`Delete party type "${type.name}"?`)) return;
      const res = await partyTypeLogic.remove(type.id);
      if (res.ok) { toast.push('Party type deleted.', 'success'); await refresh(); }
      else toast.push(res.error, 'error');
    } catch (err) { toast.push(err?.message || 'Failed to delete party type.', 'error'); }
  }, [refresh, toast]);

  const removeBulk = async () => {
    try {
      if (!selected.size) return;
      if (!window.confirm(`Delete ${selected.size} party type(s)?`)) return;
      const res = await partyTypeLogic.bulkRemove([...selected]);
      if (res.ok) { setSelected(new Set()); toast.push(`${res.data?.deleted || selected.size} party type(s) deleted.`, 'success'); await refresh(); }
      else toast.push(res.error, 'error');
    } catch (err) { toast.push(err?.message || 'Bulk delete failed.', 'error'); }
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
    dragOrder.current = filtered.map((t) => t.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', filtered[idx]?.id);
  }, [filtered]);

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx || !dragOrder.current) return;
    const items = [...dragOrder.current];
    const [moved] = items.splice(dragIdx, 1);
    items.splice(idx, 0, moved);
    dragOrder.current = items;
    setDragIdx(idx);
  }, [dragIdx]);

  const handleDragEnd = useCallback(async () => {
    if (dragIdx === null || !dragOrder.current) return;
    try {
      const ids = dragOrder.current;
      const res = await partyTypeLogic.reorder(ids);
      if (res.ok) { toast.push('Order updated.', 'success'); await refresh(); }
      else toast.push(res.error, 'error');
    } catch (err) { toast.push(err?.message || 'Reorder failed.', 'error'); }
    setDragIdx(null);
    setDraggingId(null);
    dragOrder.current = null;
  }, [dragIdx, refresh, toast]);

  if (loading) return <div className="fade-in loading-page"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <PageHeader
        icon="users"
        title="Party Types"
        subtitle="Manage party types used in case forms and filters."
        actions={(
          <button className="btn btn--primary" onClick={() => { setMode('single'); setNewName(''); setNewCode(''); setBulkText(''); }}>
            <Icon name="plus" size={15} /> Add Party Type
          </button>
        )}
      />

      <Card title="Add Party Type" className="case-types__form">
        {mode === 'single' ? (
          <div className="case-types__add-row">
            <div className="case-types__input-wrap">
              <Input value={newName} placeholder="Name…" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
            </div>
            <div className="case-types__code-wrap">
              <Input value={newCode} placeholder="Code…" onChange={(e) => setNewCode(e.target.value.toUpperCase().slice(0, 6))} onKeyDown={(e) => e.key === 'Enter' && add()} />
            </div>
            <button className="btn btn--primary" onClick={add}><Icon name="plus" size={15} /> Add</button>
            <button className="btn btn--ghost" onClick={() => { setMode('bulk'); setBulkText(''); }}>Bulk Add</button>
          </div>
        ) : (
          <div>
            <div className="case-types__bulk-header">
              <span className="case-types__bulk-label">Bulk Add &mdash; one per line: <code>Name, CODE</code></span>
              <button className="btn btn--ghost btn--sm" onClick={() => setMode('single')}>Single Add</button>
            </div>
            <Textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Plaintiff, PL\nDefendant, DEF\nAppellant, APP\nRespondent, RES`}
              rows={5}
            />
            <button className="btn btn--primary case-types__add-btn" onClick={addBulk}><Icon name="plus" size={15} /> Add All</button>
          </div>
        )}
      </Card>

      <div className="search-row">
        <div className="datatable__search search-row__input">
          <Icon name="search" size={15} />
          <input value={search} placeholder="Search party types…" onChange={(e) => setSearch(e.target.value)} />
        </div>
        {selected.size > 0 && (
          <button className="btn btn--danger btn--sm" onClick={removeBulk}><Icon name="trash" size={14} /> Delete ({selected.size})</button>
        )}
      </div>

      <Card bodyClass="card__body--flush">
        <table className="table case-types__table">
          <thead>
            <tr>
              <th className="case-types__cell case-types__th-checkbox"><input type="checkbox" onChange={handleSelectAll} checked={selected.size === filtered.length && filtered.length > 0} /></th>
              <th className="case-types__cell case-types__cell--drag case-types__cell--checkbox" />
              <th className="case-types__cell">Name</th>
              <th className="case-types__cell">Code</th>
              <th className="case-types__cell">Order</th>
              <th className="case-types__cell">Status</th>
              <th className="case-types__cell case-types__cell--actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td className="case-types__empty" colSpan={7}>No party types found.</td></tr>
            ) : filtered.map((type, idx) => (
              <PartyTypeRow
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
      {!search && <div className="muted case-types__drag-hint">Drag rows to reorder. Order applies to every case form.</div>}
    </div>
  );
}
