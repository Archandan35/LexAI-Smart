import React, { useEffect, useState, useCallback } from 'react';
import Card from './Card.jsx';
import Button from './Button.jsx';
import Badge from './Badge.jsx';
import Icon from './Icon.jsx';
import Modal from './Modal.jsx';
import EmptyState from './EmptyState.jsx';
import PermissionGate from './PermissionGate.jsx';
import { Field, Input, Select } from './Field.jsx';
import { reminderLogic, REMINDER_TYPES } from '@/logic/reminderLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { formatDate } from '@/utils/format.js';

function dayDiff(date) {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

// RemindersPanel — add / complete / delete case reminders with deadline cues.
export default function RemindersPanel({ caseId, onChanged }) {
  const toast = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: REMINDER_TYPES[0], title: '', date: '' });

  const load = useCallback(async () => { setItems(await reminderLogic.list(caseId)); }, [caseId]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const res = await reminderLogic.add(caseId, form, user);
    if (res.ok) { toast.push('Reminder added.', 'success'); setOpen(false); setForm({ type: REMINDER_TYPES[0], title: '', date: '' }); load(); onChanged?.(); }
    else toast.push(res.error, 'error');
  };
  const toggle = async (r) => { await reminderLogic.toggle(r); load(); onChanged?.(); };
  const remove = async (r) => { if (confirm('Delete this reminder?')) { await reminderLogic.remove(r.id); load(); onChanged?.(); } };

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
        <Field label="Type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{REMINDER_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. File written statement" autoFocus /></Field>
        <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
      </Modal>
    </Card>
  );
}
