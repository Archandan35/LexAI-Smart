import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { Input } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { jurisdictionLogic } from '@/logic/jurisdictionLogic.js';

export default function Jurisdictions() {
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
    const res = await jurisdictionLogic.list();
    if (res.ok) setItems(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim() || !newCode.trim()) { toast.push('Name and code are required.', 'error'); return; }
    const res = await jurisdictionLogic.create({ name: newName, short_code: newCode });
    if (res.ok) { setNewName(''); setNewCode(''); toast.push('Jurisdiction added.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const startEdit = (item) => { setEditId(item.id); setEditName(item.name); setEditCode(item.short_code); setEditDesc(item.description || ''); };

  const saveEdit = async () => {
    if (!editName.trim() || !editCode.trim()) { toast.push('Name and code cannot be empty.', 'error'); return; }
    const res = await jurisdictionLogic.update(editId, { name: editName, short_code: editCode, description: editDesc });
    if (res.ok) { setEditId(null); toast.push('Jurisdiction updated.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete jurisdiction "${item.name}"?`)) return;
    const res = await jurisdictionLogic.remove(item.id);
    if (res.ok) { toast.push('Jurisdiction deleted.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const filtered = items.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.short_code || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="fade-in" style={{ display: 'grid', placeItems: 'center', padding: 60 }}><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <PageHeader icon="grid" title="Jurisdictions" subtitle="Manage court jurisdictions (Civil, Criminal, Family, etc.)." />

      <Card title="Add Jurisdiction" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
            <Input value={newName} placeholder="Name…" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          </div>
          <div style={{ flex: '0 1 100px', minWidth: 0 }}>
            <Input value={newCode} placeholder="Code…" onChange={(e) => setNewCode(e.target.value.toUpperCase().slice(0, 8))} onKeyDown={(e) => e.key === 'Enter' && add()} />
          </div>
          <button className="btn btn--primary" onClick={add}><Icon name="plus" size={15} /> Add</button>
        </div>
      </Card>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div className="datatable__search" style={{ flex: 1 }}>
          <Icon name="search" size={15} />
          <input value={search} placeholder="Search jurisdictions…" onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card bodyClass="card__body--flush">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Code</th><th>Description</th><th>Order</th><th>Status</th><th style={{ width: 110 }}>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td className="court-types__empty" colSpan={6}>No jurisdictions found.</td></tr>
            ) : filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  {editId === item.id ? (
                    <Input value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
                  ) : (
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                  )}
                </td>
                <td>
                  {editId === item.id ? (
                    <Input value={editCode} onChange={(e) => setEditCode(e.target.value.toUpperCase().slice(0, 8))} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
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
      <p className="muted" style={{ marginTop: 12, fontSize: 12.5 }}>{items.length} jurisdiction(s) configured.</p>
    </div>
  );
}
