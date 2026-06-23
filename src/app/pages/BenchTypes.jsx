import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { Input } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { benchTypeLogic } from '@/logic/benchTypeLogic.js';

export default function BenchTypes() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await benchTypeLogic.list();
    if (res.ok) setItems(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim() || !newCode.trim()) { toast.push('Name and code are required.', 'error'); return; }
    const res = await benchTypeLogic.create({ name: newName, short_code: newCode });
    if (res.ok) { setNewName(''); setNewCode(''); toast.push('Bench type added.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const startEdit = (item) => { setEditId(item.id); setEditName(item.name); setEditCode(item.short_code); setEditDesc(item.description || ''); };

  const saveEdit = async () => {
    if (!editName.trim() || !editCode.trim()) { toast.push('Name and code cannot be empty.', 'error'); return; }
    const res = await benchTypeLogic.update(editId, { name: editName, short_code: editCode, description: editDesc });
    if (res.ok) { setEditId(null); toast.push('Bench type updated.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete bench type "${item.name}"?`)) return;
    const res = await benchTypeLogic.remove(item.id);
    if (res.ok) { toast.push('Bench type deleted.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const filtered = items.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.short_code || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="fade-in bench-types__center"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <PageHeader icon="users" title="Bench Types" subtitle="Manage bench compositions (Single Bench, Division Bench, Full Bench, etc.)." />

      <Card title="Add Bench Type" className="bench-types__add-card">
        <div className="bench-types__add-row">
          <div className="bench-types__input-name">
            <Input value={newName} placeholder="Name…" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          </div>
          <div className="bench-types__input-code">
            <Input value={newCode} placeholder="Code…" onChange={(e) => setNewCode(e.target.value.toUpperCase().slice(0, 6))} onKeyDown={(e) => e.key === 'Enter' && add()} />
          </div>
          <button className="btn btn--primary" onClick={add}><Icon name="plus" size={15} /> Add</button>
        </div>
      </Card>

      <div className="bench-types__search-bar">
        <div className="datatable__search bench-types__search-flex">
          <Icon name="search" size={15} />
          <input value={search} placeholder="Search bench types…" onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card bodyClass="card__body--flush">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Code</th><th>Description</th><th>Order</th><th>Status</th><th className="bench-types__th-actions">Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td className="court-types__empty" colSpan={6}>No bench types found.</td></tr>
            ) : filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  {editId === item.id ? (
                    <Input value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
                  ) : (
                    <span className="bench-types__name-text">{item.name}</span>
                  )}
                </td>
                <td>
                  {editId === item.id ? (
                    <Input value={editCode} onChange={(e) => setEditCode(e.target.value.toUpperCase().slice(0, 6))} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
                  ) : (
                    <code>{item.short_code}</code>
                  )}
                </td>
                <td>
                  {editId === item.id ? (
                    <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
                  ) : (
                    <span className="muted">{item.description || '—'}</span>
                  )}
                </td>
                <td>{item.display_order}</td>
                <td><span className={`badge badge--${item.status === 'Active' ? 'green' : 'grey'}`}>{item.status}</span></td>
                <td>
                  <div className="row-actions">
                    {editId === item.id ? (
                      <><button className="iconbtn" title="Save" onClick={saveEdit}><Icon name="check" size={15} /></button><button className="iconbtn" title="Cancel" onClick={() => setEditId(null)}><Icon name="close" size={15} /></button></>
                    ) : (
                      <><button className="iconbtn" title="Edit" onClick={() => startEdit(item)}><Icon name="edit" size={15} /></button><button className="iconbtn iconbtn--danger" title="Delete" onClick={() => remove(item)}><Icon name="trash" size={15} /></button></>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="muted bench-types__summary">{items.length} bench type(s) configured.</p>
    </div>
  );
}
