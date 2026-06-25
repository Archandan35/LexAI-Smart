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
  const [newLevel, setNewLevel] = useState('2');
  const [newParent, setNewParent] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLevel, setEditLevel] = useState('2');
  const [editParent, setEditParent] = useState('');

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
    const res = await courtsLogic.create({ name: newName, level: Number(newLevel), parent_id: newParent || null, display_order: order });
    if (res.ok) { setNewName(''); toast.push('Hierarchy level added.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const startEdit = (item) => { setEditId(item.id); setEditName(item.name); setEditLevel(String(item.level)); setEditParent(item.parent_id || ''); };

  const saveEdit = async () => {
    if (!editName.trim()) { toast.push('Name cannot be empty.', 'error'); return; }
    const item = items.find((i) => i.id === editId);
    const res = await courtsLogic.update(editId, { name: editName, level: Number(editLevel), parent_id: editParent || null, display_order: item?.display_order, status: item?.status });
    if (res.ok) { setEditId(null); toast.push('Hierarchy level updated.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    const res = await courtsLogic.remove(item.id);
    if (res.ok) { toast.push('Hierarchy level deleted.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const searched = items.filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()));
  const rootItems = searched.filter((i) => !i.parent_id).sort((a, b) => a.display_order - b.display_order);
  const getChildren = (parentId) => searched.filter((i) => i.parent_id === parentId).sort((a, b) => a.display_order - b.display_order);

  const liveOptions = (excludeId, maxLevel) => items
    .filter((i) => i.id !== excludeId && Number(i.level) < Number(maxLevel))
    .map((i) => ({ value: i.id, label: `${'—'.repeat(i.level)} ${i.name}` }));

  const renderTree = (nodes, depth = 0) => {
    return nodes.map((item) => {
      const children = getChildren(item.id);
      const isEditing = editId === item.id;
      return (
        <React.Fragment key={item.id}>
          <tr>
            <td style={{ paddingLeft: 16 + depth * 24 }}>
              <span className="courts__name">{item.name}</span>
            </td>
            <td>
              {isEditing ? (
                <Input value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
              ) : (
                <span className="muted">{item.parent_id ? `Child of ${items.find((i) => i.id === item.parent_id)?.name || '—'}` : 'Root level'}</span>
              )}
            </td>
            <td>
              {isEditing ? (
                <div className="courts__edit-row">
                  <Select value={editLevel} onChange={(e) => setEditLevel(e.target.value)} options={[1,2,3,4,5].map((n) => ({ value: String(n), label: `Level ${n}` }))} className="courts__level-select-sm" />
                  <Select value={editParent} onChange={(e) => setEditParent(e.target.value)} options={[{ value: '', label: '— No parent —' }, ...liveOptions(editId, editLevel)]} className="courts__parent-select" />
                </div>
              ) : (
                <span>Level {item.level}</span>
              )}
            </td>
            <td>{item.display_order ?? '—'}</td>
            <td><span className={`badge badge--${item.status === 'Active' ? 'green' : 'grey'}`}>{item.status}</span></td>
            <td>
              <div className="row-actions">
                {isEditing ? (
                  <><button className="iconbtn" title="Save" onClick={saveEdit}><Icon name="check" size={15} /></button><button className="iconbtn" title="Cancel" onClick={() => setEditId(null)}><Icon name="close" size={15} /></button></>
                ) : (
                  <><button className="iconbtn" title="Edit" onClick={() => startEdit(item)}><Icon name="edit" size={15} /></button><button className="iconbtn iconbtn--danger" title="Delete" onClick={() => remove(item)}><Icon name="trash" size={15} /></button></>
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

      <Card title="Add Court Level" className="courts__add-card">
        <div className="courts__add-row">
          <div className="courts__input-wrap">
            <Input value={newName} placeholder="Court name…" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          </div>
          <Select value={newLevel} onChange={(e) => setNewLevel(e.target.value)} options={[1,2,3,4,5].map((n) => ({ value: String(n), label: `Level ${n}` }))} className="courts__level-select" />
          <Select value={newParent} onChange={(e) => setNewParent(e.target.value)} options={[{ value: '', label: '— Root —' }, ...liveOptions(null, Number(newLevel) + 1)]} className="courts__parent-select" />
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
            <tr><th>Court Name</th><th>Parent</th><th>Level</th><th>Order</th><th>Status</th><th className="courts__th-actions">Actions</th></tr>
          </thead>
          <tbody>
            {rootItems.length === 0 ? (
              <tr><td className="court-types__empty" colSpan={6}>No hierarchy defined.</td></tr>
            ) : renderTree(rootItems)}
          </tbody>
        </table>
      </Card>
      <p className="muted courts__count">{items.length} court level(s) defined.</p>
    </div>
  );
}
