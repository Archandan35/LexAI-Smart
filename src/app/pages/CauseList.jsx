import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import DocEditor from '@/components/DocEditor.jsx';
import CrudManager from '@/components/CrudManager.jsx';
import HearingPreviewModal from '@/components/HearingPreviewModal.jsx';
import { useCaseStatuses } from '@/hooks/useCaseStatuses.js';
import { causeListLogic } from '@/logic/causeListLogic.js';
import { templateLogic } from '@/logic/templateLogic.js';
import { fileLogic } from '@/logic/fileLogic.js';
import { caseStatusLogic } from '@/logic/caseStatusLogic.js';
import { useAppData } from '@/data-layer/AppDataContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { formatDate, formatDateTime } from '@/utils/format.js';
import { combinedCourt, extractJurisdiction } from '@/utils/caseFormat.js';

const EMPTY_HEARING = { caseId: '', date: '', status: '', purpose: '', notes: '', judge: '', docRef: null, docName: '' };
const EMPTY_TPL = { name: '', category: 'Hearing', description: '', content: '' };

export default function CauseList() {
  const toast = useToast();
  const { user } = useAuth();
  const { cases } = useAppData();
  const { statuses: caseStatuses, refresh: refreshStatuses } = useCaseStatuses();
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState('list'); // list | history | templates | timeline
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_HEARING);

  // Advanced filters state for Cause List Tab
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

  // Sorting & Pagination for Cause List Tab
  const [sortDir, setSortDir] = useState('asc'); // asc | desc
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    case: true,
    court: true,
    purpose: true,
    judge: true,
    status: true,
    actions: true,
  });
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');

  // Templates Tab
  const [tplList, setTplList] = useState([]);
  const [tplOpen, setTplOpen] = useState(false);
  const [tplForm, setTplForm] = useState(EMPTY_TPL);
  const [tplEditing, setTplEditing] = useState(null);
  const [tplSearch, setTplSearch] = useState('');
  const [tplCategory, setTplCategory] = useState('');
  const [tplPage, setTplPage] = useState(1);

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
    const res = await causeListLogic.causeList();
    setRows(res.ok ? res.data.rows : []);
  }, []);

  const loadDraftingTemplates = useCallback(async () => {
    const list = await templateLogic.list();
    setTplList(list);
    const ok = Array.isArray(list) ? list : (list.ok ? list.data : []);
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
    const res = await causeListLogic.caseHistory(caseId);
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
  const openEdit = async (h) => {
    const res = await causeListLogic.getHearing(h.id);
    const record = res.ok ? res.data : h;
    setEditing(record);
    setForm({ ...EMPTY_HEARING, ...record });
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

  const saveHearing = async () => {
    if (!form.caseId || !form.date) { toast.push('Case and date are required.', 'error'); return; }
    const payload = { ...form, notes: editorContent || form.notes || '' };
    try {
      const r = editing ? await causeListLogic.updateHearing(editing.id, payload) : await causeListLogic.addHearing(payload);
      if (r && !r.ok) { toast.push(r.error || 'Failed to save hearing.', 'error'); return; }
      setOpen(false);
      await loadList();
      if (histCaseId) await loadHistory(histCaseId);
      toast.push(editing ? 'Hearing updated.' : 'Hearing added.', 'success');
    } catch (e) {
      toast.push(e?.message || 'An unexpected error occurred.', 'error');
    }
  };

  const deleteHearing = async (id) => {
    if (!window.confirm('Delete this cause list entry?')) return;
    await causeListLogic.deleteHearing(id);
    await loadList();
    if (histCaseId) await loadHistory(histCaseId);
    toast.push('Cause list entry deleted.', 'info');
  };

  const duplicateHearing = (h) => {
    setEditing(null);
    setForm({ ...EMPTY_HEARING, ...h, id: undefined });
    setEditorContent(h.notes || '');
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
    notes: 'notes', proceedings: 'notes', content: 'notes',
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
    const headers = ['caseId', 'date', 'status', 'purpose', 'notes', 'judge', 'docRef', 'docName'];
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
  const openTplNew = () => { setTplEditing(null); setTplForm(EMPTY_TPL); setTplOpen(true); };

  const saveTpl = async () => {
    if (!tplForm.name || !tplForm.category) { toast.push('Name and category are required.', 'error'); return; }
    await templateLogic.create(tplForm);
    setTplOpen(false);
    await loadDraftingTemplates();
    toast.push('Drafting template added.', 'success');
  };

  // ----- Filtering & Sorting calculations -----
  const uniqueCourtNames = Array.from(new Set(cases.map(c => c.court_hierarchy || c.court || '').filter(Boolean)));
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
    if (filterCourt && (row.case?.court_hierarchy || row.case?.court) !== filterCourt) return false;
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
    const headers = ['Date & Time', 'Case Number', 'Title', 'Court / Bench', 'Purpose', 'Judge / Officer', 'Status'];
    const csvContent = [
      headers.join(','),
      ...sortedRows.map(r => [
        `"${formatDateTime(r.date)}"`,
        `"${r.caseNumber}"`,
        `"${r.parties}"`,
        `"${r.court}"`,
        `"${r.purpose || '—'}"`,
        `"${r.case?.judge || '—'}"`,
        `"${r.status}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cause_list_hearings_${new Date().toISOString().split('T')[0]}.csv`);
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

  const hearingShortcodes = useMemo(() => [
    { label: 'Case Number', value: '{caseNumber}' },
    { label: 'Parties / Title', value: '{parties}' },
    { label: 'Court', value: '{court}' },
    { label: 'Judge / Officer', value: '{judge}' },
    { label: 'Stage', value: '{stage}' },
    { label: 'Hearing Date', value: '{hearingDate}' },
    { label: 'Next Hearing Date', value: '{nextHearingDate}' },
    { label: 'Purpose', value: '{purpose}' },
    { label: 'Status', value: '{status}' },
    { label: 'Today\'s Date', value: '{todayDate}' },
  ], []);

  const resolveShortcodes = useCallback((text, caseData) => {
    if (!text) return '';
    const c = caseData || {};
    const d = form.date ? new Date(form.date) : new Date();
    const nd = c.next_hearing ? new Date(c.next_hearing) : null;
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
  }, [form]);

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

  return (
    <div className="fade-in">
      <PageHeader
        icon="calendar"
        title="Cause List"
        subtitle="View and manage all hearings across your matters."
        actions={
          <div className="cause-list__header-actions">
            <Button icon="plus" onClick={openNew}>Add Cause List</Button>
          </div>
        }
      />

      <div className="tabs">
        <div className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Cause List</div>
        <div className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Case History</div>
        <div className={`tab ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>Templates</div>
        <div className={`tab ${tab === 'timeline' ? 'active' : ''}`} onClick={() => setTab('timeline')}>Timeline</div>
      </div>

      {/* TABS CONTAINER */}

      {/* 1. CAUSE LIST TAB */}
      {tab === 'list' && (
        <>
          {/* Filters Bar */}
          <div className="cause-list__filters-bar">
            {/* Custom Range Picker */}
            <div className="cause-list__datepicker-wrapper" onClick={() => setShowDatePicker(!showDatePicker)}>
              <Icon name="calendar" size={14} />
              <span>
                {dateFrom && dateTo ? `${formatDate(dateFrom)} - ${formatDate(dateTo)}` : '01 Jun 2026 - 30 Jun 2026'}
              </span>
              <Icon name="chevronDown" size={12} className="ml-10" />
              {showDatePicker && (
                <div className="cause-list__datepicker-popover" onClick={(e) => e.stopPropagation()}>
                  <Field label="From Date">
                    <Input type="date" value={tempDateFrom} onChange={(e) => setTempDateFrom(e.target.value)} />
                  </Field>
                  <Field label="To Date">
                    <Input type="date" value={tempDateTo} onChange={(e) => setTempDateTo(e.target.value)} />
                  </Field>
                  <div className="flex gap-8 mt-10">
                    <Button size="sm" variant="ghost" onClick={() => { setTempDateFrom(''); setTempDateTo(''); setDateFrom(''); setDateTo(''); setShowDatePicker(false); }}>Clear</Button>
                    <Button size="sm" onClick={() => { setDateFrom(tempDateFrom); setDateTo(tempDateTo); setShowDatePicker(false); }}>Apply</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Court dropdown */}
            <select className="cause-list__select-input" value={filterCourt} onChange={(e) => setFilterCourt(e.target.value)}>
              <option value="">All Courts</option>
              {uniqueCourtNames.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Jurisdiction dropdown */}
            <select className="cause-list__select-input" value={filterCourtLocation} onChange={(e) => setFilterCourtLocation(e.target.value)}>
              <option value="">All Jurisdictions</option>
              {uniqueCourtLocations.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            {/* Search Input */}
            <div className="cause-list__search-wrapper">
              <Icon name="search" size={14} className="search-icon" />
              <input type="text" placeholder="Search case number, parties..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            {/* Status dropdown */}
            <select className="cause-list__select-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              {caseStatuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            {/* Filter buttons */}
            <button className="cause-list__btn-reset" onClick={resetFilters}>Reset</button>
            <button className="cause-list__btn-apply" onClick={loadList}>
              <Icon name="gear" size={13} /> Filters
            </button>
          </div>

          {/* Table Header controls */}
          <div className="cause-list__card-header">
            <div className="cause-list__card-header-title">Hearings ({sortedRows.length})</div>
            <div className="cause-list__actions-group" style={{ position: 'relative' }}>
              <button className="cause-list__action-btn" onClick={exportToCsv}>
                <Icon name="download" size={13} /> Export
              </button>
              <button className="cause-list__action-btn" onClick={handlePrint}>
                <Icon name="print" size={13} /> Print
              </button>
              <button className="cause-list__action-btn" onClick={() => setShowColumnsMenu(!showColumnsMenu)}>
                <Icon name="grid" size={13} /> Columns
              </button>

              {showColumnsMenu && (
                <div className="cause-list__datepicker-popover" style={{ right: 0, left: 'auto', minWidth: '160px' }}>
                  {Object.keys(visibleColumns).map(col => (
                    <label key={col} className="flex align-center gap-8 font-medium pointer text-sm">
                      <input type="checkbox" checked={visibleColumns[col]} onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))} />
                      {col.charAt(0).toUpperCase() + col.slice(1)}
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
              <div className="cause-list__case-info-card" style={{ marginBottom: '14px' }}>
                <div className="cause-list__case-info-header">
                  <div className="cause-list__case-icon-box">
                    <Icon name="balance" size={24} />
                  </div>
                  <div className="cause-list__case-title-area">
                    <div className="cause-list__case-title-row">
                      <h2 className="cause-list__case-title">{formatCaseNumber(selCase) || selCase.caseNumber || selCase.case_display_number}</h2>
                      <span className="cause-list__case-badge-active">{selCase.status || 'Active'}</span>
                    </div>
                    <p className="cause-list__case-subtitle">{selCase.title}</p>
                    <div className="cause-list__header-court">{selCase.court_hierarchy || ''}{selCase.court_hierarchy && extractJurisdiction(selCase) ? ', ' : ''}{extractJurisdiction(selCase) || ''}</div>
                  </div>
                </div>
                <div className="cause-list__details-grid">
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Case Type</span>
                    <span className="cause-list__details-value">{selCase.case_type || '—'}</span>
                  </div>
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Filing Date</span>
                    <span className="cause-list__details-value">{formatDate(selCase.filing_date) || '—'}</span>
                  </div>
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Current Stage</span>
                    <span className="cause-list__details-value">{selCase.stage || '—'}</span>
                  </div>
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Next Hearing</span>
                    <span className="cause-list__details-value">{formatDate(selCase.next_hearing) || '—'}</span>
                  </div>
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Judge</span>
                    <span className="cause-list__details-value">{selCase.judge || '—'}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Hearings Table Card */}
          <Card bodyClass="card__body--flush">
            {paginatedRows.length === 0 ? (
              <div style={{ padding: '40px' }}>
                <EmptyState icon="calendar" title="No hearings listed." action={<Button icon="plus" onClick={openNew}>Add Cause List</Button>} />
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}><input type="checkbox" /></th>
                    {visibleColumns.date && <th className="pointer" onClick={handleSortToggle}>Date & Time {sortDir === 'asc' ? '▲' : '▼'}</th>}
                    {visibleColumns.case && <th>Case Number & Title</th>}
                    {visibleColumns.court && <th>Court / Bench</th>}
                    {visibleColumns.purpose && <th>Purpose</th>}
                    {visibleColumns.judge && <th>Judge / Officer</th>}
                    {visibleColumns.status && <th>Status</th>}
                    {visibleColumns.actions && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((h) => {
                    const statusClass = h.status?.toLowerCase() || 'default';
                    return (
                      <tr key={h.id} className={`cause-list__hearing-row ${selectedCaseId === h.caseId ? 'selected' : ''}`} onClick={() => setSelectedCaseId(h.caseId)}>
                        <td onClick={(e) => e.stopPropagation()}><input type="checkbox" /></td>
                        {visibleColumns.date && (
                          <td className="cause-list__cell-date">
                            <div className="flex align-center gap-8">
                              <Icon name="calendar" size={13} className="text-muted" />
                              <span>{formatDateTime(h.date)}</span>
                            </div>
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
                        {visibleColumns.purpose && <td>{h.purpose || '—'}</td>}
                        {visibleColumns.judge && <td>{h.case?.judge || h.judge || '—'}</td>}
                        {visibleColumns.status && (
                          <td>
                            <span className={`cause-list__badge-status cause-list__badge-status--${statusClass}`}>
                              {h.status}
                            </span>
                          </td>
                        )}
                        {visibleColumns.actions && (
                          <td className="cause-list__cell-actions" style={{ textAlign: 'right' }}>
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
            <div className="cause-list__footer-pagination">
              <div className="cause-list__pagination-info">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, sortedRows.length)} of {sortedRows.length} hearings
              </div>
              <div className="cause-list__pagination-controls">
                <select className="cause-list__per-page-select" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
                <div className="cause-list__page-buttons">
                  <button className="cause-list__page-btn" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>«</button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button key={i} className={`cause-list__page-btn ${page === i + 1 ? 'cause-list__page-btn--active' : ''}`} onClick={() => setPage(i + 1)}>
                      {i + 1}
                    </button>
                  ))}
                  <button className="cause-list__page-btn" onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>»</button>
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
          <div className="flex align-center gap-12" style={{ marginBottom: '16px' }}>
            <span className="text-bold text-sm text-soft" style={{ whiteSpace: 'nowrap' }}>Select Case:</span>
            <CaseSelect value={histCaseId} onChange={(val) => loadHistory(val)} />
          </div>

          {!history ? (
            <Card><EmptyState icon="history" title="Select a case to view its history." /></Card>
          ) : (
            <>
              {/* Case Info Header Card */}
              <div className="cause-list__case-info-card">
                <div className="cause-list__case-info-header">
                  <div className="cause-list__case-icon-box">
                    <Icon name="balance" size={24} />
                  </div>
                  <div className="cause-list__case-title-area">
                    <div className="cause-list__case-title-row">
                      <h2 className="cause-list__case-title">{formatCaseNumber(history.case) || history.case?.caseNumber || history.case?.case_display_number}</h2>
                      {history.case?.status && (
                        <span className="cause-list__case-badge-active">{history.case.status}</span>
                      )}
                    </div>
                    <p className="cause-list__case-subtitle">{history.case?.title}</p>
                    <div className="cause-list__header-court">{history.case?.court_hierarchy || ''}{history.case?.court_hierarchy && extractJurisdiction(history.case) ? ', ' : ''}{extractJurisdiction(history.case) || ''}</div>
                  </div>
                </div>

                <div className="cause-list__details-grid">
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Case Type</span>
                    <span className="cause-list__details-value">{history.case?.case_type || '—'}</span>
                  </div>
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Filing Date</span>
                    <span className="cause-list__details-value">{formatDate(history.case?.filing_date) || '—'}</span>
                  </div>
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Current Stage</span>
                    <span className="cause-list__details-value">{history.case?.stage || '—'}</span>
                  </div>
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Next Hearing</span>
                    <span className="cause-list__details-value">{formatDate(history.case?.next_hearing) || '—'}</span>
                  </div>
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Judge</span>
                    <span className="cause-list__details-value">{history.case?.judge || '—'}</span>
                  </div>
                </div>
              </div>

              {/* History Timeline card */}
              <Card title="History Timeline" sub="Chronological proceedings logs and order sheets">
                {history.hearings.length === 0 ? (
                  <EmptyState icon="history" title="No history logs recorded." />
                ) : (
                  <div className="cause-list__timeline-v-container">
                    <div className="cause-list__timeline-v-line-path" />
                    {history.hearings.map((h, i) => {
                      const markerClass = h.status?.toLowerCase() || 'default';
                      return (
                        <div className="cause-list__timeline-v-row" key={h.id || i}>
                          <div className="cause-list__timeline-v-node-col">
                            <div className={`cause-list__timeline-v-circle cause-list__timeline-v-circle--${markerClass}`}>
                              {h.status === 'Completed' ? <Icon name="check" size={13} /> : <Icon name="clock" size={13} />}
                            </div>
                          </div>
                          <div className="cause-list__timeline-v-connector" />
                          <div className="cause-list__timeline-v-title-col">
                            <h4 className="cause-list__timeline-v-event-title">{h.purpose || 'Hearing'}</h4>
                            <span className="cause-list__timeline-v-event-date">{formatDate(h.date)}</span>
                          </div>
                          <div className="cause-list__timeline-v-desc-col">
                            <div className="cause-list__timeline-v-desc" dangerouslySetInnerHTML={{ __html: h.notes || '—' }} />
                          </div>
                          <div className="cause-list__timeline-v-action-col">
                            <button className="cause-list__timeline-v-btn" onClick={() => setPreviewHearing(h)}>
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
          <div className="cause-list__templates-bar">
            {/* Search */}
            <div className="cause-list__search-wrapper">
              <Icon name="search" size={14} className="search-icon" />
              <input type="text" placeholder="Search templates..." value={tplSearch} onChange={(e) => setTplSearch(e.target.value)} />
            </div>

            {/* Categories select */}
            <select className="cause-list__select-input" value={tplCategory} onChange={(e) => setTplCategory(e.target.value)}>
              <option value="">All Categories</option>
              <option value="Hearing">Hearing</option>
            </select>

            <button className="cause-list__btn-reset" onClick={() => { setTplSearch(''); setTplCategory(''); }}>Reset</button>
            <button className="cause-list__btn-apply" onClick={openTplNew}>
              <Icon name="plus" size={13} /> New Template
            </button>
          </div>

          {/* Templates list heading */}
          <div className="cause-list__card-header">
            <div className="cause-list__card-header-title">Templates ({filteredTpls.length})</div>
          </div>

          {/* Templates Flex Grid */}
          {paginatedTpls.length === 0 ? (
            <Card><EmptyState icon="file" title="No templates match the criteria." /></Card>
          ) : (
            <div className="cause-list__templates-grid">
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
                  <div className="cause-list__tpl-card" key={t.id}>
                    <div className={`cause-list__tpl-icon-wrapper cause-list__tpl-icon-wrapper--${iconColor}`}>
                      <Icon name="file" size={20} />
                    </div>
                    <div className="cause-list__tpl-card-content">
                      <h3 className="cause-list__tpl-card-title">{t.name}</h3>
                      <p className="cause-list__tpl-card-desc">{t.description || t.content || 'Drafting formatting guidelines.'}</p>
                      <div className="cause-list__tpl-card-footer">
                        <span className={`cause-list__tpl-tag cause-list__tpl-tag--${catLower}`}>
                          {t.category}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Templates Pagination */}
          {tplTotalPages > 1 && (
            <div className="cause-list__footer-pagination">
              <div className="cause-list__pagination-info">
                Showing {((tplPage - 1) * tplPageSize) + 1} to {Math.min(tplPage * tplPageSize, filteredTpls.length)} of {filteredTpls.length} templates
              </div>
              <div className="cause-list__pagination-controls">
                <div className="cause-list__page-buttons">
                  <button className="cause-list__page-btn" onClick={() => setTplPage(p => Math.max(p - 1, 1))} disabled={tplPage === 1}>«</button>
                  {Array.from({ length: tplTotalPages }).map((_, i) => (
                    <button key={i} className={`cause-list__page-btn ${tplPage === i + 1 ? 'cause-list__page-btn--active' : ''}`} onClick={() => setTplPage(i + 1)}>
                      {i + 1}
                    </button>
                  ))}
                  <button className="cause-list__page-btn" onClick={() => setTplPage(p => Math.min(p + 1, tplTotalPages))} disabled={tplPage === tplTotalPages}>»</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 4. TIMELINE TAB */}
      {tab === 'timeline' && (
        <div className="cause-list__timeline-tab">
          {/* Case selector bar */}
          <div className="cause-list__timeline-selector-bar">
            <div className="cause-list__timeline-selector-label">
              <Icon name="vault" size={15} />
              <span>Case</span>
            </div>
            <div className="cause-list__timeline-selector-field">
              <CaseSelect value={histCaseId} onChange={(val) => loadHistory(val)} />
            </div>
          </div>

          {!history ? (
            <Card><EmptyState icon="clock" title="Select a case to view its visual timeline." /></Card>
          ) : (
            <>
              {/* Case Info Header Card */}
              <div className="cause-list__case-info-card">
                <div className="cause-list__case-info-header">
                  <div className="cause-list__case-icon-box">
                    <Icon name="balance" size={24} />
                  </div>
                  <div className="cause-list__case-title-area">
                    <div className="cause-list__case-title-row">
                      <h2 className="cause-list__case-title">{formatCaseNumber(history.case) || history.case?.caseNumber || history.case?.case_display_number}</h2>
                      <span className="cause-list__case-badge-active">{history.case?.status || 'Active'}</span>
                    </div>
                    <p className="cause-list__case-subtitle">{history.case?.title}</p>
                    <div className="cause-list__header-court">{history.case?.court_hierarchy || ''}{history.case?.court_hierarchy && extractJurisdiction(history.case) ? ', ' : ''}{extractJurisdiction(history.case) || ''}</div>
                  </div>
                </div>

                <div className="cause-list__details-grid">
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Case Type</span>
                    <span className="cause-list__details-value">{history.case?.case_type || '—'}</span>
                  </div>
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Filing Date</span>
                    <span className="cause-list__details-value">{formatDate(history.case?.filing_date) || '—'}</span>
                  </div>
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Current Stage</span>
                    <span className="cause-list__details-value">{history.case?.stage || '—'}</span>
                  </div>
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Next Hearing</span>
                    <span className="cause-list__details-value">{formatDate(history.case?.next_hearing) || '—'}</span>
                  </div>
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Judge</span>
                    <span className="cause-list__details-value">{history.case?.judge || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Horizontal Scrollable node timeline */}
              {history.hearings.length > 0 && (
                <div className="cause-list__timeline-h-container">
                  <div className="cause-list__timeline-h">
                    <div className="cause-list__timeline-h-track" />
                    {history.hearings.map((h, i) => {
                      const markerClass = h.status?.toLowerCase() || 'default';
                      const isScheduled = h.status === 'Scheduled';
                      return (
                        <div className="cause-list__timeline-h-node" key={h.id || i}>
                          <div className={`cause-list__timeline-h-circle cause-list__timeline-h-circle--${markerClass}`}>
                            {isScheduled ? (
                              <Icon name="clock" size={14} />
                            ) : (
                              <Icon name="check" size={14} />
                            )}
                          </div>
                          <div className="cause-list__timeline-h-text">
                            <span className="cause-list__timeline-h-name">{h.purpose || 'Hearing'}</span>
                            <span className="cause-list__timeline-h-date">{formatDate(h.date)}</span>
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
                        <th style={{ textAlign: 'right' }}>Document</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.hearings.map((h, i) => {
                        const statusClass = h.status?.toLowerCase() || 'default';
                        return (
                          <tr key={h.id || i}>
                            <td style={{ whiteSpace: 'nowrap' }} className="cause-list__timeline-event-date-cell">{formatDate(h.date)}</td>
                            <td>
                              <div className="flex align-center gap-8">
                                <span className={`cause-list__timeline-event-dot cause-list__timeline-event-dot--${statusClass}`} />
                                <span className="cause-list__timeline-event-name">{h.purpose || 'Hearing'}</span>
                              </div>
                            </td>
                            <td className="cause-list__timeline-event-detail"><div className="cause-list__timeline-event-detail-inner" dangerouslySetInnerHTML={{ __html: h.notes || '—' }} /></td>
                            <td style={{ textAlign: 'right' }}>
                              {h.docRef ? (
                                <Button size="sm" variant="ghost" icon="eye" onClick={() => setPreviewDoc({ name: h.docName || 'Document', ref: h.docRef })}>
                                  View
                                </Button>
                              ) : (
                                <button className="cause-list__timeline-doc-icon" title="View hearing details" onClick={() => setPreviewHearing(h)}>
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

      {/* Hearing add/edit modal — redesigned with sections, icons, rich text editor & template import */}
      <Modal
        open={open}
        title={editing ? 'Edit Cause List' : 'Add Cause List'}
        size="lg"
        onClose={() => setOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button icon="save" onClick={saveHearing}>{editing ? 'Update' : 'Add'}</Button></>}
      >
        <div className="hearing-modal">
          {/* Import / Export toolbar */}
          <div className="hearing-modal__import-export-bar">
            <div className="hearing-modal__ie-left">
              <button className={`btn btn--sm ${showImport ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setShowImport((v) => !v)}>
                <Icon name="download" size={13} /> Import
              </button>
              <label className="btn btn--sm btn--ghost" style={{ cursor: 'pointer' }}>
                <Icon name="upload" size={13} /> Export
                <select className="hearing-modal__ie-export-select" onChange={(e) => { const v = e.target.value; if (v === 'json') exportAsJson(); if (v === 'csv') exportAsCsv(); e.target.value = ''; }} onClick={(e) => e.stopPropagation()}>
                  <option value="">—</option>
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </select>
              </label>
            </div>
            {showImport && (
              <div className="hearing-modal__ie-right">
                <input type="file" accept=".json,.csv" onChange={handleImportFile} style={{ display: 'none' }} id="hearing-import-file" />
                <label htmlFor="hearing-import-file" className="btn btn--sm btn--ghost" style={{ cursor: 'pointer' }}><Icon name="file" size={13} /> Upload File</label>
              </div>
            )}
          </div>

          {showImport && (
            <div className="hearing-modal__import-panel">
              <textarea
                className="hearing-modal__import-textarea"
                placeholder="Paste JSON or CSV here...&#10;&#10;JSON example:&#10;{&quot;caseId&quot;: &quot;...&quot;, &quot;date&quot;: &quot;2026-06-25&quot;, &quot;status&quot;: &quot;Active&quot;, &quot;purpose&quot;: &quot;Hearing&quot;, &quot;judge&quot;: &quot;Judge name&quot; }&#10;&#10;CSV example:&#10;caseId,date,status,purpose,judge&#10;abc123,2026-06-25,Active,Hearing,Judge name"
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

          {/* Section 1: Case & Date */}
          <div className="hearing-modal__section">
            <div className="hearing-modal__section-title">
              <Icon name="target" size={16} />
              <span>Case & Date</span>
            </div>
            <div className="input-row">
              <Field label="Case Number">
                <CaseSelect value={form.caseId} onChange={(v) => { setForm({ ...form, caseId: v }); setEditorContent(''); setSelectedTemplate(''); }} />
              </Field>
              <Field label="Hearing Date">
                <Input
                  type="date"
                  value={form.date || ''}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
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
              <Field label="Purpose">
                <Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. Defendant Evidence" />
              </Field>
            </div>
            <Field label="Judge">
              <Input
                value={form.judge || getCaseDetails(form.caseId)?.judge || ''}
                onChange={(e) => setForm({ ...form, judge: e.target.value })}
                placeholder="Judge name"
              />
            </Field>
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
              <div className="list-row cause-list__file-row">
                <div className="list-row__icon"><Icon name="file" size={15} /></div>
                <div className="cause-list__file-name">{form.docName}</div>
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
        <HearingPreviewModal
          hearing={previewHearing}
          doc={previewDoc}
          onClose={() => { setPreviewHearing(null); setPreviewDoc(null); }}
          onViewDocument={(ref) => viewFile(ref)}
          cases={cases}
        />
      )}

      {/* Template creation modal */}
      <Modal
        open={tplOpen}
        title={tplEditing ? 'Edit Template' : 'New Template'}
        onClose={() => setTplOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setTplOpen(false)}>Cancel</Button><Button icon="save" onClick={saveTpl}>{tplEditing ? 'Update' : 'Create'}</Button></>}
      >
        <Field label="Template Name"><Input value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} placeholder="e.g. Legal Notice" /></Field>
        <Field label="Category">
          <Select value={tplForm.category} onChange={(e) => setTplForm({ ...tplForm, category: e.target.value })}>
            <option value="Hearing">Hearing</option>
          </Select>
        </Field>
        <Field label="Description"><Input value={tplForm.description} onChange={(e) => setTplForm({ ...tplForm, description: e.target.value })} placeholder="e.g. Template for drafting written statement by defendant." /></Field>
        <Field label="Template Content"><Textarea value={tplForm.content} onChange={(e) => setTplForm({ ...tplForm, content: e.target.value })} placeholder="Drafting content structure..." /></Field>
      </Modal>
    </div>
  );
}