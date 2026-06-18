import React, { useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { Input, Textarea } from './Field.jsx';
import { courtLogic } from '@/logic/courtLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

export default function CourtTypeManager({ open, onClose, courts, onChanged }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [dragId, setDragId] = useState(null);
  const [bulkText, setBulkText] = useState('');
  const [selected, setSelected] = useState(new Set());

  const visible = courts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const add = async () => {
    const res = await courtLogic.create({ name: newName });
    if (res.ok) { setNewName(''); toast.push('Court added.', 'success'); onChanged?.(); }
    else toast.push(res.error, 'error');
  };

  const addBulk = async () => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { toast.push('Paste at least one court name.', 'error'); return; }
    let added = 0; let skipped = 0;
    for (const name of lines) {
      // eslint-disable-next-line no-await-in-loop
      const res = await courtLogic.create({ name });
      if (res.ok) added += 1; else skipped += 1;
    }
    setBulkText('');
    toast.push(`${added} court(s) added.${skipped ? ` ${skipped} skipped (already exist).` : ''}`, added ? 'success' : 'info');
    onChanged?.();
  };

  const saveEdit = async () => {
    const res = await courtLogic.update(editId, { name: editName });
    if (res.ok) { setEditId(null); toast.push('Court renamed.', 'success'); onChanged?.(); }
    else toast.push(res.error, 'error');
  };

  const remove = async (c) => {
    if (!confirm(`Delete court "${c.name}"? Cases using this court keep their value.`)) return;
    await courtLogic.remove(c.id);
    toast.push('Court deleted.', 'success'); onChanged?.();
  };

  const removeBulk = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} court(s)?`)) return;
    for (const id of selected) {
      // eslint-disable-next-line no-await-in-loop
      await courtLogic.remove(id);
    }
    setSelected(new Set());
    toast.push(`${selected.size} court(s) deleted.`, 'success');
    onChanged?.();
  };

  const onDrop = async (targetId) => {
    if (!dragId || dragId === targetId) return;
    const ids = courts.map((c) => c.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setDragId(null);
    await courtLogic.reorder(ids);
    onChanged?.();
  };

  const [mode, setMode] = useState('single');
  const toggleSel = (id) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected((prev) => prev.size === visible.length ? new Set() : new Set(visible.map((c) => c.id)));

  return (
    <Modal open={open} title="Manage Court Types" onClose={onClose} size="lg">
      {mode === 'single' ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <Input value={newName} placeholder="New court name…" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <Button icon="plus" onClick={add}>Add Court</Button>
          <Button variant="ghost" size="sm" onClick={() => { setMode('bulk'); setBulkText(''); }}>Bulk Add</Button>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Bulk Add — one court per line</span>
            <Button variant="ghost" size="sm" onClick={() => setMode('single')}>Single Add</Button>
          </div>
          <Textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder={`Supreme Court of India\nHigh Court\nDistrict & Sessions Court`} rows={5} />
          <Button icon="plus" onClick={addBulk} style={{ marginTop: 8 }}>Add All</Button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div className="datatable__search" style={{ flex: 1 }}>
          <Icon name="search" size={15} />
          <input value={search} placeholder="Search courts…" onChange={(e) => setSearch(e.target.value)} />
        </div>
        {selected.size > 0 && (
          <Button variant="danger" size="sm" icon="trash" onClick={removeBulk}>Delete ({selected.size})</Button>
        )}
      </div>

      <div className="table-scroll" style={{ maxHeight: '46vh' }}>
        <table className="table">
          <thead><tr>
            <th style={{ width: 30 }}><input type="checkbox" onChange={toggleAll} checked={selected.size === visible.length && visible.length > 0} /></th>
            <th style={{ width: 30 }} />
            <th>Name</th>
            <th style={{ width: 110 }} />
          </tr></thead>
          <tbody>
            {visible.map((c) => (
              <tr
                key={c.id}
                draggable={!search}
                onDragStart={() => setDragId(c.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(c.id)}
                className={dragId === c.id ? 'row--selected' : ''}
              >
                <td><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSel(c.id)} /></td>
                <td style={{ cursor: search ? 'default' : 'grab', color: 'var(--text-faint)' }}>⋮⋮</td>
                <td>
                  {editId === c.id ? (
                    <Input value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
                  ) : <span style={{ fontWeight: 600 }}>{c.name}</span>}
                </td>
                <td>
                  <div className="row-actions">
                    {editId === c.id ? (
                      <>
                        <button className="iconbtn" title="Save" onClick={saveEdit}><Icon name="check" size={15} /></button>
                        <button className="iconbtn" title="Cancel" onClick={() => setEditId(null)}><Icon name="close" size={15} /></button>
                      </>
                    ) : (
                      <>
                        <button className="iconbtn" title="Edit" onClick={() => { setEditId(c.id); setEditName(c.name); }}><Icon name="edit" size={15} /></button>
                        <button className="iconbtn iconbtn--danger" title="Delete" onClick={() => remove(c)}><Icon name="trash" size={15} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!search && <div className="muted" style={{ marginTop: 10 }}>Drag rows to reorder. Order applies to every case form.</div>}
    </Modal>
  );
}
