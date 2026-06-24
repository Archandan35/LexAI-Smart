import React, { useState, useEffect } from 'react';
import { caseStageLogic } from '@/logic/caseStageLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { Input } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';

export default function CaseStages() {
  const toast = useToast();
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [draggedIdx, setDraggedIdx] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await caseStageLogic.list();
      setStages(Array.isArray(data) ? data : []);
    } catch { setStages([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) return;
    const res = await caseStageLogic.add(newName.trim());
    if (res.ok) { setNewName(''); toast.push('Stage added.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    const res = await caseStageLogic.rename(editId, editName.trim());
    if (res.ok) { setEditId(null); toast.push('Stage renamed.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const remove = async (stage) => {
    if (!window.confirm(`Delete stage "${stage.name}"?`)) return;
    const res = await caseStageLogic.remove(stage.id);
    if (res.ok) { toast.push('Stage deleted.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  return (
    <div className="fade-in">
      <PageHeader icon="layers" title="Case Stages" subtitle="Manage case stages (filing, hearing, judgment, etc.)." />

      <Card title="Add Stage" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input value={newName} placeholder="Stage name…" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} style={{ flex: 1 }} />
          <button className="btn btn--primary" onClick={add}><Icon name="plus" size={15} /> Add</button>
        </div>
      </Card>

      {loading ? (
        <div className="fade-in" style={{ display: 'grid', placeItems: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : (
        <Card bodyClass="card__body--flush">
          <table className="table">
            <thead>
              <tr><th>Order</th><th>Name</th><th style={{ width: 110 }}>Actions</th></tr>
            </thead>
            <tbody>
              {stages.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No stages configured.</td></tr>
              ) : stages.map((stage, idx) => (
                <tr key={stage.id}>
                  <td><span className="badge">{stage.order ?? idx}</span></td>
                  <td>
                    {editId === stage.id ? (
                      <Input value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
                    ) : (
                      <span style={{ fontWeight: 600 }}>{stage.name}</span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      {editId === stage.id ? (
                        <><button className="iconbtn" title="Save" onClick={saveEdit}><Icon name="check" size={15} /></button><button className="iconbtn" title="Cancel" onClick={() => setEditId(null)}><Icon name="close" size={15} /></button></>
                      ) : (
                        <><button className="iconbtn" title="Edit" onClick={() => { setEditId(stage.id); setEditName(stage.name); }}><Icon name="edit" size={15} /></button><button className="iconbtn iconbtn--danger" title="Delete" onClick={() => remove(stage)}><Icon name="trash" size={15} /></button></>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="muted" style={{ marginTop: 12, fontSize: 12.5 }}>{stages.length} stage(s) configured.</p>
    </div>
  );
}
