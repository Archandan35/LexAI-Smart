import React, { useState } from 'react';
import { useCourts } from '@/hooks/useCourts.js';
import { courtLogic } from '@/logic/courtLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { Input, Textarea } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';
import DebugPanel, { useLogCapture } from '@/components/DebugPanel.jsx';

export default function CourtTypes() {
  const { courts, courtNames, loading, refresh } = useCourts();
  const toast = useToast();
  const { logs, clearLogs, copyLogs } = useLogCapture();
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('single');
  const [newName, setNewName] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [lastError, setLastError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const visible = courts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const add = async () => {
    try {
      if (!newName.trim()) { toast.push('Enter a court name.', 'error'); return; }
      console.log('Creating court:', { name: newName });
      const res = await courtLogic.create({ name: newName });
      console.log('Create result:', res);
      if (res.ok) { setNewName(''); toast.push('Court added.', 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { console.error('Create exception:', err); setLastError(err?.message || String(err)); toast.push(err?.message || 'Failed to create court.', 'error'); }
  };

  const addBulk = async () => {
    try {
      const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) { toast.push('Paste at least one court name.', 'error'); return; }
      const records = lines.map((name) => ({ name }));
      console.log('Bulk creating courts:', records);
      const res = await courtLogic.bulkCreate(records);
      console.log('Bulk create result:', res);
      setBulkText('');
      if (res.ok) { toast.push(`${res.data.count} court(s) added.`, 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { console.error('Bulk create exception:', err); setLastError(err?.message || String(err)); toast.push(err?.message || 'Bulk add failed.', 'error'); }
  };

  const saveEdit = async () => {
    try {
      if (!editName.trim()) { toast.push('Name cannot be empty.', 'error'); return; }
      console.log('Updating court:', { id: editId, name: editName });
      const res = await courtLogic.update(editId, { name: editName });
      console.log('Update result:', res);
      if (res.ok) { setEditId(null); toast.push('Court renamed.', 'success'); await refresh(); }
      else { setLastError(res.error); toast.push(res.error, 'error'); }
    } catch (err) { console.error('Update exception:', err); setLastError(err?.message || String(err)); toast.push(err?.message || 'Failed to rename court.', 'error'); }
  };

  const remove = async (court) => {
    try {
      if (!window.confirm(`Delete court "${court.name}"? Cases using this court keep their value.`)) return;
      console.log('Removing court:', { id: court.id, name: court.name });
      await courtLogic.remove(court.id);
      toast.push('Court deleted.', 'success');
      await refresh();
    } catch (err) { console.error('Remove exception:', err); setLastError(err?.message || String(err)); toast.push(err?.message || 'Failed to delete court.', 'error'); }
  };

  const removeBulk = async () => {
    try {
      if (!selected.size) return;
      if (!window.confirm(`Delete ${selected.size} court(s)?`)) return;
      const res = await courtLogic.bulkRemove([...selected]);
      setSelected(new Set());
      toast.push(`${res.data?.deleted || selected.size} court(s) deleted.`, 'success');
      await refresh();
    } catch (err) { console.error('Bulk remove exception:', err); setLastError(err?.message || String(err)); toast.push(err?.message || 'Bulk delete failed.', 'error'); }
  };

  const toggleSel = (id) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected((prev) => prev.size === visible.length ? new Set() : new Set(visible.map((c) => c.id)));

  if (loading) return <div className="fade-in" style={{ display: 'grid', placeItems: 'center', padding: 60 }}><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <PageHeader
        icon="folder"
        title="Court Types"
        subtitle="Manage court types used in case forms and filters."
        actions={(
          <button className="btn btn--primary" onClick={() => { setMode('single'); setNewName(''); setBulkText(''); }}>
            <Icon name="plus" size={15} /> Add Court
          </button>
        )}
      />

      <Card title="Add Court" className="case-types__form">
        {mode === 'single' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              value={newName}
              placeholder="New court name…"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <button className="btn btn--primary" onClick={add}><Icon name="plus" size={15} /> Add</button>
            <button className="btn btn--ghost" onClick={() => { setMode('bulk'); setBulkText(''); }}>Bulk Add</button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Bulk Add &mdash; one court per line</span>
              <button className="btn btn--ghost btn--sm" onClick={() => setMode('single')}>Single Add</button>
            </div>
            <Textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Supreme Court of India\nHigh Court\nDistrict & Sessions Court`}
              rows={5}
            />
            <button className="btn btn--primary" style={{ marginTop: 8 }} onClick={addBulk}><Icon name="plus" size={15} /> Add All</button>
          </div>
        )}
      </Card>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div className="datatable__search" style={{ flex: 1 }}>
          <Icon name="search" size={15} />
          <input value={search} placeholder="Search courts…" onChange={(e) => setSearch(e.target.value)} />
        </div>
        {selected.size > 0 && (
          <button className="btn btn--danger btn--sm" onClick={removeBulk}><Icon name="trash" size={14} /> Delete ({selected.size})</button>
        )}
      </div>

      <Card bodyClass="card__body--flush">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 30 }}><input type="checkbox" onChange={toggleAll} checked={selected.size === visible.length && visible.length > 0} /></th>
              <th>Name</th>
              <th style={{ width: 110 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td className="court-types__empty" colSpan={3}>No court types found.</td></tr>
            ) : visible.map((court) => (
              <tr key={court.id}>
                <td><input type="checkbox" checked={selected.has(court.id)} onChange={() => toggleSel(court.id)} /></td>
                <td>
                  {editId === court.id ? (
                    <Input value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
                  ) : (
                    <span style={{ fontWeight: 600 }}>{court.name}</span>
                  )}
                </td>
                <td>
                  <div className="row-actions">
                    {editId === court.id ? (
                      <>
                        <button className="iconbtn" title="Save" onClick={saveEdit}><Icon name="check" size={15} /></button>
                        <button className="iconbtn" title="Cancel" onClick={() => setEditId(null)}><Icon name="close" size={15} /></button>
                      </>
                    ) : (
                      <>
                        <button className="iconbtn" title="Edit" onClick={() => { setEditId(court.id); setEditName(court.name); }}><Icon name="edit" size={15} /></button>
                        <button className="iconbtn iconbtn--danger" title="Delete" onClick={() => remove(court)}><Icon name="trash" size={15} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="muted" style={{ marginTop: 16, fontSize: 12.5 }}>
        {courtNames.length} court type(s) loaded. Courts are used in case forms and filters.
      </p>

      <DebugPanel logs={logs} error={lastError} result={lastResult} onClear={clearLogs} onCopy={copyLogs} />
    </div>
  );
}
