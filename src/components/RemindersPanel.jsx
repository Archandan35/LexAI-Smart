import React, { useEffect, useState, useCallback } from 'react';
import Card from './Card.jsx';
import Button from './Button.jsx';
import Badge from './Badge.jsx';
import Icon from './Icon.jsx';
import Modal from './Modal.jsx';
import EmptyState from './EmptyState.jsx';
import PermissionGate from './PermissionGate.jsx';
import SearchableSelect from './SearchableSelect.jsx';
import CrudManager from './CrudManager.jsx';
import { Field, Input } from './Field.jsx';
import { reminderLogic } from '@/logic/reminderLogic.js';
import { reminderTypesLogic } from '@/logic/reminderTypesLogic.js';
import { caseLogic } from '@/logic/caseLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { formatDate } from '@/utils/format.js';

function dayDiff(date) {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

export default function RemindersPanel({ caseId, onChanged }) {
  const toast = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [typeOptions, setTypeOptions] = useState([]);
  const [caseOptions, setCaseOptions] = useState([]);
  const [form, setForm] = useState({ title: '', type: '', caseId, date: '' });
  const [typeMgr, setTypeMgr] = useState(false);

  const load = useCallback(async () => { setItems(await reminderLogic.list(caseId)); }, [caseId]);
  useEffect(() => { load(); }, [load]);

  const loadTypes = useCallback(async () => {
    const rows = await reminderTypesLogic.list();
    const names = Array.isArray(rows) ? rows.map((r) => r.name).filter(Boolean) : [];
    setTypeOptions(names);
  }, []);

  const loadCases = useCallback(async () => {
    const rows = await caseLogic.list();
    setCaseOptions(Array.isArray(rows) ? rows : []);
  }, []);

  useEffect(() => { loadTypes(); loadCases(); }, [loadTypes, loadCases]);

  useEffect(() => {
    if (!open) return;
    loadTypes();
    loadCases();
  }, [open, loadTypes, loadCases]);

  const add = async () => {
    const targetCaseId = form.caseId || caseId;
    const res = await reminderLogic.add(targetCaseId, form, user);
    if (res.ok) {
      toast.push('Reminder added.', 'success');
      setOpen(false);
      setForm({ title: '', type: '', caseId, date: '' });
      load();
      onChanged?.();
    } else toast.push(res.error, 'error');
  };
  const toggle = async (r) => { await reminderLogic.toggle(r); load(); onChanged?.(); };
  const remove = async (r) => { if (confirm('Delete this reminder?')) { await reminderLogic.remove(r.id); load(); onChanged?.(); } };

  const caseOptionsFormatted = caseOptions.map((c) => ({
    value: c.id,
    label: c.case_display_number || c.caseNumber || c.case_number || c.id,
  }));

  return (
    <Card
      title={`Reminders (${items.length})`}
      sub="Hearing, filing, evidence & compliance deadlines"
      actions={<PermissionGate perm="casevault.edit"><Button size="sm" variant="ghost" icon="plus" onClick={() => setOpen(true)}>Add</Button></PermissionGate>}
    >
      {items.length === 0 ? <EmptyState icon="clock" title="No reminders." /> : (
        <div className="reminder-list">
          {items.map((r) => {
            const diff = dayDiff(r.date);
            const tone = r.done ? 'grey' : diff < 0 ? 'red' : diff <= 2 ? 'amber' : 'navy';
            const when = r.done ? 'done' : diff < 0 ? `overdue ${-diff}d` : diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : `in ${diff}d`;
            return (
              <div key={r.id} className={`reminder-row ${r.done ? 'reminder-row--done' : ''}`}>
                <button className="iconbtn" title={r.done ? 'Mark pending' : 'Mark done'} onClick={() => toggle(r)}>
                  <Icon name={r.done ? 'check' : 'clock'} size={15} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="reminder-row__title">{r.title}</div>
                  <div className="list-row__meta">{r.type} · {formatDate(r.date)}</div>
                </div>
                <Badge tone={tone}>{when}</Badge>
                <PermissionGate perm="casevault.edit"><button className="iconbtn iconbtn--danger" title="Delete" onClick={() => remove(r)}><Icon name="trash" size={14} /></button></PermissionGate>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} title="Add Reminder" onClose={() => setOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button icon="save" onClick={add}>Add</Button></>}>
        <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. File written statement" autoFocus /></Field>
        <Field label="Type">
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              className="select"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              style={{ flex: 1 }}
            >
              <option value="">Select type…</option>
              {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="button" className="btn btn--ghost btn--sm" title="Manage reminder types" onClick={() => setTypeMgr(true)}><Icon name="gear" size={15} /></button>
          </div>
        </Field>
        <Field label="Case">
          <SearchableSelect
            value={form.caseId}
            onChange={(e) => setForm({ ...form, caseId: e.target.value })}
            options={caseOptionsFormatted}
            placeholder="Select case…"
          />
        </Field>
        <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
      </Modal>

      <CrudManager open={typeMgr} onClose={() => { setTypeMgr(false); loadTypes(); }} entity="Reminder Type" config={{ logic: reminderTypesLogic, fields: [{ key: 'name', label: 'Reminder Type Name', placeholder: 'e.g., Hearing Date' }, { key: 'description', label: 'Description', placeholder: 'Optional description' }], defaults: {}, refresh: loadTypes }} />
    </Card>
  );
}
