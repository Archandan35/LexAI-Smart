import { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import CaseSelect from './CaseSelect.jsx';
import FileDrop from './FileDrop.jsx';
import { Field, Input, Select, Textarea } from './Field.jsx';
import DocEditor from './DocEditor.jsx';
import SmartOrderSheetBuilder from './SmartOrderSheetBuilder.jsx';
import CrudManager from './CrudManager.jsx';
import { useCaseStatuses } from '@/hooks/useCaseStatuses.js';
import { usePartyTypes } from '@/hooks/usePartyTypes.js';
import { orderSheetLogic } from '@/logic/orderSheetLogic.js';
import { templateLogic } from '@/logic/templateLogic.js';
import { fileLogic } from '@/logic/fileLogic.js';
import { caseLogic } from '@/logic/caseLogic.js';
import { caseStatusLogic } from '@/logic/caseStatusLogic.js';
import { useAppData } from '@/data-layer/AppDataContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useFormat } from '@/utils/format.js';

const EMPTY_HEARING = { caseId: '', date: '', status: '', purpose: '', nextHearingDate: '', postedFor: '', notes: '', judge: '', docRef: null, docName: '', summary: '' };

const FIELD_MAP = {
  caseid: 'caseId', case_id: 'caseId', 'case number': 'caseId', case: 'caseId',
  date: 'date', 'hearing date': 'date', 'hearing date & time': 'date',
  status: 'status', 'hearing status': 'status',
  purpose: 'purpose',
  nexthearingdate: 'nextHearingDate', 'next hearing date': 'nextHearingDate',
  postedfor: 'postedFor', 'posted for': 'postedFor', 'posted_for': 'postedFor',
  notes: 'notes', proceedings: 'notes', content: 'notes',
  summary: 'summary', 'hearing summary': 'summary',
  judge: 'judge', 'presiding officer': 'judge', officer: 'judge',
  docref: 'docRef', doc_ref: 'docRef', 'document ref': 'docRef',
  docname: 'docName', doc_name: 'docName', 'document name': 'docName', file: 'docName',
};

export default function HearingFormModal({ open, onClose, onSaved, initialCaseId, editing }) {
  const { formatDate } = useFormat();
  const toast = useToast();
  const { user } = useAuth();
  const { cases } = useAppData();
  const { statuses: caseStatuses, refresh: refreshStatuses } = useCaseStatuses();
  const { partyTypes, refresh: refreshPartyTypes } = usePartyTypes();

  const [form, setForm] = useState(EMPTY_HEARING);
  const [draftTemplates, setDraftTemplates] = useState([]);
  const [editorContent, setEditorContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [smartMode, setSmartMode] = useState(false);
  const [showStatusCrud, setShowStatusCrud] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          ...EMPTY_HEARING,
          ...editing,
          date: toDateInput(editing.date),
          nextHearingDate: toDateInput(editing.nextHearingDate),
        });
        setEditorContent(editing.notes || '');
      } else {
        setForm({ ...EMPTY_HEARING, caseId: initialCaseId || '' });
        setEditorContent('');
      }
      setSelectedTemplate('');
      setShowImport(false);
      setImportText('');
      setSmartMode(false);
      setShowStatusCrud(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      (async () => {
        const list = await templateLogic.list();
        setDraftTemplates(Array.isArray(list) ? list : (list.ok ? list.data : []));
      })();
    }
  }, [open]);

  const toDateInput = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toISOString().split('T')[0];
  };

  const getCaseDetails = useCallback((caseId) => {
    if (!caseId) return null;
    return cases.find((c) => c.id === caseId) || null;
  }, [cases]);

  const formatCaseNumber = useCallback((c) => {
    if (!c) return '';
    const ct = c.case_type || '';
    const cn = c.case_number || c.caseNumber || c.case_display_number;
    const cy = c.case_year || '';
    if (ct && cn && cy) return `${ct} ${cn}/${cy}`;
    if (cn && typeof cn === 'string') return cn;
    if (c.case_display_number) return c.case_display_number;
    if (c.caseNumber) return c.caseNumber;
    return cn ? String(cn) : '';
  }, []);

  const hearingShortcodes = useMemo(() => {
    const caseData = getCaseDetails(form.caseId);
    const nd = (form.nextHearingDate && /^\d{4}-\d{2}-\d{2}$/.test(form.nextHearingDate))
      ? new Date(form.nextHearingDate)
      : (caseData?.nextHearing ? new Date(caseData.nextHearing) : null);
    const today = new Date();
    return [
      { label: 'Case Number', value: formatCaseNumber(caseData) || caseData?.caseNumber || caseData?.case_display_number || '{caseNumber}' },
      { label: 'Parties / Title', value: caseData?.title || '{parties}' },
      { label: 'Court', value: caseData?.court || '{court}' },
      { label: 'Judge / Officer', value: caseData?.judge || '{judge}' },
      { label: 'Stage', value: caseData?.stage || '{stage}' },
      { label: 'Hearing Date', value: formatDate(form.date) || form.date || '{hearingDate}' },
      { label: 'Next Hearing Date', value: nd ? formatDate(nd) : form.nextHearingDate || '{nextHearingDate}' },
      { label: 'Purpose', value: form.purpose || '{purpose}' },
      { label: 'Status', value: form.status || '{status}' },
      { label: "Today's Date", value: formatDate(today) },
    ];
  }, [form, getCaseDetails, formatCaseNumber]);

  const resolveShortcodes = useCallback((text, caseData) => {
    if (!text) return '';
    const c = caseData || {};
    const d = form.date ? new Date(form.date) : new Date();
    const nd = (form.nextHearingDate && /^\d{4}-\d{2}-\d{2}$/.test(form.nextHearingDate))
      ? new Date(form.nextHearingDate)
      : (c.nextHearing ? new Date(c.nextHearing) : null);
    const today = new Date();
    return text
      .replace(/\{caseNumber\}/g, formatCaseNumber(c) || c.caseNumber || c.case_display_number || '—')
      .replace(/\{parties\}/g, c.title || '—')
      .replace(/\{court\}/g, c.court || '—')
      .replace(/\{judge\}/g, c.judge || '—')
      .replace(/\{stage\}/g, c.stage || '—')
      .replace(/\{hearingDate\}/g, formatDate(form.date) || formatDate(d))
      .replace(/\{nextHearingDate\}/g, nd ? formatDate(nd) : '—')
      .replace(/\{purpose\}/g, form.purpose || '—')
      .replace(/\{status\}/g, form.status || '—')
      .replace(/\{todayDate\}/g, formatDate(today));
  }, [form, formatCaseNumber]);

  const applyTemplate = useCallback((tplId) => {
    if (!tplId) return;
    const tpl = draftTemplates.find((t) => t.id === tplId || t._id === tplId);
    if (!tpl) return;
    const caseData = getCaseDetails(form.caseId);
    const resolved = resolveShortcodes(tpl.content || '', caseData);
    setEditorContent(resolved);
  }, [draftTemplates, getCaseDetails, resolveShortcodes, form.caseId]);

  const onHearingFile = async (file) => {
    const rec = await fileLogic.uploadDocument(file, { caseId: form.caseId || null, folder: 'Hearing' });
    setForm((f) => ({ ...f, docRef: rec.ref, docName: rec.name }));
    toast.push('File attached.', 'success');
  };

  const viewFile = async (ref) => {
    const url = await fileLogic.getUrl(ref);
    if (url) window.open(url, '_blank'); else toast.push('No preview available.', 'info');
  };

  const saveHearing = async (smartFormData) => {
    if (!form.caseId || !form.date) { toast.push('Case and date are required.', 'error'); return; }
    const payload = { ...form, ...smartFormData, notes: editorContent || form.notes || '' };
    delete payload.case; delete payload.caseNumber; delete payload.parties; delete payload.court; delete payload.stage;
    try {
      const r = editing ? await orderSheetLogic.updateHearing(editing.id, payload) : await orderSheetLogic.addHearing(payload);
      if (r && !r.ok) { toast.push(r.error || 'Failed to save hearing.', 'error'); return; }
      if (form.nextHearingDate) {
        await caseLogic.update(form.caseId, { next_hearing: form.nextHearingDate }, user);
      }
      toast.push(editing ? 'Hearing updated.' : 'Hearing added.', 'success');
      if (onSaved) onSaved();
      if (onClose) onClose();
    } catch (e) {
      toast.push(e?.message || 'An unexpected error occurred.', 'error');
    }
  };

  const parseCsvRow = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  };

  const importData = (raw) => {
    const text = (raw || '').trim();
    if (!text) { toast.push('No data to import.', 'error'); return; }
    let parsed;
    if (text.startsWith('{') || text.startsWith('[')) {
      try { parsed = JSON.parse(text); } catch { toast.push('Invalid JSON.', 'error'); return; }
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      if (arr.length === 0) { toast.push('No records found.', 'error'); return; }
      const row = arr[0];
      const mapped = {};
      Object.keys(row).forEach((k) => {
        const target = FIELD_MAP[k.toLowerCase().trim()];
        if (target) mapped[target] = row[k];
      });
      applyImport(mapped);
    } else {
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) { toast.push('CSV must have a header row and at least one data row.', 'error'); return; }
      const headers = parseCsvRow(lines[0]).map((h) => h.toLowerCase());
      const vals = parseCsvRow(lines[1]);
      const mapped = {};
      headers.forEach((h, i) => {
        const target = FIELD_MAP[h];
        if (target) mapped[target] = vals[i] || '';
      });
      applyImport(mapped);
    }
  };

  const applyImport = (mapped) => {
    setForm((f) => ({ ...f, ...mapped }));
    if (mapped.notes) setEditorContent(mapped.notes);
    setShowImport(false);
    setImportText('');
    toast.push('Import applied to form.', 'success');
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setImportText(text);
      importData(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportAsJson = () => {
    const payload = { ...form, notes: editorContent || form.notes || '' };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hearing_${form.caseId || 'new'}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.push('JSON exported.', 'success');
  };

  const exportAsCsv = () => {
    const payload = { ...form, notes: editorContent || form.notes || '' };
    const headers = ['caseId', 'date', 'status', 'purpose', 'nextHearingDate', 'postedFor', 'notes', 'summary', 'judge', 'docRef', 'docName'];
    const vals = headers.map((h) => `"${(payload[h] || '').replace(/"/g, '""')}"`);
    const csv = [headers.join(','), vals.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hearing_${form.caseId || 'new'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.push('CSV exported.', 'success');
  };

  return (
    <>
      <Modal
        open={open}
        title={smartMode ? 'Smart Order Builder' : (editing ? 'Edit Order Sheet' : 'Add Order Sheet')}
        size="lg"
        className={smartMode ? 'order-sheet-preview-modal smart-mode' : ''}
        onClose={() => { if (onClose) onClose(); setSmartMode(false); }}
        footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon="save" onClick={() => saveHearing()}>{editing ? 'Update' : 'Add'}</Button></>}
      >
        {smartMode ? (
          <>
            <div className="hearing-modal__import-export-bar">
              <div className="hearing-modal__ie-left">
                <button className="btn btn--sm btn--ghost" onClick={() => setSmartMode((v) => !v)}>
                  <Icon name="compass" size={13} /> Normal Mode
                </button>
              </div>
            </div>
            <div className="hearing-modal__template-bar">
              <div className="hearing-modal__template-bar-left">
                <Icon name="copy" size={14} />
                <span>Import Template:</span>
                <select
                  className="hearing-modal__template-select"
                  value={selectedTemplate}
                  onChange={(e) => { setSelectedTemplate(e.target.value); applyTemplate(e.target.value); }}
                >
                  <option value="">— Select a drafting template —</option>
                  {draftTemplates.filter((t) => t.category === 'Hearing').map((t) => (
                    <option key={t.id || t._id} value={t.id || t._id}>{t.name}</option>
                  ))}
                </select>
              </div>
              {editorContent && (
                <button className="hearing-modal__clear-btn" onClick={() => { setEditorContent(''); setSelectedTemplate(''); }}>
                  <Icon name="close" size={12} /> Clear
                </button>
              )}
            </div>
            <SmartOrderSheetBuilder
              hearing={form}
              partyTypes={partyTypes}
              caseStatuses={caseStatuses}
              onSave={saveHearing}
              onClose={() => { if (onClose) onClose(); setSmartMode(false); }}
              onRefreshPartyTypes={refreshPartyTypes}
              onRefreshStatuses={refreshStatuses}
            />
          </>
        ) : (
          <div className="hearing-modal">
            <div className="hearing-modal__import-export-bar">
              <div className="hearing-modal__ie-left">
                <button className={`btn btn--sm ${showImport ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setShowImport((v) => !v)}>
                  <Icon name="download" size={13} /> Import
                </button>
                <label className="btn btn--sm btn--ghost pointer-cursor">
                  <Icon name="upload" size={13} /> Export
                  <select className="hearing-modal__ie-export-select" onChange={(e) => { const v = e.target.value; if (v === 'json') exportAsJson(); if (v === 'csv') exportAsCsv(); e.target.value = ''; }} onClick={(e) => e.stopPropagation()}>
                    <option value="">—</option>
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                  </select>
                </label>
                <button className={`btn btn--sm ${smartMode ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setSmartMode((v) => !v)}>
                  <Icon name="compass" size={13} /> Smart Mode
                </button>
              </div>
              {showImport && (
                <div className="hearing-modal__ie-right">
                  <input type="file" accept=".json,.csv" onChange={handleImportFile} className="hidden" id="hearing-import-file" />
                  <label htmlFor="hearing-import-file" className="btn btn--sm btn--ghost pointer-cursor"><Icon name="file" size={13} /> Upload File</label>
                </div>
              )}
            </div>

            {showImport && (
              <div className="hearing-modal__import-panel">
                <textarea
                  className="hearing-modal__import-textarea"
                  placeholder="Paste JSON or CSV here...&#10;&#10;JSON example:&#10;{&quot;caseId&quot;: &quot;...&quot;, &quot;date&quot;: &quot;2026-06-25&quot;, &quot;status&quot;: &quot;Active&quot;, &quot;purpose&quot;: &quot;Hearing&quot;, &quot;nextHearingDate&quot;: &quot;2026-07-10&quot;, &quot;postedFor&quot;: &quot;Defendant Evidence&quot;, &quot;judge&quot;: &quot;Judge name&quot; }&#10;&#10;CSV example:&#10;caseId,date,status,purpose,nextHearingDate,postedFor,judge&#10;abc123,2026-06-25,Active,Hearing,2026-07-10,Defendant Evidence,Judge name"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={4}
                />
                <div className="hearing-modal__import-actions">
                  <Button size="sm" variant="ghost" onClick={() => { setShowImport(false); setImportText(''); }}>Cancel</Button>
                  <Button size="sm" onClick={() => importData(importText)}><Icon name="check" size={13} /> Apply Import</Button>
                </div>
              </div>
            )}

            <div className="hearing-modal__section">
              <div className="hearing-modal__section-title">
                <Icon name="target" size={16} />
                <span>Case Detail</span>
              </div>
              <div className="input-row">
                <Field label="Case Number">
                  <CaseSelect value={form.caseId} onChange={(v) => { setForm({ ...form, caseId: v }); setEditorContent(''); setSelectedTemplate(''); }} />
                </Field>
                <Field label="Judge">
                  <Input
                    value={form.judge || getCaseDetails(form.caseId)?.judge || ''}
                    onChange={(e) => setForm({ ...form, judge: e.target.value })}
                    placeholder="Judge name"
                  />
                </Field>
              </div>
              {form.caseId && (() => {
                const cd = getCaseDetails(form.caseId);
                return cd ? (
                  <div className="hearing-modal__case-preview">
                    <Icon name="balance" size={13} />
                    <div className="hearing-modal__case-preview-text">
                      <span className="hearing-modal__case-preview-number">{formatCaseNumber(cd) || cd.caseNumber || cd.case_display_number}</span>
                      <span className="hearing-modal__case-preview-title">{cd.title}</span>
                    </div>
                    <span className="hearing-modal__case-preview-badge">{cd.court || '—'}</span>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="hearing-modal__section">
              <div className="hearing-modal__section-title">
                <Icon name="settings" size={16} />
                <span>Hearing Details</span>
              </div>
              <div className="input-row">
                <Field label="Hearing Date">
                  <Input
                    type="date"
                    value={form.date && /^\d{4}-\d{2}-\d{2}$/.test(form.date) ? form.date : ''}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </Field>
                <Field label="Status">
                  <div className="hearing-modal__status-row">
                    <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="">Select status…</option>
                      {caseStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                    <button className="hearing-modal__gear-btn" title="Manage case statuses" onClick={() => setShowStatusCrud(true)}>
                      <Icon name="gear" size={15} />
                    </button>
                  </div>
                </Field>
              </div>
              <div className="input-row">
                <Field label="Purpose">
                  <Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. Defendant Evidence" />
                </Field>
                <Field label="Next Hearing Date">
                  <Input type="date" value={form.nextHearingDate && /^\d{4}-\d{2}-\d{2}$/.test(form.nextHearingDate) ? form.nextHearingDate : ''} onChange={(e) => setForm({ ...form, nextHearingDate: e.target.value })} />
                </Field>
              </div>
              <div className="input-row">
                <Field label="Next Hearing Purpose">
                  <Input value={form.postedFor} onChange={(e) => setForm({ ...form, postedFor: e.target.value })} placeholder="e.g. Defendant Evidence, Arguments" />
                </Field>
              </div>
            </div>

            <div className="hearing-modal__section hearing-modal__section--grow">
              <div className="hearing-modal__section-title">
                <Icon name="file" size={16} />
                <span>Proceedings</span>
              </div>
              <div className="hearing-modal__template-bar">
                <div className="hearing-modal__template-bar-left">
                  <Icon name="copy" size={14} />
                  <span>Import Template:</span>
                  <select
                    className="hearing-modal__template-select"
                    value={selectedTemplate}
                    onChange={(e) => { setSelectedTemplate(e.target.value); applyTemplate(e.target.value); }}
                  >
                    <option value="">— Select a drafting template —</option>
                    {draftTemplates.filter((t) => t.category === 'Hearing').map((t) => (
                      <option key={t.id || t._id} value={t.id || t._id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                {editorContent && (
                  <button className="hearing-modal__clear-btn" onClick={() => { setEditorContent(''); setSelectedTemplate(''); }}>
                    <Icon name="close" size={12} /> Clear
                  </button>
                )}
              </div>
              <div className="hearing-modal__editor-wrapper">
                <DocEditor
                  value={editorContent}
                  onChange={setEditorContent}
                  pageSize="letter"
                  margin="narrow"
                  placeholders={hearingShortcodes}
                />
              </div>
            </div>

            <div className="hearing-modal__section">
              <div className="hearing-modal__section-title">
                <Icon name="paperclip" size={16} />
                <span>Attachment</span>
              </div>
              {form.docName ? (
                <div className="list-row order-sheet__file-row">
                  <div className="list-row__icon"><Icon name="file" size={15} /></div>
                  <div className="order-sheet__file-name">{form.docName}</div>
                  <Button size="sm" variant="ghost" icon="eye" onClick={() => viewFile(form.docRef)}>View</Button>
                  <button className="btn btn--danger btn--sm" onClick={() => setForm({ ...form, docRef: null, docName: '' })}>
                    <Icon name="close" size={13} />
                  </button>
                </div>
              ) : (
                <FileDrop onFile={onHearingFile} hint="Attach order sheet / hearing documents" />
              )}
            </div>
          </div>
        )}
      </Modal>

      <CrudManager
        open={showStatusCrud}
        onClose={() => { setShowStatusCrud(false); refreshStatuses(); }}
        entity="Case Status"
        config={{ logic: caseStatusLogic, fields: [{ key: 'name', label: 'Status Name', placeholder: 'Enter status name' }], defaults: {}, refresh: refreshStatuses }}
      />
    </>
  );
}
