import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { Input, Select } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { courtsLogic } from '@/logic/courtsLogic.js';

export default function Courts() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editParent, setEditParent] = useState('');
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    const res = await courtsLogic.list();
    if (Array.isArray(res)) setItems(res);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) { toast.push('Name is required.', 'error'); return; }
    const order = items.reduce((m, i) => Math.max(m, i.display_order ?? 0), 0) + 1;
    const res = await courtsLogic.create({ name: newName, parent_id: newParent || null, display_order: order });
    if (res.ok) { setNewName(''); toast.push('Court added.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const startEdit = (item) => { setEditId(item.id); setEditName(item.name); setEditParent(item.parent_id || ''); };

  const saveEdit = async () => {
    if (!editName.trim()) { toast.push('Name cannot be empty.', 'error'); return; }
    const item = items.find((i) => i.id === editId);
    const res = await courtsLogic.update(editId, { name: editName, parent_id: editParent || null, display_order: item?.display_order, status: item?.status });
    if (res.ok) { setEditId(null); toast.push('Court updated.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    const res = await courtsLogic.remove(item.id);
    if (res.ok) { toast.push('Court deleted.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const duplicate = async (item) => {
    const res = await courtsLogic.create({ name: `${item.name} (Copy)`, parent_id: item.parent_id });
    if (res.ok) { toast.push('Court duplicated.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

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
        return courtsLogic.update(item.id, { display_order: idx + 1 });
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

  const searched = items.filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()));
  const rootItems = searched.filter((i) => !i.parent_id).sort((a, b) => a.display_order - b.display_order);
  const getChildren = (parentId) => searched.filter((i) => i.parent_id === parentId).sort((a, b) => a.display_order - b.display_order);

  const liveOptions = (excludeId) => items
    .filter((i) => i.id !== excludeId)
    .map((i) => ({ value: i.id, label: i.name }));

  const renderTree = (nodes, depth = 0) => {
    return nodes.map((item) => {
      const children = getChildren(item.id);
      const isEditing = editId === item.id;
      const isDragging = dragId === item.id;
      const isDropOver = dropTarget === item.id;
      return (
        <React.Fragment key={item.id}>
          <tr
            draggable={!isEditing}
            className={isDragging ? 'dragging' : isDropOver ? 'drag-over' : ''}
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragOver={(e) => handleDragOver(e, item.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, item.id)}
            onDragEnd={handleDragEnd}
            style={{ cursor: isEditing ? 'default' : 'grab' }}
          >
            <td style={{ paddingLeft: 16 + depth * 24 }}>
              <span className="courts__name">{item.name}</span>
            </td>
            <td>
              {isEditing ? (
                <>
                  <Input value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
                  <Select value={editParent} onChange={(e) => setEditParent(e.target.value)} options={[{ value: '', label: '— No parent —' }, ...liveOptions(editId)]} className="courts__parent-select" style={{ marginTop: 6 }} />
                </>
              ) : (
                <span className="muted">{item.parent_id ? `Child of ${items.find((i) => i.id === item.parent_id)?.name || '—'}` : 'Root level'}</span>
              )}
            </td>
            <td><span className={`badge badge--${item.status === 'Active' ? 'green' : 'grey'}`}>{item.status}</span></td>
            <td>
              <div className="row-actions">
                {isEditing ? (
                  <><button className="iconbtn" title="Save" onClick={saveEdit}><Icon name="check" size={15} /></button><button className="iconbtn" title="Cancel" onClick={() => setEditId(null)}><Icon name="close" size={15} /></button></>
                ) : (
                  <><button className="iconbtn" title="Edit" onClick={() => startEdit(item)}><Icon name="edit" size={15} /></button><button className="iconbtn" title="Duplicate" onClick={() => duplicate(item)}><Icon name="layers" size={15} /></button><button className="iconbtn iconbtn--danger" title="Delete" onClick={() => remove(item)}><Icon name="trash" size={15} /></button></>
                )}
              </div>
            </td>
          </tr>
          {children.length > 0 && renderTree(children, depth + 1)}
        </React.Fragment>
      );
    });
  };

  if (loading) return <div className="fade-in loading-page"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <PageHeader icon="layers" title="Courts" subtitle="Define the hierarchical structure of courts." />

      <Card title="Add Court" className="courts__add-card">
        <div className="courts__add-row">
          <div className="courts__input-wrap">
            <Input value={newName} placeholder="Court name…" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          </div>
          <Select value={newParent} onChange={(e) => setNewParent(e.target.value)} options={[{ value: '', label: '— Root —' }, ...liveOptions(null)]} className="courts__parent-select" />
          <button className="btn btn--primary" onClick={add}><Icon name="plus" size={15} /> Add</button>
        </div>
      </Card>

      <div className="search-row">
        <div className="datatable__search search-row__input">
          <Icon name="search" size={15} />
          <input value={search} placeholder="Search hierarchy…" onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card bodyClass="card__body--flush">
        <table className="table">
          <thead>
            <tr><th>Court Name</th><th>Parent</th><th>Status</th><th className="courts__th-actions">Actions</th></tr>
          </thead>
          <tbody>
            {rootItems.length === 0 ? (
              <tr><td className="court-types__empty" colSpan={4}>No courts defined.</td></tr>
            ) : renderTree(rootItems)}
          </tbody>
        </table>
      </Card>
      <p className="muted courts__count">{items.length} court(s) defined.</p>
    </div>
  );
}
