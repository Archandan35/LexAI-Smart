import { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Modal from '@/components/Modal.jsx';
import Icon from '@/components/Icon.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import CaseSelect from '@/components/CaseSelect.jsx';
import FileDrop from '@/components/FileDrop.jsx';
import { Field, Input, Select } from '@/components/Field.jsx';
import DocEditor from '@/components/DocEditor.jsx';
import CrudManager from '@/components/CrudManager.jsx';
import DataTable from '@/components/DataTable.jsx';
import OrderSheetPreviewModal from '@/components/OrderSheetPreviewModal.jsx';
import { useCaseStatuses } from '@/hooks/useCaseStatuses.js';
import { usePartyTypes } from '@/hooks/usePartyTypes.js';
import { orderSheetLogic } from '@/logic/orderSheetLogic.js';
import SmartOrderSheetBuilder from '@/components/SmartOrderSheetBuilder.jsx';
import { templateLogic } from '@/logic/templateLogic.js';
import { fileLogic } from '@/logic/fileLogic.js';
import { caseLogic } from '@/logic/caseLogic.js';
import { caseStatusLogic } from '@/logic/caseStatusLogic.js';
import { useAppData } from '@/data-layer/AppDataContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { formatDate, stripHtml } from '@/utils/format.js';
import { FieldMapper } from '@/core/FieldMapper.js';
import { extractJurisdiction } from '@/utils/caseFormat.js';

const EMPTY_HEARING = { caseId: '', date: '', status: '', purpose: '', nextHearingDate: '', postedFor: '', notes: '', judge: '', docRef: null, docName: '', summary: '' };
const EMPTY_TPL = { name: '', category: 'Hearing', description: '', content: '' };

export default function OrderSheet() {
  const toast = useToast();
  const { user } = useAuth();
  const { cases } = useAppData();
  const { statuses: caseStatuses, refresh: refreshStatuses } = useCaseStatuses();
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState('list'); // list | history | templates | timeline
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_HEARING);

  // Advanced filters state for Order Sheet Tab
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourt, setFilterCourt] = useState('');
  const [filterCourtLocation, setFilterCourtLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tempDateFrom, setTempDateFrom] = useState('');
  const [tempDateTo, setTempDateTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStatusCrud, setShowStatusCrud] = useState(false);
  const [smartMode, setSmartMode] = useState(false);
  const { partyTypes, refresh: refreshPartyTypes } = usePartyTypes();

  // Sorting & Pagination for Order Sheet Tab
  const [sortDir, setSortDir] = useState('asc'); // asc | desc
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    case: true,
    court: true,
    bench: true,
    purpose: true,
    nextHearingDate: true,
    postedFor: true,
    judge: true,
    status: true,
    actions: true,
  });
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 991px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    handler(mql);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Templates Tab
  const [tplList, setTplList] = useState([]);
  const [tplOpen, setTplOpen] = useState(false);
  const [tplForm, setTplForm] = useState(EMPTY_TPL);
  const [tplEditing, setTplEditing] = useState(null);
  const [tplViewMode, setTplViewMode] = useState(false);
  const [tplSearch, setTplSearch] = useState('');
  const [tplCategory, setTplCategory] = useState('');
  const [tplPage, setTplPage] = useState(1);

  const tplColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'description', label: 'Description' },
    { key: 'actions', label: '', width: 120, render: (row) => (
      <div style={{ display: 'flex', gap: 2 }}>
        <button className="order-sheet__tpl-action" title="View" onClick={(e) => { e.stopPropagation(); openTplView(row); }}><Icon name="eye" size={13} /></button>
        <button className="order-sheet__tpl-action" title="Edit" onClick={(e) => { e.stopPropagation(); openTplEdit(row); }}><Icon name="edit" size={13} /></button>
        <button className="order-sheet__tpl-action" title="Duplicate" onClick={(e) => { e.stopPropagation(); duplicateTpl(row); }}><Icon name="copy" size={13} /></button>
        <button className="order-sheet__tpl-action" title="Delete" onClick={(e) => { e.stopPropagation(); deleteTpl(row); }}><Icon name="trash" size={13} /></button>
      </div>
    )},
  ];

  // Case History & Timeline views
  const [histCaseId, setHistCaseId] = useState('');
  const [history, setHistory] = useState(null);

  // Rich text editor state
  const [draftTemplates, setDraftTemplates] = useState([]);
  const [editorContent, setEditorContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [previewHearing, setPreviewHearing] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  const loadList = useCallback(async () => {
    const res = await orderSheetLogic.orderSheet();
    setRows(res.ok ? res.data.rows : []);
  }, []);

  const loadDraftingTemplates = useCallback(async () => {
    const list = await templateLogic.list();
    const ok = Array.isArray(list) ? list : (list.ok ? list.data : []);
    setTplList(ok);
    setDraftTemplates(ok);
  }, []);

  useEffect(() => {
    loadList();
    loadDraftingTemplates();
  }, [loadList, loadDraftingTemplates]);

  // Sync selected case history if case list loads
  const loadHistory = useCallback(async (caseId) => {
    setHistCaseId(caseId);
    if (!caseId) { setHistory(null); return; }
    const res = await orderSheetLogic.caseHistory(caseId);
    setHistory(res.ok ? res.data : null);
  }, []);

  // When cases list loads, auto-select first case for convenience
  useEffect(() => {
    if (cases.length > 0 && !histCaseId) {
      loadHistory(cases[0]?.id);
    }
  }, [cases, histCaseId, loadHistory]);

  // ----- Hearing CRUD -----
  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_HEARING);
    setEditorContent('');
    setSelectedTemplate('');
    setOpen(true);
  };
  const toDateInput = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toISOString().split('T')[0];
  };

  const openEdit = async (h) => {
    const res = await orderSheetLogic.getHearing(h.id);
    const record = res.ok ? res.data : FieldMapper.toLexAI('hearings', h);
    delete record.case; delete record.caseNumber; delete record.parties; delete record.court; delete record.stage;
    setEditing(record);
    setForm({
      ...EMPTY_HEARING,
      ...record,
      date: toDateInput(record.date),
      nextHearingDate: toDateInput(record.nextHearingDate),
    });
    setEditorContent(record.notes || '');

    setSelectedTemplate('');
    setOpen(true);
  };

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
      // Sync next hearing date to the case record
      if (form.nextHearingDate) {
        await caseLogic.update(form.caseId, { next_hearing: form.nextHearingDate }, user);
      }
      setOpen(false);
      await loadList();
      if (histCaseId) await loadHistory(histCaseId);
      toast.push(editing ? 'Hearing updated.' : 'Hearing added.', 'success');
    } catch (e) {
      toast.push(e?.message || 'An unexpected error occurred.', 'error');
    }
  };

  const deleteHearing = async (id) => {
    if (!window.confirm('Delete this order sheet entry?')) return;
    await orderSheetLogic.deleteHearing(id);
    await loadList();
    if (histCaseId) await loadHistory(histCaseId);
    toast.push('Cause list entry deleted.', 'info');
  };

  const deleteSelected = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} selected entries?`)) return;
    for (const id of selectedIds) {
      await orderSheetLogic.deleteHearing(id);
    }
    setSelectedIds(new Set());
    await loadList();
    if (histCaseId) await loadHistory(histCaseId);
    toast.push(`${selectedIds.size} entries deleted.`, 'info');
  };

  const duplicateHearing = (h) => {
    const record = FieldMapper.toLexAI('hearings', h);
    // Strip enrichment fields added by orderSheetLogic.orderSheet()
    delete record.case; delete record.caseNumber; delete record.parties; delete record.court; delete record.stage;
    setEditing(null);
    setForm({
      ...EMPTY_HEARING,
      ...record,
      id: undefined,
      date: toDateInput(record.date),
      nextHearingDate: toDateInput(record.nextHearingDate),
    });
    setEditorContent(record.notes || '');

    setSelectedTemplate('');
    setOpen(true);
    toast.push('Editing duplicated record. Save to create a new entry.', 'info');
  };

  // ----- Import / Export -----
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

  // ----- Templates CRUD -----
  const openTplNew = () => { setTplEditing(null); setTplViewMode(false); setTplForm(EMPTY_TPL); setTplOpen(true); };
  const openTplEdit = (tpl) => { setTplEditing(tpl.id); setTplViewMode(false); setTplForm({ ...tpl }); setTplOpen(true); };
  const openTplView = (tpl) => { setTplEditing(tpl.id); setTplViewMode(true); setTplForm({ ...tpl }); setTplOpen(true); };

  const duplicateTpl = async (tpl) => {
    const res = await templateLogic.create({ name: `${tpl.name} (Copy)`, category: tpl.category, description: tpl.description, content: tpl.content });
    if (!res.ok) { toast.push(res.error || 'Failed to duplicate template.', 'error'); return; }
    await loadDraftingTemplates();
    toast.push('Template duplicated.', 'success');
  };

  const deleteTpl = async (tpl) => {
    if (!confirm(`Delete template "${tpl.name}"?`)) return;
    const res = await templateLogic.remove(tpl.id);
    if (!res.ok) { toast.push(res.error || 'Failed to delete template.', 'error'); return; }
    await loadDraftingTemplates();
    toast.push('Template deleted.', 'success');
  };

  const saveTpl = async () => {
    if (!tplForm.name || !tplForm.category) { toast.push('Name and category are required.', 'error'); return; }
    const res = tplEditing
      ? await templateLogic.update(tplEditing, tplForm)
      : await templateLogic.create(tplForm);
    if (!res.ok) { toast.push(res.error || 'Failed to save template.', 'error'); return; }
    setTplOpen(false);
    await loadDraftingTemplates();
    toast.push(tplEditing ? 'Template updated.' : 'Drafting template added.', 'success');
  };

  // ----- Filtering & Sorting calculations -----
  const uniqueCourtNames = Array.from(new Set(cases.map(c => c.court || c.court || '').filter(Boolean)));
  const uniqueCourtLocations = Array.from(new Set(cases.map(c => extractJurisdiction(c)).filter(Boolean)));

  const handleSortToggle = () => {
    setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCourt(''); setFilterCourtLocation('');
    setFilterStatus('');
    setDateFrom('');
    setDateTo('');
    setTempDateFrom('');
    setTempDateTo('');
    setPage(1);
    toast.push('Filters reset.', 'info');
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === paginatedRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedRows.map(r => r.id)));
    }
  };

  // Client-side filtering logic
  const filteredRows = rows.filter((row) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const numMatch = row.caseNumber?.toLowerCase().includes(q);
      const titleMatch = row.parties?.toLowerCase().includes(q);
      const courtMatch = row.court?.toLowerCase().includes(q);
      const purposeMatch = row.purpose?.toLowerCase().includes(q);
      if (!numMatch && !titleMatch && !courtMatch && !purposeMatch) return false;
    }
    if (filterCourt && (row.case?.court || row.case?.court) !== filterCourt) return false;
    if (filterCourtLocation && extractJurisdiction(row.case) !== filterCourtLocation) return false;
    if (filterStatus && row.status !== filterStatus) return false;
    if (dateFrom || dateTo) {
      const rowDate = new Date(row.date).getTime();
      if (dateFrom && rowDate < new Date(dateFrom).getTime()) return false;
      if (dateTo) {
        const toTime = new Date(dateTo);
        toTime.setHours(23, 59, 59, 999);
        if (rowDate > toTime.getTime()) return false;
      }
    }
    return true;
  });

  // Client-side sorting logic
  const sortedRows = [...filteredRows].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return sortDir === 'asc' ? diff : -diff;
  });

  // Pagination calculation
  const totalPages = Math.ceil(sortedRows.length / pageSize);
  const paginatedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  // Exports table data to CSV
  const exportToCsv = () => {
    if (sortedRows.length === 0) {
      toast.push('No hearings to export.', 'info');
      return;
    }
    const headers = ['Hearing Date', 'Case Number', 'Title', 'Court', 'Bench', 'Purpose', 'Next Hearing', 'Posted For', 'Judge', 'Status'];
    const csvContent = [
      headers.join(','),
      ...sortedRows.map(r => [
        `"${formatDate(r.date)}"`,
        `"${r.caseNumber}"`,
        `"${r.parties}"`,
        `"${r.court}"`,
        `"${r.case?.bench_type || '—'}"`,
        `"${r.purpose || '—'}"`,
        `"${formatDate(r.nextHearingDate || r.next_hearing_date) || '—'}"`,
        `"${r.postedFor || r.posted_for || '—'}"`,
        `"${r.case?.judge || '—'}"`,
        `"${r.status}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `order_sheet_hearings_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.push('CSV downloaded.', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  // ----- Case details lookup for shortcode resolution -----
  const getCaseDetails = useCallback((caseId) => {
    if (!caseId) return null;
    return cases.find((c) => c.id === caseId) || null;
  }, [cases]);

  // Format case number from individual fields for reliable display
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

  const templatePlaceholders = [
    { label: 'Case Number', value: '{caseNumber}' },
    { label: 'Parties / Title', value: '{parties}' },
    { label: 'Court', value: '{court}' },
    { label: 'Judge / Officer', value: '{judge}' },
    { label: 'Stage', value: '{stage}' },
    { label: 'Hearing Date', value: '{hearingDate}' },
    { label: 'Next Hearing Date', value: '{nextHearingDate}' },
    { label: 'Purpose', value: '{purpose}' },
    { label: 'Status', value: '{status}' },
    { label: "Today's Date", value: '{todayDate}' },
  ];

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

  // Templates grid client-side filtering
  const filteredTpls = tplList.filter((t) => {
    if (tplSearch && !t.name.toLowerCase().includes(tplSearch.toLowerCase()) && !t.category.toLowerCase().includes(tplSearch.toLowerCase())) return false;
    if (tplCategory && t.category !== tplCategory) return false;
    return true;
  });

  const tplPageSize = 9;
  const tplTotalPages = Math.ceil(filteredTpls.length / tplPageSize);
  const paginatedTpls = filteredTpls.slice((tplPage - 1) * tplPageSize, tplPage * tplPageSize);

  const STATUS_COLORS = [
    { bg: '#e7f5ff', text: '#0066cc', border: '#a5d8ff', dot: '#0066cc' },
    { bg: '#fff9db', text: '#d97706', border: '#ffe066', dot: '#d97706' },
    { bg: '#ebfbee', text: '#0ca678', border: '#b2f2bb', dot: '#0ca678' },
    { bg: '#fff5f5', text: '#e03131', border: '#ffc9c9', dot: '#e03131' },
    { bg: '#f3f0ff', text: '#7048e8', border: '#d0bfff', dot: '#7048e8' },
    { bg: '#fff0f6', text: '#c2255c', border: '#faa2c1', dot: '#c2255c' },
    { bg: '#e6fcf5', text: '#0b7285', border: '#96f2d7', dot: '#0b7285' },
    { bg: '#fff4e6', text: '#e8590c', border: '#ffc078', dot: '#e8590c' },
    { bg: '#f4fce3', text: '#5c940d', border: '#c0eb75', dot: '#5c940d' },
    { bg: '#edf2ff', text: '#364fc7', border: '#bac8ff', dot: '#364fc7' },
  ];
  const getStatusStyle = (status) => {
    const idx = caseStatuses.indexOf(status);
    if (idx === -1) return STATUS_COLORS[9];
    return STATUS_COLORS[idx % 10];
  };

  return (
    <>
      {/* Mobile View */}
      {isMobile && (
        <div className="cl-mobile-view">
          {/* Header Card */}
          <div className="cl-header">
            <div className="cl-header__left">
              <div className="cl-header__icon"><Icon name="calendar" size={22} /></div>
              <div>
                <div className="cl-header__title">Cases</div>
                <div className="cl-header__sub">View and manage all hearings across your matters.</div>
              </div>
            </div>
            <button className="cl-header__add" type="button" onClick={openNew}><Icon name="plus" size={15} /> Add</button>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <div className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Cases</div>
            <div className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Case History</div>
            <div className={`tab ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>Templates</div>
            <div className={`tab ${tab === 'timeline' ? 'active' : ''}`} onClick={() => setTab('timeline')}>Timeline</div>
          </div>

          {/* List Tab */}
          {tab === 'list' && (
            <>
              {/* Mobile Filters */}
              <div className="cl-filters">
                <div className="cl-filters__header">
                  <div className="cl-filters__title">
                    <Icon name="search" size={15} /> Filter
                  </div>
                  <div className="cl-filters__hide" onClick={() => setShowDatePicker(!showDatePicker)}>
                    {showDatePicker ? 'Hide' : 'Show'} Filters <Icon name={showDatePicker ? 'chevronUp' : 'chevronDown'} size={14} />
                  </div>
                </div>

                {showDatePicker && (
                  <>
                    {/* Date Range */}
                    <div className="cl-filters__row" onClick={() => { }}>
                      <Icon name="calendar" size={16} color="var(--navy-600)" />
                      <div className="flex-1">
                        <div className="cl-filters__label">Date Range</div>
                        <div className="cl-filters__value">
                          {dateFrom && dateTo ? `${formatDate(dateFrom)} - ${formatDate(dateTo)}` : 'No date filter'}
                        </div>
                      </div>
                    </div>
                    <div className="flex-row gap-8 mb-10">
                      <input type="date" value={dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom) ? dateFrom : ''} onChange={(e) => setDateFrom(e.target.value)} className="order-sheet__date-input" />
                      <input type="date" value={dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo) ? dateTo : ''} onChange={(e) => setDateTo(e.target.value)} className="order-sheet__date-input" />
                    </div>

                    {/* Court */}
                    <div className="cl-filters__search">
                      <Icon name="building" size={15} color="var(--navy-600)" />
                      <select
                        className="order-sheet__filter-select"
                        value={filterCourt}
                        onChange={(e) => setFilterCourt(e.target.value)}
                      >
                        <option value="">All Courts</option>
                        {uniqueCourtNames.map(c => (<option key={c} value={c}>{c}</option>))}
                      </select>
                    </div>

                    {/* Jurisdiction */}
                    <div className="cl-filters__search">
                      <Icon name="globe" size={15} color="var(--navy-600)" />
                      <select
                        className="order-sheet__filter-select"
                        value={filterCourtLocation}
                        onChange={(e) => setFilterCourtLocation(e.target.value)}
                      >
                        <option value="">All Jurisdictions</option>
                        {uniqueCourtLocations.map(l => (<option key={l} value={l}>{l}</option>))}
                      </select>
                    </div>

                    {/* Search */}
                    <div className="cl-filters__search">
                      <Icon name="search" size={15} color="var(--navy-600)" />
                      <input type="text" placeholder="Search case number, parties..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>

                    {/* Status */}
                    <div className="cl-filters__search">
                      <Icon name="checkSquare" size={15} color="var(--navy-600)" />
                      <select
                        className="order-sheet__filter-select"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                      >
                        <option value="">All Status</option>
                        {caseStatuses.map(st => (<option key={st} value={st}>{st}</option>))}
                      </select>
                    </div>

                    {/* Actions */}
                    <div className="cl-filters__actions">
                      <button className="cl-filters__reset" type="button" onClick={resetFilters}><Icon name="refresh" size={13} /> Reset</button>
                      <button className="cl-filters__apply" type="button" onClick={loadList}><Icon name="gear" size={14} /> Apply Filters</button>
                    </div>
                  </>
                )}
              </div>

              {/* Hearings */}
              <div className="cl-hearings">
                <div className="cl-hearings__title">Cases ({sortedRows.length})</div>
                <div className="cl-hearings__bar">
                  <button className="cl-hearings__btn" type="button" onClick={exportToCsv}><Icon name="download" size={13} /> Export</button>
                  <button className="cl-hearings__btn" type="button" onClick={handlePrint}><Icon name="print" size={13} /> Print</button>
                  <button className="cl-hearings__btn" type="button" onClick={() => setShowColumnsMenu(!showColumnsMenu)}><Icon name="grid" size={13} /> Columns</button>
                </div>

                {paginatedRows.length === 0 ? (
                  <Card bodyClass="card__body--flush">
                    <EmptyState icon="calendar" title="No hearings listed." action={<Button icon="plus" onClick={openNew}>Add Order Sheet</Button>} />
                  </Card>
                ) : (
                  <>
                    {/* Bulk delete bar */}
                    {selectedIds.size > 0 && (
                      <div className="cl-bulk-bar">
                        <span className="cl-bulk-bar__count">{selectedIds.size} selected</span>
                        <button className="cl-bulk-bar__delete" onClick={(e) => { e.stopPropagation(); deleteSelected(); }}>
                          <Icon name="trash" size={14} /> Delete Selected
                        </button>
                      </div>
                    )}

                    {/* Table-like header */}
                    <div className="cl-table-header">
                      <div className="cl-table-header__check"><input type="checkbox" checked={selectedIds.size === paginatedRows.length && paginatedRows.length > 0} onChange={selectAll} /></div>
                      <div className="cl-table-header__date"><Icon name="calendar" size={12} /> Date</div>
                      <div className="cl-table-header__case">Case Number &amp; Title</div>
                    </div>

                    {/* Hearing cards */}
                    {paginatedRows.map((h) => {
                      const hDate = new Date(h.date);
                      const dayNum = hDate.getDate();
                      const MON_ABB = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      const mon = MON_ABB[hDate.getMonth()];
                      const year = hDate.getFullYear();
                      return (
                        <div
                          key={h.id}
                          className={`cl-card ${selectedCaseId === h.caseId ? 'selected' : ''}`}
                          onClick={() => setSelectedCaseId(h.caseId)}
                        >
                          <div className="cl-card__check" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedIds.has(h.id)} onChange={() => toggleSelect(h.id)} className="order-sheet__checkbox" />
                          </div>
                          <div className="cl-card__date">
                            <div className="cl-card__date-num">{dayNum}</div>
                            <div className="cl-card__date-mon">{mon}</div>
                            <div className="cl-card__date-yr">{year}</div>
                          </div>
                          <div className="cl-card__body">
                            <div className="cl-card__top">
                              <div className="cl-card__num">
                                <a
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setHistCaseId(h.caseId);
                                    loadHistory(h.caseId);
                                    setTab('history');
                                  }}
                                  className="text-bold text-brand"
                                >
                                  {h.caseNumber}
                                </a>
                              </div>
                              <span className="order-sheet__badge-status" style={{ background: getStatusStyle(h.status).bg, color: getStatusStyle(h.status).text, borderColor: getStatusStyle(h.status).border }}>
                                <span className="cl-card__badge-dot" style={{ background: getStatusStyle(h.status).dot }} />
                                {h.status}
                              </span>
                            </div>
                            <div className="cl-card__parties">{h.parties}</div>
                            <div className="cl-card__meta">
                              <div className="cl-card__meta-item"><Icon name="building" size={11} /> {h.court}</div>
                              <div className="cl-card__meta-item"><Icon name="users" size={11} /> {h.case?.bench_type || '—'}</div>
                            </div>
                            <div className="cl-card__footer">
                              <div className="cl-card__footer-item">
                                <span className="cl-card__footer-label">Next Hearing Date</span>
                                <span className="cl-card__footer-value">{formatDate(h.nextHearingDate || h.next_hearing_date) || '—'}</span>
                              </div>
                              <div className="cl-card__footer-item">
                                <span className="cl-card__footer-label">Judge</span>
                                <span className="cl-card__footer-value">{h.case?.judge || h.judge || '—'}</span>
                              </div>
                            </div>
                            <div className="cl-card__actions">
                              <button className="cl-card__action-btn" onClick={(e) => { e.stopPropagation(); setPreviewHearing(h); }} title="View">
                                <Icon name="eye" size={16} />
                                <span>View</span>
                              </button>
                              <button className="cl-card__action-btn" onClick={(e) => { e.stopPropagation(); openEdit(h); }} title="Edit">
                                <Icon name="edit" size={16} />
                                <span>Edit</span>
                              </button>
                              <button className="cl-card__action-btn" onClick={(e) => { e.stopPropagation(); duplicateHearing(h); }} title="Duplicate">
                                <Icon name="copy" size={15} />
                                <span>Duplicate</span>
                              </button>
                              <button className="cl-card__action-btn cl-card__action-btn--danger" onClick={(e) => { e.stopPropagation(); deleteHearing(h.id); }} title="Delete">
                                <Icon name="trash" size={16} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="order-sheet__footer-pagination">
                        <div className="order-sheet__pagination-info">
                          Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, sortedRows.length)} of {sortedRows.length} hearings
                        </div>
                        <div className="order-sheet__pagination-controls">
                          <select className="order-sheet__per-page-select" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                            <option value={5}>5 per page</option>
                            <option value={10}>10 per page</option>
                            <option value={20}>20 per page</option>
                            <option value={50}>50 per page</option>
                          </select>
                          <div className="order-sheet__page-buttons">
                            <button className="order-sheet__page-btn" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>«</button>
                            {Array.from({ length: totalPages }).map((_, i) => (
                              <button key={i} className={`order-sheet__page-btn ${page === i + 1 ? 'order-sheet__page-btn--active' : ''}`} onClick={() => setPage(i + 1)}>
                                {i + 1}
                              </button>
                            ))}
                            <button className="order-sheet__page-btn" onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>»</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* Non-list tabs (shared with desktop) */}
          {tab !== 'list' && (
            <div className="fade-in">
              {tab === 'history' && (
                <div className="flex-col gap-16">
                  {/* Case Select bar inline */}
                  <div className="flex align-center gap-12 mb-16">
                    <span className="text-bold text-sm text-soft text-nowrap">Select Case:</span>
                    <CaseSelect value={histCaseId} onChange={(val) => loadHistory(val)} />
                  </div>
                  {!history ? (
                    <Card><EmptyState icon="history" title="Select a case to view its history." /></Card>
                  ) : (
                    <>
                      <div className="order-sheet__case-info-card">
                        <div className="order-sheet__case-info-header">
                          <div className="order-sheet__case-icon-box">
                            <Icon name="balance" size={24} />
                          </div>
                          <div className="order-sheet__case-title-area">
                            <div className="order-sheet__case-title-row">
                              <h2 className="order-sheet__case-title">{formatCaseNumber(history.case) || history.case?.caseNumber || history.case?.case_display_number}</h2>
                              {history.case?.status && (
                                <span className="order-sheet__case-badge-active">{history.case.status}</span>
                              )}
                            </div>
                            <p className="order-sheet__case-subtitle">{history.case?.title}</p>
                            <div className="order-sheet__header-court">{history.case?.court || ''}{history.case?.court && extractJurisdiction(history.case) ? ', ' : ''}{extractJurisdiction(history.case) || ''}</div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              {tab === 'templates' && (
                <Card bodyClass="card__body--flush">
                  <DataTable
                    columns={tplColumns}
                    rows={filteredTpls}
                    pageSize={10}
                    searchable
                    searchKeys={['name', 'category', 'description']}
                    searchPlaceholder="Search templates…"
                    emptyIcon="file"
                    emptyTitle="No templates yet."
                    initialSort={{ key: 'name', dir: 'asc' }}
                    toolbar={
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Select value={tplCategory} onChange={(e) => { setTplCategory(e.target.value); setTplPage(1); }}>
                          <option value="">All Categories</option>
                          <option value="Hearing">Hearing</option>
                          <option value="Order">Order</option>
                          <option value="Notice">Notice</option>
                        </Select>
                        <Button icon="plus" size="sm" onClick={() => { setTplForm(EMPTY_TPL); setTplEditing(null); setTplOpen(true); }}>Add</Button>
                      </div>
                    }
                  />
                </Card>
              )}
              {tab === 'timeline' && (
                <Card bodyClass="card__body--flush">
                  <OrderSheetPreviewModal open={false} onClose={() => { }} hearing={null} />
                  {/* placeholder */}
                  <EmptyState icon="clock" title="Timeline coming soon." />
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Desktop View */}
      {!isMobile && (
        <div className="cl-desktop-view fade-in">
          <PageHeader
            icon="calendar"
            title="Order Sheet"
            subtitle="View and manage all hearings across your matters."
            actions={
              <div className="order-sheet__header-actions">
                <Button icon="plus" onClick={openNew}>Add Order Sheet</Button>
              </div>
            }
          />

          <div className="tabs">
            <div className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Cases</div>
            <div className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Case History</div>
            <div className={`tab ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>Templates</div>
            <div className={`tab ${tab === 'timeline' ? 'active' : ''}`} onClick={() => setTab('timeline')}>Timeline</div>
          </div>

          {/* TABS CONTAINER */}

          {/* 1. CAUSE LIST TAB */}
          {tab === 'list' && (
            <>
              {/* Filters Bar */}
              <div className="order-sheet__filters-bar">
                {/* Custom Range Picker */}
                <div className="order-sheet__datepicker-wrapper" onClick={() => setShowDatePicker(!showDatePicker)}>
                  <Icon name="calendar" size={14} />
                  <span>
                    {dateFrom && dateTo ? `${formatDate(dateFrom)} - ${formatDate(dateTo)}` : '01 Jun 2026 - 30 Jun 2026'}
                  </span>
                  <Icon name="chevronDown" size={12} className="ml-10" />
                  {showDatePicker && (
                    <div className="order-sheet__datepicker-popover" onClick={(e) => e.stopPropagation()}>
                      <Field label="From Date">
                        <Input type="date" value={tempDateFrom && /^\d{4}-\d{2}-\d{2}$/.test(tempDateFrom) ? tempDateFrom : ''} onChange={(e) => setTempDateFrom(e.target.value)} />
                      </Field>
                      <Field label="To Date">
                        <Input type="date" value={tempDateTo && /^\d{4}-\d{2}-\d{2}$/.test(tempDateTo) ? tempDateTo : ''} onChange={(e) => setTempDateTo(e.target.value)} />
                      </Field>
                      <div className="flex gap-8 mt-10">
                        <Button size="sm" variant="ghost" onClick={() => { setTempDateFrom(''); setTempDateTo(''); setDateFrom(''); setDateTo(''); setShowDatePicker(false); }}>Clear</Button>
                        <Button size="sm" onClick={() => { setDateFrom(tempDateFrom); setDateTo(tempDateTo); setShowDatePicker(false); }}>Apply</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Court dropdown */}
                <select className="order-sheet__select-input" value={filterCourt} onChange={(e) => setFilterCourt(e.target.value)}>
                  <option value="">All Courts</option>
                  {uniqueCourtNames.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* Jurisdiction dropdown */}
                <select className="order-sheet__select-input" value={filterCourtLocation} onChange={(e) => setFilterCourtLocation(e.target.value)}>
                  <option value="">All Jurisdictions</option>
                  {uniqueCourtLocations.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>

                {/* Search Input */}
                <div className="order-sheet__search-wrapper">
                  <Icon name="search" size={14} className="search-icon" />
                  <input type="text" placeholder="Search case number, parties..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>

                {/* Status dropdown */}
                <select className="order-sheet__select-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All Status</option>
                  {caseStatuses.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>

                {/* Filter buttons */}
                <div className="order-sheet__filter-actions">
                  <button className="order-sheet__btn-reset" onClick={resetFilters}>Reset</button>
                  <button className="order-sheet__btn-apply" onClick={loadList}>
                    <Icon name="gear" size={13} /> Filters
                  </button>
                </div>
              </div>

              {/* Table Header controls */}
              <div className="order-sheet__card-header">
                <div className="cases__card-header-title">Cases ({sortedRows.length})</div>
                <div className="order-sheet__actions-group pos-relative">
                  <button className="order-sheet__action-btn" onClick={exportToCsv}>
                    <Icon name="download" size={13} /> Export
                  </button>
                  <button className="order-sheet__action-btn" onClick={handlePrint}>
                    <Icon name="print" size={13} /> Print
                  </button>
                  <button className="order-sheet__action-btn" onClick={() => setShowColumnsMenu(!showColumnsMenu)}>
                    <Icon name="grid" size={13} /> Columns
                  </button>

                  {showColumnsMenu && (
                    <div className="order-sheet__datepicker-popover order-sheet__popover-right">
                      {Object.keys(visibleColumns).map(col => (
                        <label key={col} className="flex align-center gap-8 font-medium pointer text-sm">
                          <input type="checkbox" checked={visibleColumns[col]} onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))} />
                          {col === 'date' ? 'Date' : col.charAt(0).toUpperCase() + col.slice(1)}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Case Info Card */}
              {selectedCaseId && (() => {
                const selCase = cases.find(c => c.id === selectedCaseId);
                if (!selCase) return null;
                return (
                  <div className="order-sheet__case-info-card mb-14">
                    <div className="order-sheet__case-info-header">
                      <div className="order-sheet__case-icon-box">
                        <Icon name="balance" size={24} />
                      </div>
                      <div className="order-sheet__case-title-area">
                        <div className="order-sheet__case-title-row">
                          <h2 className="order-sheet__case-title">{formatCaseNumber(selCase) || selCase.caseNumber || selCase.case_display_number}</h2>
                          <span className="order-sheet__case-badge-active">{selCase.status || 'Active'}</span>
                        </div>
                        <p className="order-sheet__case-subtitle">{selCase.title}</p>
                        <div className="order-sheet__header-court">{selCase.court || ''}{selCase.court && extractJurisdiction(selCase) ? ', ' : ''}{extractJurisdiction(selCase) || ''}</div>
                      </div>
                    </div>
                    <div className="order-sheet__details-grid">
                      <div className="order-sheet__details-item">
                        <span className="order-sheet__details-label">Case Type</span>
                        <span className="order-sheet__details-value">{selCase.case_type || '—'}</span>
                      </div>
                      <div className="order-sheet__details-item">
                        <span className="order-sheet__details-label">Filing Date</span>
                        <span className="order-sheet__details-value">{formatDate(selCase.filingDate) || '—'}</span>
                      </div>
                      <div className="order-sheet__details-item">
                        <span className="order-sheet__details-label">Current Stage</span>
                        <span className="order-sheet__details-value">{selCase.stage || '—'}</span>
                      </div>
                      <div className="order-sheet__details-item">
                        <span className="order-sheet__details-label">Next Hearing</span>
                        <span className="order-sheet__details-value">{formatDate(selCase.nextHearing) || '—'}</span>
                      </div>
                      <div className="order-sheet__details-item">
                        <span className="order-sheet__details-label">Judge</span>
                        <span className="order-sheet__details-value">{selCase.judge || '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Hearings Table Card */}
              <Card bodyClass="card__body--flush">
                {paginatedRows.length === 0 ? (
                  <div className="p-40">
                    <EmptyState icon="calendar" title="No hearings listed." action={<Button icon="plus" onClick={openNew}>Add Order Sheet</Button>} />
                  </div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="order-sheet__checkbox-cell"><input type="checkbox" /></th>
                        {visibleColumns.date && <th className="pointer" onClick={handleSortToggle}>Date <Icon name={sortDir === 'asc' ? 'arrow-up' : 'arrow-down'} size={12} /></th>}
                        {visibleColumns.case && <th>Case Number & Title</th>}
                        {visibleColumns.court && <th>Court</th>}
                        {visibleColumns.bench && <th>Bench</th>}
                        {visibleColumns.purpose && <th>Purpose</th>}
                        {visibleColumns.nextHearingDate && <th>Next Hearing</th>}
                        {visibleColumns.postedFor && <th>Posted For</th>}
                        {visibleColumns.judge && <th>Judge</th>}
                        {visibleColumns.status && <th>Status</th>}
                        {visibleColumns.actions && <th className="text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRows.map((h) => {
                        return (
                          <tr key={h.id} className={`order-sheet__hearing-row ${selectedCaseId === h.caseId ? 'selected' : ''}`} onClick={() => setSelectedCaseId(h.caseId)}>
                            <td onClick={(e) => e.stopPropagation()}><input type="checkbox" /></td>
                            {visibleColumns.date && (
                              <td className="order-sheet__cell-date">
                                <span>{formatDate(h.date)}</span>
                              </td>
                            )}
                            {visibleColumns.case && (
                              <td>
                                <a
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setHistCaseId(h.caseId);
                                    loadHistory(h.caseId);
                                    setTab('history');
                                  }}
                                  className="text-bold text-brand"
                                >
                                  {h.caseNumber}
                                </a>
                                <div className="text-xs text-muted mt-4">{h.parties}</div>
                              </td>
                            )}
                            {visibleColumns.court && <td>{h.court}</td>}
                            {visibleColumns.bench && <td>{h.case?.bench_type || '—'}</td>}
                            {visibleColumns.purpose && <td>{h.purpose || '—'}</td>}
                            {visibleColumns.nextHearingDate && <td>{formatDate(h.nextHearingDate || h.next_hearing_date) || '—'}</td>}
                            {visibleColumns.postedFor && <td>{h.postedFor || h.posted_for || '—'}</td>}
                            {visibleColumns.judge && <td>{h.case?.judge || h.judge || '—'}</td>}
                            {visibleColumns.status && (
                              <td>
                                <span className="order-sheet__badge-status" style={{ background: getStatusStyle(h.status).bg, color: getStatusStyle(h.status).text, borderColor: getStatusStyle(h.status).border }}>
                                  <span className="cl-card__badge-dot" style={{ background: getStatusStyle(h.status).dot }} />
                                  {h.status}
                                </span>
                              </td>
                            )}
                            {visibleColumns.actions && (
                              <td className="order-sheet__cell-actions text-right">
                                <button className="btn btn--ghost btn--sm" onClick={() => setPreviewHearing(h)} title="View">
                                  <Icon name="eye" size={13} />
                                </button>
                                <button className="btn btn--ghost btn--sm" onClick={() => openEdit(h)} title="Edit">
                                  <Icon name="edit" size={13} />
                                </button>
                                <button className="btn btn--ghost btn--sm" onClick={() => duplicateHearing(h)} title="Duplicate">
                                  <Icon name="copy" size={13} />
                                </button>
                                <button className="btn btn--ghost btn--sm text-danger" onClick={() => deleteHearing(h.id)} title="Delete">
                                  <Icon name="trash" size={13} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </Card>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div className="order-sheet__footer-pagination">
                  <div className="order-sheet__pagination-info">
                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, sortedRows.length)} of {sortedRows.length} hearings
                  </div>
                  <div className="order-sheet__pagination-controls">
                    <select className="order-sheet__per-page-select" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                      <option value={5}>5 per page</option>
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                    </select>
                    <div className="order-sheet__page-buttons">
                      <button className="order-sheet__page-btn" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>«</button>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button key={i} className={`order-sheet__page-btn ${page === i + 1 ? 'order-sheet__page-btn--active' : ''}`} onClick={() => setPage(i + 1)}>
                          {i + 1}
                        </button>
                      ))}
                      <button className="order-sheet__page-btn" onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>»</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 2. CASE HISTORY TAB */}
          {tab === 'history' && (
            <div className="flex-col gap-16">
              {/* Case Select bar inline */}
              <div className="flex align-center gap-12 mb-16">
                <span className="text-bold text-sm text-soft text-nowrap">Select Case:</span>
                <CaseSelect value={histCaseId} onChange={(val) => loadHistory(val)} />
              </div>

              {!history ? (
                <Card><EmptyState icon="history" title="Select a case to view its history." /></Card>
              ) : (
                <>
                  {/* Case Info Header Card */}
                  <div className="order-sheet__case-info-card">
                    <div className="order-sheet__case-info-header">
                      <div className="order-sheet__case-icon-box">
                        <Icon name="balance" size={24} />
                      </div>
                      <div className="order-sheet__case-title-area">
                        <div className="order-sheet__case-title-row">
                          <h2 className="order-sheet__case-title">{formatCaseNumber(history.case) || history.case?.caseNumber || history.case?.case_display_number}</h2>
                          {history.case?.status && (
                            <span className="order-sheet__case-badge-active">{history.case.status}</span>
                          )}
                        </div>
                        <p className="order-sheet__case-subtitle">{history.case?.title}</p>
                        <div className="order-sheet__header-court">{history.case?.court || ''}{history.case?.court && extractJurisdiction(history.case) ? ', ' : ''}{extractJurisdiction(history.case) || ''}</div>
                      </div>
                    </div>

                    <div className="order-sheet__details-grid">
                      <div className="order-sheet__details-item">
                        <span className="order-sheet__details-label">Case Type</span>
                        <span className="order-sheet__details-value">{history.case?.case_type || '—'}</span>
                      </div>
                      <div className="order-sheet__details-item">
                        <span className="order-sheet__details-label">Filing Date</span>
                        <span className="order-sheet__details-value">{formatDate(history.case?.filingDate) || '—'}</span>
                      </div>
                      <div className="order-sheet__details-item">
                        <span className="order-sheet__details-label">Current Stage</span>
                        <span className="order-sheet__details-value">{history.case?.stage || '—'}</span>
                      </div>
                      <div className="order-sheet__details-item">
                        <span className="order-sheet__details-label">Next Hearing</span>
                        <span className="order-sheet__details-value">{formatDate(history.case?.nextHearing) || '—'}</span>
                      </div>
                      <div className="order-sheet__details-item">
                        <span className="order-sheet__details-label">Judge</span>
                        <span className="order-sheet__details-value">{history.case?.judge || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* History Timeline card */}
                  <Card title="History Timeline" sub="Chronological proceedings logs and order sheets">
                    {history.hearings.length === 0 ? (
                      <EmptyState icon="history" title="No history logs recorded." />
                    ) : (
                      <div className="order-sheet__timeline-v-container">
                        <div className="order-sheet__timeline-v-line-path" />
                        {history.hearings.map((h, i) => {
                          const markerClass = h.status?.toLowerCase() || 'default';
                          return (
                            <div className="order-sheet__timeline-v-row" key={h.id || i}>
                              <div className="order-sheet__timeline-v-node-col">
                                <div className={`order-sheet__timeline-v-circle order-sheet__timeline-v-circle--${markerClass}`}>
                                  {h.status === 'Completed' ? <Icon name="check" size={13} /> : <Icon name="clock" size={13} />}
                                </div>
                              </div>
                              <div className="order-sheet__timeline-v-connector" />
                              <div className="order-sheet__timeline-v-title-col">
                                <h4 className="order-sheet__timeline-v-event-title">{h.purpose || 'Hearing'}</h4>
                                <span className="order-sheet__timeline-v-event-date">{formatDate(h.date)}</span>
                              </div>
                              <div className="order-sheet__timeline-v-desc-col">
                                <div className="order-sheet__timeline-v-desc">{stripHtml(h.notes || '—')}</div>
                              </div>
                              <div className="order-sheet__timeline-v-action-col">
                                <button className="order-sheet__timeline-v-btn" onClick={() => setPreviewHearing(h)}>
                                  View Details
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </>
              )}
            </div>
          )}

          {/* 3. TEMPLATES TAB */}
          {tab === 'templates' && (
            <>
              {/* Templates Filters bar */}
              <div className="order-sheet__templates-bar">
                {/* Search */}
                <div className="order-sheet__search-wrapper">
                  <Icon name="search" size={14} className="search-icon" />
                  <input type="text" placeholder="Search templates..." value={tplSearch} onChange={(e) => setTplSearch(e.target.value)} />
                </div>

                {/* Categories select */}
                <select className="order-sheet__select-input" value={tplCategory} onChange={(e) => setTplCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  <option value="Hearing">Hearing</option>
                </select>

                <div className="order-sheet__filter-actions">
                  <button className="order-sheet__btn-reset" onClick={() => { setTplSearch(''); setTplCategory(''); }}>Reset</button>
                  <button className="order-sheet__btn-apply" onClick={openTplNew}>
                    <Icon name="plus" size={13} /> New Template
                  </button>
                </div>
              </div>

              {/* Templates list heading */}
              <div className="order-sheet__card-header">
                <div className="cases__card-header-title">Templates ({filteredTpls.length})</div>
              </div>

              {/* Templates Flex Grid */}
              {paginatedTpls.length === 0 ? (
                <Card><EmptyState icon="file" title="No templates match the criteria." /></Card>
              ) : (
                <div className="order-sheet__templates-grid">
                  {paginatedTpls.map((t) => {
                    let iconColor = 'blue';
                    const catLower = t.category?.toLowerCase() || '';
                    if (catLower === 'hearing') iconColor = 'blue';
                    else if (catLower.includes('plead')) iconColor = 'green';
                    else if (catLower.includes('evid')) iconColor = 'blue';
                    else if (catLower.includes('app')) iconColor = 'purple';
                    else if (catLower.includes('crim')) iconColor = 'green';
                    else if (catLower.includes('notic')) iconColor = 'blue';
                    else if (catLower.includes('affid')) iconColor = 'blue';
                    else iconColor = 'orange';

                    return (
                      <div className="order-sheet__tpl-card" key={t.id}>
                        <div className={`order-sheet__tpl-icon-wrapper order-sheet__tpl-icon-wrapper--${iconColor}`}>
                          <Icon name="file" size={20} />
                        </div>
                        <div className="order-sheet__tpl-card-content">
                          <h3 className="order-sheet__tpl-card-title">{t.name}</h3>
                          <p className="order-sheet__tpl-card-desc">{t.description || t.content || 'Drafting formatting guidelines.'}</p>
                          <div className="order-sheet__tpl-card-footer">
                            <span className={`order-sheet__tpl-tag order-sheet__tpl-tag--${catLower}`}>
                              {t.category}
                            </span>
                          </div>
                        </div>
                        <div className="order-sheet__tpl-actions">
                          <button className="order-sheet__tpl-action" title="View" onClick={() => openTplView(t)}><Icon name="eye" size={14} /></button>
                          <button className="order-sheet__tpl-action" title="Edit" onClick={() => openTplEdit(t)}><Icon name="edit" size={14} /></button>
                          <button className="order-sheet__tpl-action" title="Duplicate" onClick={() => duplicateTpl(t)}><Icon name="copy" size={14} /></button>
                          <button className="order-sheet__tpl-action" title="Delete" onClick={() => deleteTpl(t)}><Icon name="trash" size={14} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Templates Pagination */}
              {tplTotalPages > 1 && (
                <div className="order-sheet__footer-pagination">
                  <div className="order-sheet__pagination-info">
                    Showing {((tplPage - 1) * tplPageSize) + 1} to {Math.min(tplPage * tplPageSize, filteredTpls.length)} of {filteredTpls.length} templates
                  </div>
                  <div className="order-sheet__pagination-controls">
                    <div className="order-sheet__page-buttons">
                      <button className="order-sheet__page-btn" onClick={() => setTplPage(p => Math.max(p - 1, 1))} disabled={tplPage === 1}>«</button>
                      {Array.from({ length: tplTotalPages }).map((_, i) => (
                        <button key={i} className={`order-sheet__page-btn ${tplPage === i + 1 ? 'order-sheet__page-btn--active' : ''}`} onClick={() => setTplPage(i + 1)}>
                          {i + 1}
                        </button>
                      ))}
                      <button className="order-sheet__page-btn" onClick={() => setTplPage(p => Math.min(p + 1, tplTotalPages))} disabled={tplPage === tplTotalPages}>»</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 4. TIMELINE TAB */}
          {tab === 'timeline' && (
            <div className="order-sheet__timeline-tab">
              {/* Case selector bar */}
              <div className="order-sheet__timeline-selector-bar">
                <div className="order-sheet__timeline-selector-label">
                  <Icon name="vault" size={15} />
                  <span>Case</span>
                </div>
                <div className="order-sheet__timeline-selector-field">
                  <CaseSelect value={histCaseId} onChange={(val) => loadHistory(val)} />
                </div>
              </div>

              {!history ? (
                <Card><EmptyState icon="clock" title="Select a case to view its visual timeline." /></Card>
              ) : (
                <>
                  {/* Case Info Header Card */}
                  <div className="order-sheet__case-info-card">
                    <div className="order-sheet__case-info-header">
                      <div className="order-sheet__case-icon-box">
                        <Icon name="balance" size={24} />
                      </div>
                      <div className="order-sheet__case-title-area">
                        <div className="order-sheet__case-title-row">
                          <h2 className="order-sheet__case-title">{formatCaseNumber(history.case) || history.case?.caseNumber || history.case?.case_display_number}</h2>
                          <span className="order-sheet__case-badge-active">{history.case?.status || 'Active'}</span>
                        </div>
                        <p className="order-sheet__case-subtitle">{history.case?.title}</p>
                        <div className="order-sheet__header-court">{history.case?.court || ''}{history.case?.court && extractJurisdiction(history.case) ? ', ' : ''}{extractJurisdiction(history.case) || ''}</div>
                      </div>
                    </div>

                    <div className="order-sheet__details-grid">
                      <div className="order-sheet__details-item">
                        <span className="order-sheet__details-label">Case Type</span>
                        <span className="order-sheet__details-value">{history.case?.case_type || '—'}</span>
                      </div>
                      <div className="order-sheet__details-item">
                        <span className="order-sheet__details-label">Filing Date</span>
                        <span className="order-sheet__details-value">{formatDate(history.case?.filingDate) || '—'}</span>
                      </div>
                      <div className="order-sheet__details-item">
                        <span className="order-sheet__details-label">Current Stage</span>
                        <span className="order-sheet__details-value">{history.case?.stage || '—'}</span>
                      </div>
                      <div className="order-sheet__details-item">
                        <span className="order-sheet__details-label">Next Hearing</span>
                        <span className="order-sheet__details-value">{formatDate(history.case?.nextHearing) || '—'}</span>
                      </div>
                      <div className="order-sheet__details-item">
                        <span className="order-sheet__details-label">Judge</span>
                        <span className="order-sheet__details-value">{history.case?.judge || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Scrollable node timeline */}
                  {history.hearings.length > 0 && (
                    <div className="order-sheet__timeline-h-container">
                      <div className="order-sheet__timeline-h">
                        <div className="order-sheet__timeline-h-track" />
                        {history.hearings.map((h, i) => {
                          const markerClass = h.status?.toLowerCase() || 'default';
                          const isScheduled = h.status === 'Scheduled';
                          return (
                            <div className="order-sheet__timeline-h-node" key={h.id || i}>
                              <div className={`order-sheet__timeline-h-circle order-sheet__timeline-h-circle--${markerClass}`}>
                                {isScheduled ? (
                                  <Icon name="clock" size={14} />
                                ) : (
                                  <Icon name="check" size={14} />
                                )}
                              </div>
                              <div className="order-sheet__timeline-h-text">
                                <span className="order-sheet__timeline-h-name">{h.purpose || 'Hearing'}</span>
                                <span className="order-sheet__timeline-h-date">{formatDate(h.date)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* All Events table */}
                  <Card title="All Events">
                    {history.hearings.length === 0 ? (
                      <EmptyState icon="clock" title="No events to display." />
                    ) : (
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Event</th>
                            <th>Details</th>
                            <th className="text-right">Document</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.hearings.map((h, i) => {
                            return (
                              <tr key={h.id || i}>
                                <td className="order-sheet__timeline-event-date-cell text-nowrap">{formatDate(h.date)}</td>
                                <td>
                                  <div className="flex align-center gap-8">
                                    <span className="order-sheet__timeline-event-dot" style={{ background: getStatusStyle(h.status).dot }} />
                                    <span className="order-sheet__timeline-event-name">{h.purpose || 'Hearing'}</span>
                                  </div>
                                </td>
                                <td className="order-sheet__timeline-event-detail"><div className="order-sheet__timeline-event-detail-inner">{stripHtml(h.notes || '—')}</div></td>
                                <td className="text-right">
                                  {h.docRef ? (
                                    <Button size="sm" variant="ghost" icon="eye" onClick={() => setPreviewDoc({ name: h.docName || 'Document', ref: h.docRef })}>
                                      View
                                    </Button>
                                  ) : (
                                    <button className="order-sheet__timeline-doc-icon" title="View hearing details" onClick={() => setPreviewHearing(h)}>
                                      <Icon name="file" size={15} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </Card>
                </>
              )}
            </div>
          )}

        </div>
      )}

      {/* Hearing add/edit modal — redesigned with sections, icons, rich text editor & template import */}
      <Modal
        open={open}
        title={smartMode ? 'Smart Order Builder' : (editing ? 'Edit Order Sheet' : 'Add Order Sheet')}
        size="lg"
        className={smartMode ? 'order-sheet-preview-modal smart-mode' : ''}
        onClose={() => { setOpen(false); setSmartMode(false); }}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button icon="save" onClick={() => saveHearing()}>{editing ? 'Update' : 'Add'}</Button></>}
      >
        {smartMode ? (
          <>
            {/* Smart mode toolbar */}
            <div className="hearing-modal__import-export-bar">
              <div className="hearing-modal__ie-left">
                <button className="btn btn--sm btn--ghost" onClick={() => setSmartMode((v) => !v)}>
                  <Icon name="compass" size={13} /> Normal Mode
                </button>
              </div>
            </div>
            {/* Import Template in smart mode — content resolves into notes */}
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
              onClose={() => { setOpen(false); setSmartMode(false); }}
              onRefreshPartyTypes={refreshPartyTypes}
              onRefreshStatuses={refreshStatuses}
            />
          </>
        ) : (
          <div className="hearing-modal">
            {/* Import / Export toolbar */}
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

            {/* Section 1: Case Detail */}
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

            {/* Section 2: Hearing Details */}
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

            {/* Section 3: Proceedings — Rich Text Editor with Template Import */}
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

            {/* Section 4: Attachment */}
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

      {/* Case Status Crud Manager */}
      <CrudManager
        open={showStatusCrud}
        onClose={() => { setShowStatusCrud(false); refreshStatuses(); }}
        entity="Case Status"
        config={{ logic: caseStatusLogic, fields: [{ key: 'name', label: 'Status Name', placeholder: 'Enter status name' }], defaults: {}, refresh: refreshStatuses }}
      />

      {/* Hearing Preview Modal */}
      {(previewHearing || previewDoc) && (
        <OrderSheetPreviewModal
          hearing={previewHearing}
          doc={previewDoc}
          onClose={() => { setPreviewHearing(null); setPreviewDoc(null); }}
          onViewDocument={(ref) => viewFile(ref)}
          cases={cases}
        />
      )}

      {/* Template creation/editing/viewing modal */}
      <Modal
        open={tplOpen}
        title={tplViewMode ? 'View Template' : (tplEditing ? 'Edit Template' : 'New Template')}
        onClose={() => setTplOpen(false)}
        footer={tplViewMode ? <Button variant="ghost" onClick={() => setTplOpen(false)}>Close</Button> : <><Button variant="ghost" onClick={() => setTplOpen(false)}>Cancel</Button><Button icon="save" onClick={saveTpl}>{tplEditing ? 'Update' : 'Create'}</Button></>}
      >
        <Field label="Template Name"><Input value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} placeholder="e.g. Legal Notice" readOnly={tplViewMode} /></Field>
        <Field label="Category">
          <Select value={tplForm.category} onChange={(e) => setTplForm({ ...tplForm, category: e.target.value })} disabled={tplViewMode}>
            <option value="Hearing">Hearing</option>
          </Select>
        </Field>
        <Field label="Description"><Input value={tplForm.description} onChange={(e) => setTplForm({ ...tplForm, description: e.target.value })} placeholder="e.g. Template for drafting written statement by defendant." readOnly={tplViewMode} /></Field>
        <Field label="Template Content">
          <DocEditor value={tplForm.content} onChange={(v) => setTplForm({ ...tplForm, content: v })} readOnly={tplViewMode} placeholders={templatePlaceholders} />
        </Field>
      </Modal>
    </>
  );
}
