import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Modal from '@/components/Modal.jsx';
import Badge from '@/components/Badge.jsx';
import Icon from '@/components/Icon.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import CaseSelect from '@/components/CaseSelect.jsx';
import FileDrop from '@/components/FileDrop.jsx';
import { Field, Input, Textarea, Select } from '@/components/Field.jsx';
import { HEARING_STATUS } from '@/constants/courts.js';
import { causeListLogic } from '@/logic/causeListLogic.js';
import { fileLogic } from '@/logic/fileLogic.js';
import { useAppData } from '@/data-layer/AppDataContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { formatDate } from '@/utils/format.js';

const EMPTY_HEARING = { caseId: '', date: '', status: HEARING_STATUS[0], purpose: '', notes: '', description: '', docRef: null, docName: '' };

export default function CauseList() {
  const toast = useToast();
  const { cases, refreshCases } = useAppData();
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState('list'); // list | templates
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_HEARING);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [tplOpen, setTplOpen] = useState(false);
  const [tplForm, setTplForm] = useState({ name: '', historyFormat: '{date} — {stage} — {purpose} — {status}' });
  const [tplEditing, setTplEditing] = useState(null);
  const [selectedTpl, setSelectedTpl] = useState(null);

  // History view
  const [histCaseId, setHistCaseId] = useState('');
  const [history, setHistory] = useState(null);

  const loadList = useCallback(async () => {
    const res = await causeListLogic.causeList();
    setRows(res.ok ? res.data.rows : []);
  }, []);

  const loadTemplates = useCallback(async () => {
    const t = await causeListLogic.listTemplates();
    setTemplates(t);
    setSelectedTpl((prev) => prev || t.find((x) => x.isDefault) || t[0] || null);
  }, []);

  useEffect(() => { loadList(); loadTemplates(); }, [loadList, loadTemplates]);

  // ----- Hearing CRUD -----
  const openNew = () => { setEditing(null); setForm(EMPTY_HEARING); setOpen(true); };
  const openEdit = (h) => { setEditing(h); setForm({ ...EMPTY_HEARING, ...h }); setOpen(true); };

  const onHearingFile = async (file) => {
    const rec = await fileLogic.uploadDocument(file, { caseId: form.caseId || null, folder: 'Hearing' });
    setForm((f) => ({ ...f, docRef: rec.ref, docName: rec.name }));
    toast.push('File attached.', 'success');
  };

  const viewFile = async (ref) => {
    const url = await fileLogic.getUrl(ref);
    if (url) window.open(url, '_blank'); else toast.push('No preview available.', 'info');
  };

  const saveHearing = async () => {
    if (!form.caseId || !form.date) { toast.push('Case and date are required.', 'error'); return; }
    if (editing) await causeListLogic.updateHearing(editing.id, form);
    else await causeListLogic.addHearing(form);
    setOpen(false);
    await loadList();
    toast.push(editing ? 'Hearing updated.' : 'Hearing added.', 'success');
  };

  const deleteHearing = async (id) => {
    await causeListLogic.deleteHearing(id);
    await loadList();
    toast.push('Hearing deleted.', 'info');
  };

  // ----- Template CRUD -----
  const openTplNew = () => { setTplEditing(null); setTplForm({ name: '', historyFormat: '{date} — {stage} — {purpose} — {status}' }); setTplOpen(true); };
  const openTplEdit = (t) => { setTplEditing(t); setTplForm({ name: t.name, historyFormat: t.historyFormat }); setTplOpen(true); };

  const saveTpl = async () => {
    if (!tplForm.name) { toast.push('Template name required.', 'error'); return; }
    if (tplEditing) await causeListLogic.updateTemplate(tplEditing.id, tplForm);
    else await causeListLogic.addTemplate({ ...tplForm, fields: ['caseNumber', 'parties', 'court', 'stage', 'purpose', 'date', 'status'] });
    setTplOpen(false);
    await loadTemplates();
    toast.push(tplEditing ? 'Template updated.' : 'Template added.', 'success');
  };

  const deleteTpl = async (id) => {
    await causeListLogic.deleteTemplate(id);
    await loadTemplates();
    toast.push('Template deleted.', 'info');
  };

  const loadHistory = async (caseId) => {
    setHistCaseId(caseId);
    if (!caseId) { setHistory(null); return; }
    const res = await causeListLogic.caseHistory(caseId, selectedTpl);
    setHistory(res.ok ? res.data : null);
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="calendar"
        title="Cause List"
        subtitle="Daily cause list across all matters. Add hearing dates & status, attach & view files, record case descriptions, and view case history in your chosen template format."
        actions={<Button icon="plus" onClick={openNew}>Add Hearing</Button>}
      />

      <div className="tabs">
        <div className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Cause List</div>
        <div className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Case History</div>
        <div className={`tab ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>Templates</div>
      </div>

      {tab === 'list' && (
        <Card title="Hearings" sub={`${rows.length} listed`}>
          {rows.length === 0 ? <EmptyState icon="calendar" title="No hearings listed." action={<Button icon="plus" onClick={openNew}>Add Hearing</Button>} /> : (
            <table className="table">
              <thead><tr><th>Date</th><th>Case Number</th><th>Parties</th><th>Court</th><th>Purpose</th><th>Status</th><th>File</th><th /></tr></thead>
              <tbody>
                {rows.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 650 }}>{formatDate(h.date)}</td>
                    <td>{h.caseNumber}</td>
                    <td>{h.parties}</td>
                    <td>{h.court}</td>
                    <td>{h.purpose || '—'}</td>
                    <td><Badge>{h.status}</Badge></td>
                    <td>{h.docRef ? <Button size="sm" variant="ghost" icon="eye" onClick={() => viewFile(h.docRef)}>View</Button> : <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>—</span>}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => openEdit(h)}><Icon name="edit" size={13} /></button>
                      <button className="btn btn--danger btn--sm" onClick={() => deleteHearing(h.id)}><Icon name="trash" size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'history' && (
        <div className="grid-sidebar">
          <Card title="Select Case & Template">
            <Field label="Case"><CaseSelect value={histCaseId} onChange={loadHistory} /></Field>
            <Field label="History Template">
              <Select value={selectedTpl?.id || ''} onChange={(e) => { const t = templates.find((x) => x.id === e.target.value); setSelectedTpl(t); if (histCaseId) loadHistory(histCaseId); }}>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <div className="alert alert--info" style={{ fontSize: 12 }}>
              <Icon name="bolt" size={14} />
              <div>History renders using the selected template's format string.</div>
            </div>
          </Card>
          <Card title="Case History" sub={history?.case ? history.case.caseNumber : 'Pick a case'}>
            {!history ? <EmptyState icon="history" title="Select a case to view its history." /> : history.lines.length === 0 ? (
              <EmptyState icon="history" title="No hearing history yet." />
            ) : (
              <div className="timeline">
                {history.lines.map((line, i) => (
                  <div className="timeline-item" key={i}>
                    <div className="timeline-item__event" style={{ fontWeight: 550 }}>{line}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'templates' && (
        <Card title="Cause List Templates" sub="Add, edit or delete history formats" actions={<Button size="sm" icon="plus" onClick={openTplNew}>New Template</Button>}>
          {templates.length === 0 ? <EmptyState icon="notes" title="No templates." /> : (
            <table className="table">
              <thead><tr><th>Name</th><th>History Format</th><th>Default</th><th /></tr></thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 650 }}>{t.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.historyFormat}</td>
                    <td>{t.isDefault ? <Badge tone="green">Default</Badge> : '—'}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => openTplEdit(t)}><Icon name="edit" size={13} /></button>
                      {!t.isDefault && <button className="btn btn--danger btn--sm" onClick={() => deleteTpl(t.id)}><Icon name="trash" size={13} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="alert alert--info" style={{ marginTop: 14, fontSize: 12 }}>
            <Icon name="bolt" size={14} />
            <div>Placeholders: <code>{'{date} {caseNumber} {parties} {court} {stage} {purpose} {status} {notes}'}</code></div>
          </div>
        </Card>
      )}

      {/* Hearing modal */}
      <Modal
        open={open}
        title={editing ? 'Edit Hearing' : 'Add Hearing'}
        size="lg"
        onClose={() => setOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button icon="save" onClick={saveHearing}>{editing ? 'Update' : 'Add'}</Button></>}
      >
        <div className="input-row">
          <Field label="Case Number"><CaseSelect value={form.caseId} onChange={(v) => setForm({ ...form, caseId: v })} /></Field>
          <Field label="Hearing Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        </div>
        <div className="input-row">
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{HEARING_STATUS.map((s) => <option key={s}>{s}</option>)}</Select>
          </Field>
          <Field label="Purpose"><Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. Plaintiff evidence" /></Field>
        </div>
        <Field label="Case Description / Proceedings"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What happened / is to happen at this hearing…" /></Field>
        <Field label="Notes"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        <Field label="Attach File">
          {form.docName ? (
            <div className="list-row" style={{ background: 'var(--surface-2)' }}>
              <div className="list-row__icon"><Icon name="file" size={15} /></div>
              <div style={{ flex: 1 }}>{form.docName}</div>
              <Button size="sm" variant="ghost" icon="eye" onClick={() => viewFile(form.docRef)}>View</Button>
              <button className="btn btn--danger btn--sm" onClick={() => setForm({ ...form, docRef: null, docName: '' })}><Icon name="close" size={13} /></button>
            </div>
          ) : <FileDrop onFile={onHearingFile} hint="Attach order sheet / document" />}
        </Field>
      </Modal>

      {/* Template modal */}
      <Modal
        open={tplOpen}
        title={tplEditing ? 'Edit Template' : 'New Template'}
        onClose={() => setTplOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setTplOpen(false)}>Cancel</Button><Button icon="save" onClick={saveTpl}>{tplEditing ? 'Update' : 'Create'}</Button></>}
      >
        <Field label="Template Name"><Input value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} placeholder="e.g. Detailed History" /></Field>
        <Field label="History Format" hint="Use placeholders to control how each hearing line renders">
          <Input value={tplForm.historyFormat} onChange={(e) => setTplForm({ ...tplForm, historyFormat: e.target.value })} />
        </Field>
        <div className="alert alert--info" style={{ fontSize: 12 }}>
          <Icon name="bolt" size={14} />
          <div>Available: <code>{'{date} {caseNumber} {parties} {court} {stage} {purpose} {status} {notes}'}</code></div>
        </div>
      </Modal>
    </div>
  );
}
