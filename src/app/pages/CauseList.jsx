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
import { useHearingStatuses } from '@/hooks/useHearingStatuses.js';
import { causeListLogic } from '@/logic/causeListLogic.js';
import { caseLogic } from '@/logic/caseLogic.js';
import { templateLogic } from '@/logic/templateLogic.js';
import { fileLogic } from '@/logic/fileLogic.js';
import { useAppData } from '@/data-layer/AppDataContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { formatDate, formatDateTime } from '@/utils/format.js';
import { combinedCourt } from '@/utils/caseFormat.js';

const EMPTY_HEARING = { caseId: '', date: '', status: '', purpose: '', notes: '', docRef: null, docName: '' };
const EMPTY_TPL = { name: '', category: 'Hearing', description: '', content: '' };

export default function CauseList() {
  const toast = useToast();
  const { user } = useAuth();
  const { cases, ready, refreshCases } = useAppData();
  const { statuses: hearingStatuses } = useHearingStatuses();
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState('list'); // list | history | templates | timeline
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_HEARING);

  // Advanced filters state for Cause List Tab
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourt, setFilterCourt] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tempDateFrom, setTempDateFrom] = useState('');
  const [tempDateTo, setTempDateTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

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
  const [seeding, setSeeding] = useState(false);

  // Rich text editor state
  const [draftTemplates, setDraftTemplates] = useState([]);
  const [editorContent, setEditorContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

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

  const checkAndSeed = useCallback(async () => {
    if (!ready || seeding) return;
    const demoCaseExists = cases.some((c) => c.caseNumber === 'CS (I) No. 392 of 2015');
    if (demoCaseExists) return;

    setSeeding(true);
    try {
      // 1. Seed Cases
      const case1 = await caseLogic.create({
        case_type: 'CS (I)',
        case_number: 392,
        case_year: 2015,
        title: 'Purna Chandra Sahoo & Others vs Pravati Sahoo & Others',
        court: 'Civil Judge (Sr. Div.) Athgarh',
        judge: 'Babita Mishra',
        stage: 'Defendant Evidence',
        filing_date: '2015-12-09',
        next_hearing: '2026-07-09',
        status: 'Active',
        priority: 'Normal',
        court_name: 'Athgarh',
      }, user);

      const case2 = await caseLogic.create({
        case_type: 'CS (I)',
        case_number: 156,
        case_year: 2024,
        title: 'Ramesh Kumar vs State of Odisha',
        court: 'Civil Judge (Sr. Div.) Cuttack',
        judge: 'S.K. Patnaik',
        stage: 'Plaintiff Evidence',
        filing_date: '2024-01-12',
        next_hearing: '2026-06-15',
        status: 'Active',
        priority: 'Normal',
        court_name: 'Cuttack',
      }, user);

      const case3 = await caseLogic.create({
        case_type: 'FAO',
        case_number: 21,
        case_year: 2017,
        title: 'ABC Corp vs XYZ Ltd',
        court: 'District Judge Cuttack',
        judge: 'P. Mohanty',
        stage: 'Final Arguments',
        filing_date: '2017-03-05',
        next_hearing: '2026-06-17',
        status: 'Active',
        priority: 'High',
        court_name: 'Cuttack',
      }, user);

      const case4 = await caseLogic.create({
        case_type: 'WP(C)',
        case_number: 845,
        case_year: 2023,
        title: 'Priya Sharma vs Union of India',
        court: 'High Court of Orissa Cuttack',
        judge: 'Justice R. Panda',
        stage: 'Hearing',
        filing_date: '2023-06-20',
        next_hearing: '2026-06-20',
        status: 'Active',
        priority: 'Critical',
        court_name: 'Cuttack',
      }, user);

      const case5 = await caseLogic.create({
        case_type: 'CS (I)',
        case_number: 78,
        case_year: 2025,
        title: 'Suresh Patel vs Mahesh Patel',
        court: 'Civil Judge (Jr. Div.) Athgarh',
        judge: 'A. Behera',
        stage: 'Framing of Issues',
        filing_date: '2025-01-01',
        next_hearing: '2026-06-22',
        status: 'Active',
        priority: 'Normal',
        court_name: 'Athgarh',
      }, user);

      // 2. Seed Hearings for Case 1 (CS (I) No. 392 of 2015)
      const hearingsForCase1 = [
        { caseId: case1.id, date: '2015-12-09T10:00:00.000Z', status: 'Completed', purpose: 'Case Filed', notes: 'Case has been filed in the court.' },
        { caseId: case1.id, date: '2015-12-22T10:30:00.000Z', status: 'Completed', purpose: 'Summons Issued', notes: 'Summons issued to defendants.' },
        { caseId: case1.id, date: '2016-10-27T11:00:00.000Z', status: 'Completed', purpose: 'Written Statement Filed', notes: 'Written statement filed by defendants.' },
        { caseId: case1.id, date: '2017-02-15T11:30:00.000Z', status: 'Completed', purpose: 'Issues Framed', notes: 'Court framed issues in the case.' },
        { caseId: case1.id, date: '2018-08-10T10:00:00.000Z', status: 'Completed', purpose: 'Plaintiff Evidence', notes: 'Plaintiff evidence recorded and completed.' },
        { caseId: case1.id, date: '2026-03-05T10:30:00.000Z', status: 'Completed', purpose: 'Defendant Evidence', notes: 'Defendant evidence in progress.' },
        { caseId: case1.id, date: '2026-07-09T10:30:00.000Z', status: 'Scheduled', purpose: 'Next Hearing', notes: 'Hearing date scheduled.' },
      ];

      const otherHearings = [
        { caseId: case2.id, date: '2026-06-15T11:00:00.000Z', status: 'Scheduled', purpose: 'Plaintiff Evidence', notes: 'Plaintiff evidence to be recorded.' },
        { caseId: case3.id, date: '2026-06-17T14:00:00.000Z', status: 'Rescheduled', purpose: 'Final Arguments', notes: 'Final arguments hearing.' },
        { caseId: case4.id, date: '2026-06-20T10:30:00.000Z', status: 'Completed', purpose: 'Hearing', notes: 'Hearing completed.' },
        { caseId: case5.id, date: '2026-06-22T11:30:00.000Z', status: 'Scheduled', purpose: 'Framing of Issues', notes: 'Framing of issues hearing.' },
      ];

      for (const h of [...hearingsForCase1, ...otherHearings]) {
        await causeListLogic.addHearing(h);
      }

      // 3. Seed Drafting Templates — hearing-related only
      const demoTemplates = [
        { name: 'Hearing Notice', category: 'Hearing', content: 'Hearing notice draft template...', is_active: true, description: 'Notice to parties for scheduled court hearing date and time.' },
        { name: 'Adjournment Application', category: 'Hearing', content: 'Adjournment application draft template...', is_active: true, description: 'Application seeking adjournment of hearing to a future date.' },
        { name: 'Short Cause Notice', category: 'Hearing', content: 'Short cause notice draft template...', is_active: true, description: 'Notice for listing of short cause matters before the court.' },
        { name: 'Hearing Order Sheet', category: 'Hearing', content: 'Hearing order sheet template...', is_active: true, description: 'Standard order sheet for recording proceedings at each hearing.' },
        { name: 'Next Date Intimation', category: 'Hearing', content: 'Next date intimation draft template...', is_active: true, description: 'Letter intimating parties of the next scheduled hearing date.' },
        { name: 'Hearing Appearance Memo', category: 'Hearing', content: 'Appearance memo draft template...', is_active: true, description: 'Memo confirming counsel appearance at the court hearing.' },
      ];

      for (const t of demoTemplates) {
        await templateLogic.create(t);
      }

      await refreshCases();
      await loadList();
      await loadDraftingTemplates();
      toast.push('Demo litigation data seeded successfully.', 'success');
    } catch (e) {
      console.error(e);
    } finally {
      setSeeding(false);
    }
  }, [cases, ready, seeding, refreshCases, loadList, loadDraftingTemplates, user, toast]);

  useEffect(() => {
    loadList();
    loadDraftingTemplates();
  }, [loadList, loadDraftingTemplates]);

  useEffect(() => {
    if (ready && cases.length === 0) {
      checkAndSeed();
    }
  }, [cases, ready, checkAndSeed]);

  // Sync selected case history if case list loads and case selection matches
  const loadHistory = useCallback(async (caseId) => {
    setHistCaseId(caseId);
    if (!caseId) { setHistory(null); return; }
    const res = await causeListLogic.caseHistory(caseId);
    setHistory(res.ok ? res.data : null);
  }, []);

  // When cases list loads or page initializes, auto-select first case for convenience
  useEffect(() => {
    if (cases.length > 0 && !histCaseId) {
      const demoId = cases.find(c => c.caseNumber === 'CS (I) No. 392 of 2015')?.id || cases[0]?.id;
      if (demoId) {
        loadHistory(demoId);
      }
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
  const openEdit = (h) => {
    setEditing(h);
    setForm({ ...EMPTY_HEARING, ...h });
    setEditorContent(h.notes || '');
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
    if (editing) await causeListLogic.updateHearing(editing.id, payload);
    else await causeListLogic.addHearing(payload);
    setOpen(false);
    await loadList();
    if (histCaseId) await loadHistory(histCaseId);
    toast.push(editing ? 'Hearing updated.' : 'Hearing added.', 'success');
  };

  const deleteHearing = async (id) => {
    await causeListLogic.deleteHearing(id);
    await loadList();
    if (histCaseId) await loadHistory(histCaseId);
    toast.push('Hearing deleted.', 'info');
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
  const uniqueCourts = Array.from(new Set(cases.map(c => combinedCourt(c)).filter(name => name && name !== '—')));

  const handleSortToggle = () => {
    setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCourt('');
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
    if (filterCourt && row.court !== filterCourt) return false;
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
            <Button icon="plus" onClick={openNew}>Add Hearing</Button>
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
              {uniqueCourts.map(court => (
                <option key={court} value={court}>{court}</option>
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
              {hearingStatuses.map(st => (
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
                    <div className="cause-list__header-court">{combinedCourt(selCase)}</div>
                  </div>
                </div>
                <div className="cause-list__details-grid">
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Court</span>
                    <span className="cause-list__details-value">{combinedCourt(selCase)}</span>
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
                <EmptyState icon="calendar" title="No hearings listed." action={<Button icon="plus" onClick={openNew}>Add Hearing</Button>} />
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
                            {h.docRef && (
                              <button className="btn btn--ghost btn--sm" onClick={() => viewFile(h.docRef)} title="View Document">
                                <Icon name="eye" size={13} />
                              </button>
                            )}
                            <button className="btn btn--ghost btn--sm" onClick={() => openEdit(h)} title="Edit Hearing">
                              <Icon name="edit" size={13} />
                            </button>
                            <button className="btn btn--ghost btn--sm text-danger" onClick={() => deleteHearing(h.id)} title="Delete Hearing">
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
                    <div className="cause-list__header-court">{combinedCourt(history.case)}</div>
                  </div>
                </div>

                <div className="cause-list__details-grid">
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Court</span>
                    <span className="cause-list__details-value">{combinedCourt(history.case)}</span>
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
                            {h.notes || '—'}
                          </div>
                          <div className="cause-list__timeline-v-action-col">
                            {h.docRef ? (
                              <button className="cause-list__timeline-v-btn" onClick={() => viewFile(h.docRef)}>
                                Document
                              </button>
                            ) : (
                              <button className="cause-list__timeline-v-btn" onClick={() => openEdit(h)}>
                                View Details
                              </button>
                            )}
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
                    <div className="cause-list__header-court">{combinedCourt(history.case)}</div>
                  </div>
                </div>

                <div className="cause-list__details-grid">
                  <div className="cause-list__details-item">
                    <span className="cause-list__details-label">Court</span>
                    <span className="cause-list__details-value">{combinedCourt(history.case)}</span>
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
                            <td className="cause-list__timeline-event-detail">{h.notes || '—'}</td>
                            <td style={{ textAlign: 'right' }}>
                              {h.docRef ? (
                                <Button size="sm" variant="ghost" icon="eye" onClick={() => viewFile(h.docRef)}>
                                  View
                                </Button>
                              ) : (
                                <button className="cause-list__timeline-doc-icon" disabled title="No document">
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
        title={editing ? 'Edit Hearing' : 'Add Hearing'}
        size="lg"
        onClose={() => setOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button icon="save" onClick={saveHearing}>{editing ? 'Update' : 'Add'}</Button></>}
      >
        <div className="hearing-modal">
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
              <Field label="Hearing Date & Time">
                <Input
                  type="datetime-local"
                  value={form.date ? new Date(form.date).toISOString().slice(0, 16) : ''}
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
                    {hearingStatuses.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                  <button className="hearing-modal__gear-btn" title="Manage hearing statuses">
                    <Icon name="gear" size={15} />
                  </button>
                </div>
              </Field>
              <Field label="Purpose">
                <Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. Defendant Evidence" />
              </Field>
            </div>
            <Field label="Judge / Officer">
              <Input
                value={form.judge || getCaseDetails(form.caseId)?.judge || ''}
                onChange={(e) => setForm({ ...form, judge: e.target.value })}
                placeholder="Presiding judge or officer name"
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
                  {draftTemplates.map((t) => (
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