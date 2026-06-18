import React, { useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { Input } from './Field.jsx';
import { caseStageLogic } from '@/logic/caseStageLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

// StageManager — add / rename / delete / search / drag-reorder case stages.
// Changes persist to the caseStages collection and propagate to all case forms.
export default function StageManager({ open, onClose, stages, onChanged }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [dragId, setDragId] = useState(null);

  const visible = stages.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  const add = async () => {
    const res = await caseStageLogic.add(newName);
    if (res.ok) { setNewName(''); toast.push('Stage added.', 'success'); onChanged?.(); }
    else toast.push(res.error, 'error');
  };
  const saveEdit = async () => {
    const res = await caseStageLogic.rename(editId, editName);
    if (res.ok) { setEditId(null); toast.push('Stage renamed.', 'success'); onChanged?.(); }
    else toast.push(res.error, 'error');
  };
  const remove = async (s) => {
    if (!confirm(`Delete stage "${s.name}"? Cases already on this stage keep their value.`)) return;
    await caseStageLogic.remove(s.id);
    toast.push('Stage deleted.', 'success'); onChanged?.();
  };

  const onDrop = async (targetId) => {
    if (!dragId || dragId === targetId) return;
    const ids = stages.map((s) => s.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setDragId(null);
    await caseStageLogic.reorder(ids);
    onChanged?.();
  };

  return (
    <Modal open={open} title="Manage Case Stages" onClose={onClose} size="lg">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <Input value={newName} placeholder="New stage name…" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button icon="plus" onClick={add}>Add Stage</Button>
      </div>
      <div className="datatable__search" style={{ marginBottom: 12 }}>
        <Icon name="search" size={15} />
        <input value={search} placeholder="Search stages…" onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="table-scroll" style={{ maxHeight: '46vh' }}>
        <table className="table">
          <thead><tr><th style={{ width: 30 }} /><th>Stage Name</th><th style={{ width: 110 }} /></tr></thead>
          <tbody>
            {visible.map((s) => (
              <tr
                key={s.id}
                draggable={!search}
                onDragStart={() => setDragId(s.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(s.id)}
                className={dragId === s.id ? 'row--selected' : ''}
              >
                <td style={{ cursor: search ? 'default' : 'grab', color: 'var(--text-faint)' }}>⋮⋮</td>
                <td>
                  {editId === s.id ? (
                    <Input value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
                  ) : <span style={{ fontWeight: 600 }}>{s.name}</span>}
                </td>
                <td>
                  <div className="row-actions">
                    {editId === s.id ? (
                      <>
                        <button className="iconbtn" title="Save" onClick={saveEdit}><Icon name="check" size={15} /></button>
                        <button className="iconbtn" title="Cancel" onClick={() => setEditId(null)}><Icon name="close" size={15} /></button>
                      </>
                    ) : (
                      <>
                        <button className="iconbtn" title="Edit" onClick={() => { setEditId(s.id); setEditName(s.name); }}><Icon name="edit" size={15} /></button>
                        <button className="iconbtn iconbtn--danger" title="Delete" onClick={() => remove(s)}><Icon name="trash" size={15} /></button>
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
