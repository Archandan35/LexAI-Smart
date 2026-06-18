import React, { useState, useCallback } from 'react';
import { useCourts } from '@/hooks/useCourts.js';
import { courtLogic } from '@/logic/courtLogic.js';

export default function CourtTypes() {
  const { courts, courtNames, loading, refresh } = useCourts();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '' });
  const [error, setError] = useState('');

  const resetForm = useCallback(() => {
    setForm({ name: '' });
    setEditing(null);
    setShowForm(false);
    setError('');
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Court name is required.'); return; }
    const res = editing
      ? await courtLogic.update(editing.id, { name: form.name, display_order: editing.display_order, status: editing.status })
      : await courtLogic.create(form);
    if (!res.ok) { setError(res.error); return; }
    resetForm();
    await refresh();
  }, [form, editing, refresh, resetForm]);

  const handleEdit = useCallback((court) => {
    setForm({ name: court.name });
    setEditing(court);
    setShowForm(true);
    setError('');
  }, []);

  const handleDelete = useCallback(async (court) => {
    if (!window.confirm(`Delete court "${court.name}"?`)) return;
    await courtLogic.remove(court.id);
    await refresh();
  }, [refresh]);

  if (loading) return <div className="page page--center"><div className="spinner" /></div>;

  return (
    <div className="page court-types">
      <div className="page__header">
        <h1 className="page__title">Court Types</h1>
        <button className="btn btn--primary" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Court
        </button>
      </div>

      {showForm && (
        <form className="card card--form court-types__form" onSubmit={handleSubmit}>
          <h3 className="card__title">{editing ? 'Edit' : 'New'} Court</h3>
          {error && <div className="form__error">{error}</div>}
          <div className="form__group">
            <label className="form__label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div className="form__actions">
            <button className="btn btn--primary" type="submit">{editing ? 'Update' : 'Create'}</button>
            <button className="btn btn--ghost" type="button" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

      <div className="table-wrapper">
        <table className="table court-types__table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Order</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courts.length === 0 ? (
              <tr><td className="court-types__empty" colSpan={3}>No court types found.</td></tr>
            ) : courts.map((court) => (
              <tr key={court.id}>
                <td style={{ fontWeight: 600 }}>{court.name}</td>
                <td>{court.display_order}</td>
                <td>
                  <button className="btn btn--sm btn--ghost" onClick={() => handleEdit(court)} title="Edit">✎</button>
                  <button className="btn btn--sm btn--ghost btn--danger" onClick={() => handleDelete(court)} title="Delete">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="page__hint" style={{ marginTop: 16, color: 'var(--text-faint)', fontSize: 12.5 }}>
        {courtNames.length} court type(s) loaded. Courts are used in case forms and filters.
      </p>
    </div>
  );
}
