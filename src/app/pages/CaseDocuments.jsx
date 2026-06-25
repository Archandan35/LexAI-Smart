import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import { Input } from '@/components/Field.jsx';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { caseFoldersRepository } from '@/data-layer/repositories/caseFoldersRepository.js';
import storageService from '@/services/storageService.js';
import { formatDate, bytes } from '@/utils/format.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

/* ── helpers ── */
function fileExt(name = '') {
  return (name.split('.').pop() || '').toUpperCase();
}

function FileTypeIcon({ name }) {
  const ext = fileExt(name);
  const map = {
    PDF: { bg: '#fef2f2', color: '#dc2626', label: 'PDF' },
    DOCX: { bg: '#eff6ff', color: '#2563eb', label: 'W' },
    DOC: { bg: '#eff6ff', color: '#2563eb', label: 'W' },
    XLSX: { bg: '#f0fdf4', color: '#16a34a', label: 'XL' },
    XLS: { bg: '#f0fdf4', color: '#16a34a', label: 'XL' },
  };
  const cfg = map[ext] || { bg: 'var(--brand-soft)', color: 'var(--navy-700)', label: ext.slice(0, 2) || '?' };
  return (
    <span className="cdoc__type-icon" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function ExtBadge({ name }) {
  const ext = fileExt(name);
  const map = { PDF: 'cdoc__badge--pdf', DOCX: 'cdoc__badge--docx', DOC: 'cdoc__badge--docx', XLSX: 'cdoc__badge--xlsx', XLS: 'cdoc__badge--xlsx' };
  return <span className={`cdoc__badge ${map[ext] || ''}`}>{ext}</span>;
}

/* ── stat card ── */
function StatCard({ icon, value, label, sub }) {
  return (
    <div className="cdoc__stat-card">
      <div className="cdoc__stat-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <div className="cdoc__stat-val">{value}</div>
      <div className="cdoc__stat-label">{label}</div>
      {sub && <div className="cdoc__stat-sub">{sub}</div>}
    </div>
  );
}

/* ── main ── */
export default function CaseDocuments() {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [activeFolder, setActiveFolder] = useState(null); // null = All Documents
  const [expanded, setExpanded] = useState({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [bulkAdding, setBulkAdding] = useState(false);
  const [bulkNames, setBulkNames] = useState('');
  const [docSelected, setDocSelected] = useState([]);
  const [folderSelected, setFolderSelected] = useState(new Set());
  const [preview, setPreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [clipboard, setClipboard] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [sortBy, setSortBy] = useState('name-az');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [docMenuId, setDocMenuId] = useState(null);
  const [folderSearch, setFolderSearch] = useState('');
  const [fileExtFilter, setFileExtFilter] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [folderProps, setFolderProps] = useState(null);
  const fileInputRef = useRef(null);

  // close context menu on click outside
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = () => setCtxMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [ctxMenu]);

  // close filter popup on click outside
  useEffect(() => {
    if (!showFilter) return;
    const handler = (e) => { if (!e.target.closest('.cdoc__filter-wrap')) setShowFilter(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, f] = await Promise.all([
      documentsRepository.getAll().catch(() => []),
      caseFoldersRepository.getAll().catch(() => []),
    ]);
    setDocs(Array.isArray(d) ? d : []);
    setFolders(Array.isArray(f) ? f : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // close doc context menu on outside click
  useEffect(() => {
    if (!docMenuId) return;
    const handler = () => setDocMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [docMenuId]);

  const rootFolders = useMemo(() =>
    folders.filter((f) => !f.parent_id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    , [folders]);

  const getChildren = useCallback((parentId) =>
    folders.filter((f) => f.parent_id === parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    , [folders]);

  const docCounts = useMemo(() => {
    const m = {};
    docs.forEach((d) => { m[d.folder] = (m[d.folder] || 0) + 1; });
    return m;
  }, [docs]);

  const totalSize = useMemo(() => docs.reduce((s, d) => s + (d.size || 0), 0), [docs]);

  const lastUpdated = useMemo(() => {
    if (!docs.length) return null;
    const dates = docs.map((d) => new Date(d.uploaded_at || d.created_at || d.uploadedAt || 0)).filter(Boolean);
    if (!dates.length) return null;
    return new Date(Math.max(...dates.map((x) => x.getTime())));
  }, [docs]);

  const getFolderName = useCallback((id) => {
    const f = folders.find((x) => x.id === id);
    return f ? f.name : null;
  }, [folders]);

  const getAllDescendantIds = useCallback((parentId) => {
    const ids = [];
    const walk = (pid) => {
      const children = folders.filter((f) => f.parent_id === pid);
      for (const c of children) { ids.push(c.id); walk(c.id); }
    };
    walk(parentId);
    return ids;
  }, [folders]);

  const breadcrumbPath = useMemo(() => {
    if (!activeFolder) return [];
    const path = [];
    let current = folders.find((f) => f.id === activeFolder);
    while (current) {
      path.unshift(current);
      current = current.parent_id ? folders.find((f) => f.id === current.parent_id) : null;
    }
    return path;
  }, [activeFolder, folders]);

  function folderMatches(f, term) {
    if (!term) return true;
    const t = term.toLowerCase();
    if (f.name.toLowerCase().includes(t)) return true;
    return folders.some((c) => c.parent_id === f.id && folderMatches(c, t));
  }

  const filteredRootFolders = useMemo(() => {
    if (!folderSearch) return rootFolders;
    return rootFolders.filter((f) => folderMatches(f, folderSearch));
  }, [folderSearch, rootFolders, folders]);

  const visible = !activeFolder
    ? docs
    : docs.filter((d) => d.folder === getFolderName(activeFolder));

  const sorted = useMemo(() => {
    let arr = [...visible];
    if (search) arr = arr.filter((d) => (d.name || d.title || '').toLowerCase().includes(search.toLowerCase()));
    if (fileExtFilter.length > 0) arr = arr.filter((d) => fileExtFilter.includes(fileExt(d.name || '')));
    if (sortBy === 'name-az') arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (sortBy === 'name-za') arr.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    if (sortBy === 'date-new') arr.sort((a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0));
    if (sortBy === 'date-old') arr.sort((a, b) => new Date(a.uploaded_at || 0) - new Date(b.uploaded_at || 0));
    if (sortBy === 'size') arr.sort((a, b) => (b.size || 0) - (a.size || 0));
    return arr;
  }, [visible, search, fileExtFilter, sortBy]);

  const isFileView = (activeFolder && getChildren(activeFolder).length === 0) || (!activeFolder && docs.length > 0);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  // reset page on filter change
  useEffect(() => { setPage(1); }, [search, activeFolder, sortBy]);

  /* ── folder ops ── */
  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const selectFolder = (id) => {
    if (clipboard || selectMode) return;
    setActiveFolder(id);
    setDocSelected([]);
  };

  const createFolder = async () => {
    const name = newName.trim();
    if (!name) { toast.push('Folder name is required.', 'error'); return; }
    const order = folders.reduce((m, f) => Math.max(m, f.order ?? 0), 0) + 1;
    const res = await caseFoldersRepository.create({ name, kind: 'document', parent_id: activeFolder || null, order, system: false, created_at: new Date().toISOString() }).catch((e) => { toast.push(e?.message || 'Failed to create folder.', 'error'); return null; });
    if (res) { toast.push('Folder created.', 'success'); setNewName(''); setCreating(false); await load(); if (activeFolder) setExpanded((p) => ({ ...p, [activeFolder]: true })); }
  };

  const bulkAddFolders = async () => {
    const names = bulkNames.split('\n').map((n) => n.trim()).filter(Boolean);
    if (!names.length) { toast.push('Enter at least one folder name.', 'error'); return; }
    const order = folders.reduce((m, f) => Math.max(m, f.order ?? 0), 0) + 1;
    let created = 0;
    for (let i = 0; i < names.length; i++) {
      const res = await caseFoldersRepository.create({ name: names[i], kind: 'document', parent_id: activeFolder || null, order: order + i, system: false, created_at: new Date().toISOString() }).catch(() => null);
      if (res) created++;
    }
    toast.push(`${created} folder(s) created.`, 'success');
    setBulkNames(''); setBulkAdding(false); setCreating(false); await load();
    if (activeFolder) setExpanded((p) => ({ ...p, [activeFolder]: true }));
  };

  const startRename = (f) => { setEditingId(f.id); setEditName(f.name); };
  const saveRename = async () => {
    const name = editName.trim();
    if (!name) { setEditingId(null); return; }
    await caseFoldersRepository.update(editingId, { name }).catch(() => { });
    setEditingId(null); await load();
  };
  const cancelRename = () => setEditingId(null);

  const deleteFolder = async (f) => {
    const descIds = getAllDescendantIds(f.id);
    const allIds = [...descIds.reverse(), f.id];
    if (!confirm(`Delete "${f.name}"${descIds.length > 0 ? ` and ${descIds.length} sub-folder(s)` : ''}?`)) return;
    for (const id of allIds) await caseFoldersRepository.delete(id).catch(() => { });
    toast.push('Folder deleted.', 'success');
    if (activeFolder === f.id || descIds.includes(activeFolder)) setActiveFolder(null);
    await load();
  };

  const bulkDeleteFolders = async () => {
    if (!folderSelected.size) return;
    const allIds = new Set(folderSelected);
    for (const id of folderSelected) getAllDescendantIds(id).forEach((did) => allIds.add(did));
    if (!confirm(`Delete ${allIds.size} folder(s)?`)) return;
    for (const id of [...allIds].reverse()) await caseFoldersRepository.delete(id).catch(() => { });
    toast.push(`Deleted ${allIds.size} folder(s).`, 'success');
    setFolderSelected(new Set()); await load();
  };

  const cutFolder = (f) => setClipboard({ type: 'cut', folderId: f.id, folder: f });
  const copyFolder = (f) => setClipboard({ type: 'copy', folderId: f.id, folder: f });
  const cancelClipboard = () => setClipboard(null);

  const pasteHere = async (targetId) => {
    if (!clipboard) return;
    const { type, folder } = clipboard;
    if (type === 'cut') {
      if (folder.id === targetId) { toast.push('Cannot move folder into itself.', 'error'); return; }
      const descIds = getAllDescendantIds(folder.id);
      if (descIds.includes(targetId)) { toast.push('Cannot move folder into its own sub-folder.', 'error'); return; }
      if (targetId && getChildren(targetId).some((f) => f.name.toLowerCase() === folder.name.toLowerCase())) { toast.push('A folder with that name already exists.', 'error'); return; }
      await caseFoldersRepository.update(folder.id, { parent_id: targetId || null }).catch(() => { });
      toast.push('Folder moved.', 'success');
    } else if (type === 'copy') {
      const copyRecursive = async (sourceId, newParentId) => {
        const source = folders.find((f) => f.id === sourceId);
        if (!source) return;
        const children = getChildren(sourceId);
        const newFolder = await caseFoldersRepository.create({ name: source.name, kind: source.kind, parent_id: newParentId || null, order: source.order ?? 0, system: false, created_at: new Date().toISOString() }).catch(() => null);
        if (!newFolder) return;
        for (const child of children) await copyRecursive(child.id, newFolder.id);
      };
      await copyRecursive(folder.id, targetId);
      toast.push('Folder copied.', 'success');
    }
    setClipboard(null); await load();
  };

  const toggleDocSelect = (id) => setDocSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const toggleFolderSelect = (id) => setFolderSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const allChecked = paginated.length > 0 && paginated.every((d) => docSelected.includes(d.id));
  const someChecked = paginated.some((d) => docSelected.includes(d.id));
  const toggleAll = () => {
    if (allChecked) setDocSelected((s) => s.filter((id) => !paginated.some((d) => d.id === id)));
    else setDocSelected((s) => [...new Set([...s, ...paginated.map((d) => d.id)])]);
  };

  const toggleFileExt = (ext) => {
    setFileExtFilter((prev) => prev.includes(ext) ? prev.filter((e) => e !== ext) : [...prev, ext]);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const folder = activeFolder ? getFolderName(activeFolder) || 'Miscellaneous' : 'Miscellaneous';
      await storageService.uploadDocument(file, { folder });
      toast.push('Document uploaded.', 'success');
      await load();
    } catch (err) {
      toast.push(err?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ── folder tree renderer ── */
  const renderTree = (nodes, guides = []) => nodes.map((f, idx) => {
    const children = getChildren(f.id);
    const isLast = idx === nodes.length - 1;
    const isExpanded = folderSearch ? true : expanded[f.id];
    const isActive = activeFolder === f.id;
    const isEditing = editingId === f.id;
    const isCut = clipboard?.type === 'cut' && clipboard?.folderId === f.id;
    const isHovered = hoveredId === f.id;
    const isSelected = folderSelected.has(f.id);
    const canPaste = clipboard && clipboard.folderId !== f.id && !getAllDescendantIds(f.id).includes(clipboard.folderId);
    const hasChildren = children.length > 0;
    const count = docCounts[f.name] || 0;

    const filteredChildren = folderSearch
      ? children.filter((c) => folderMatches(c, folderSearch))
      : children;

    return (
      <React.Fragment key={f.id}>
        <div
          className={`docmgr__folder-wrap${isActive ? ' active' : ''}${isCut ? ' docmgr__folder--cut' : ''}${isSelected ? ' docmgr__folder--selected' : ''}`}
          onMouseEnter={() => setHoveredId(f.id)}
          onMouseLeave={() => setHoveredId(null)}
          onClick={() => { if (selectMode || clipboard) return; selectFolder(f.id); if (hasChildren) toggleExpand(f.id); }}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ id: f.id, x: e.clientX, y: e.clientY }); }}
        >
          {selectMode && <input type="checkbox" className="docmgr__folder-checkbox" checked={isSelected} onChange={() => toggleFolderSelect(f.id)} onClick={(e) => e.stopPropagation()} />}
          {guides.map((showLine, i) => <span key={i} className={`docmgr__tree-guide${showLine ? ' docmgr__tree-guide--v' : ''}`} />)}
          <span className={`docmgr__tree-conn${isLast ? ' docmgr__tree-conn--last' : ''}`}>
            {hasChildren && <span className="docmgr__tree-expand" onClick={(e) => { e.stopPropagation(); toggleExpand(f.id); }}><Icon name={isExpanded ? 'chevronDown' : 'chevron'} size={10} /></span>}
          </span>
          <Icon name={hasChildren ? 'folder' : 'file'} size={15} />
          {isEditing
            ? <Input autoFocus value={editName} className="docmgr__rename-input" onClick={(e) => e.stopPropagation()} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') cancelRename(); }} />
            : <span className={`docmgr__folder-name${isActive ? ' active' : ''}`}>{f.name}</span>
          }
          <span className="docmgr__count">{count}</span>
          {!selectMode && (isHovered || isEditing) && !clipboard && (
            <div className="docmgr__folder-actions" onClick={(e) => e.stopPropagation()}>
              {isEditing
                ? <><button className="iconbtn" title="Save" onClick={saveRename}><Icon name="check" size={13} /></button><button className="iconbtn" title="Cancel" onClick={cancelRename}><Icon name="close" size={13} /></button></>
                : <><button className="iconbtn" title="Rename" onClick={() => startRename(f)}><Icon name="edit" size={13} /></button><button className="iconbtn" title="Cut" onClick={() => cutFolder(f)}><Icon name="scissors" size={13} /></button><button className="iconbtn" title="Copy" onClick={() => copyFolder(f)}><Icon name="copy" size={13} /></button><button className="iconbtn iconbtn--danger" title="Delete" onClick={() => deleteFolder(f)}><Icon name="trash" size={13} /></button></>
              }
            </div>
          )}
          {!selectMode && canPaste && <button className="docmgr__paste-btn" onClick={(e) => { e.stopPropagation(); pasteHere(f.id); }}><Icon name="cornerDownRight" size={13} /> Paste</button>}
        </div>
        {hasChildren && isExpanded && renderTree(filteredChildren, [...guides, !isLast])}
      </React.Fragment>
    );
  });

  /* ── sort label ── */
  const sortLabels = { 'name-az': 'Name (A–Z)', 'name-za': 'Name (Z–A)', 'date-new': 'Date (Newest)', 'date-old': 'Date (Oldest)', size: 'Size' };

  /* ── render ── */
  return (
    <div className="fade-in">
      {/* Page header */}
      <div className="cdoc__header-row">
        <div className="cdoc__header-left">
          <div className="cdoc__header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="cdoc__title">Case Documents</h1>
            <p className="cdoc__subtitle">Organize and manage all documents related to this case.</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" hidden onChange={handleUpload} accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.txt" />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" icon="upload" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? 'Uploading…' : '+ Upload Document'}
          </Button>
          <Button variant="ghost" icon="plus" onClick={() => { setCreating(true); setBulkAdding(false); setNewName(''); }}>
            Add Folder
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="cdoc__stats">
        <StatCard
          icon={<><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></>}
          value={folders.length}
          label="Folders"
        />
        <StatCard
          icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>}
          value={docs.length}
          label="Documents"
        />
        <StatCard
          icon={<><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" /></>}
          value={bytes(totalSize)}
          label="Total Size"
        />
        <StatCard
          icon={<><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>}
          value={lastUpdated ? formatDate(lastUpdated) : '—'}
          label="Last Updated"
        />
      </div>

      {/* Main layout: folder panel + content */}
      <div className="cdoc__layout">

        {/* Left: Folder tree panel */}
        <aside className="cdoc__sidebar">
          <div className="cdoc__sidebar-head">
            <span className="cdoc__sidebar-title">FOLDERS</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="iconbtn" title="Expand / Collapse all" onClick={() => {
                const allIds = [];
                const walk = (list) => { list.forEach((f) => { allIds.push(f.id); walk(getChildren(f.id)); }); };
                walk(rootFolders);
                const allExpanded = allIds.every((id) => expanded[id]);
                setExpanded(Object.fromEntries(allIds.map((id) => [id, !allExpanded])));
              }}><Icon name="maximize" size={13} /></button>
              {selectMode && folderSelected.size > 0 && <button className="iconbtn iconbtn--danger" title="Delete selected" onClick={bulkDeleteFolders}><Icon name="trash" size={13} /></button>}
              <button className={`docmgr__mode-btn${selectMode ? ' active' : ''}`} title={selectMode ? 'Exit select' : 'Select folders'} onClick={() => { setSelectMode((s) => !s); if (selectMode) setFolderSelected(new Set()); }}><Icon name="checkSquare" size={13} /></button>
              <button className="iconbtn" title="New folder" onClick={() => { setCreating(true); setBulkAdding(false); setNewName(''); }}><Icon name="plus" size={14} /></button>
            </div>
          </div>

          {clipboard && (
            <div className="docmgr__clipboard-bar">
              <span className="muted">{clipboard.type === 'cut' ? '✂️ Move' : '📋 Copy'}: <strong>{clipboard.folder.name}</strong></span>
              <button className="iconbtn" onClick={cancelClipboard}><Icon name="close" size={13} /></button>
            </div>
          )}

          {/* Folder search */}
          <div className="cdoc__sidebar-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input value={folderSearch} placeholder="Search folders…" onChange={(e) => setFolderSearch(e.target.value)} />
          </div>

          {/* All Documents root item */}
          <button
            className={`docmgr__folder${!activeFolder ? ' active' : ''}`}
            onClick={() => selectFolder(null)}
          >
            <Icon name="layers" size={15} />
            <span>All Documents</span>
            <span className="docmgr__count">{docs.length}</span>
          </button>

          {clipboard && <button className="docmgr__paste-btn" onClick={() => pasteHere(null)} style={{ margin: '4px 12px' }}><Icon name="cornerDownRight" size={13} /> Paste to root</button>}

          {renderTree(filteredRootFolders)}

          {creating && (
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {!bulkAdding ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <Input autoFocus value={newName} placeholder="Folder name..." onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') { setCreating(false); setBulkAdding(false); } }} />
                  <button className="iconbtn" title="Confirm" onClick={createFolder}><Icon name="check" size={14} /></button>
                  <button className="iconbtn" title="Cancel" onClick={() => { setCreating(false); setBulkAdding(false); }}><Icon name="close" size={14} /></button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <textarea className="input docmgr__bulk-textarea" autoFocus value={bulkNames} placeholder="Enter folder names, one per line..." onChange={(e) => setBulkNames(e.target.value)} rows={4} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button size="sm" icon="plus" onClick={bulkAddFolders}>Create All</Button>
                    <Button size="sm" variant="ghost" onClick={() => setBulkAdding(false)}>Single</Button>
                    <div style={{ flex: 1 }} />
                    <button className="iconbtn" title="Cancel" onClick={() => { setCreating(false); setBulkAdding(false); }}><Icon name="close" size={14} /></button>
                  </div>
                </div>
              )}
              {!bulkAdding && <button className="docmgr__bulk-toggle" onClick={() => { setBulkAdding(true); setNewName(''); }}>+ Add multiple folders</button>}
            </div>
          )}

        </aside>

        {/* Right: Content panel */}
        <div className="cdoc__content">

          {/* Content toolbar */}
          <div className="cdoc__toolbar">
            {/* Breadcrumb */}
            <div className="cdoc__breadcrumb">
              <button
                className={`cdoc__bc-btn${!activeFolder ? ' active' : ''}`}
                onClick={() => { setActiveFolder(null); setDocSelected([]); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.79 0l-8-4a2 2 0 0 1-1.1-1.8V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z" /></svg>
                All Documents
              </button>
              {breadcrumbPath.map((f) => (
                <React.Fragment key={f.id}>
                  <span className="cdoc__bc-sep">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </span>
                  <span className="cdoc__bc-sep">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                  </span>
                  <button className="cdoc__bc-btn" onClick={() => { setActiveFolder(f.id); setDocSelected([]); }}>{f.name}</button>
                </React.Fragment>
              ))}
            </div>

            {isFileView && (
              <div className="cdoc__toolbar-right">
                {/* View toggle */}
                <div className="cdoc__seg">
                  <button className={`cdoc__seg-btn${viewMode === 'grid' ? ' active' : ''}`} title="Grid view" onClick={() => setViewMode('grid')}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                  </button>
                  <button className={`cdoc__seg-btn${viewMode === 'list' ? ' active' : ''}`} title="List view" onClick={() => setViewMode('list')}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                  </button>
                </div>

                {/* Sort */}
                <div className="cdoc__sort-wrap">
                  <span className="cdoc__sort-label">Sort by: {sortLabels[sortBy]}</span>
                  <select className="cdoc__sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="name-az">Name (A–Z)</option>
                    <option value="name-za">Name (Z–A)</option>
                    <option value="date-new">Date (Newest)</option>
                    <option value="date-old">Date (Oldest)</option>
                    <option value="size">Size</option>
                  </select>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </div>

                {/* Filters */}
                <div className="cdoc__filter-wrap">
                  <button className={`cdoc__filter-btn${fileExtFilter.length > 0 ? ' cdoc__filter-btn--active' : ''}`} onClick={() => setShowFilter((s) => !s)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                    Filters{fileExtFilter.length > 0 ? ` (${fileExtFilter.length})` : ''}
                  </button>
                  {showFilter && (
                    <div className="cdoc__filter-popup">
                      <div className="cdoc__filter-popup-title">File type</div>
                      {['PDF', 'DOCX', 'DOC', 'XLSX', 'XLS'].map((ext) => (
                        <label key={ext} className="cdoc__filter-opt">
                          <input type="checkbox" checked={fileExtFilter.includes(ext)} onChange={() => toggleFileExt(ext)} />
                          <span>{ext}</span>
                        </label>
                      ))}
                      <div className="cdoc__filter-popup-actions">
                        <button className="cdoc__filter-clear" onClick={() => { setFileExtFilter([]); setShowFilter(false); }}>Clear</button>
                        <button className="cdoc__filter-apply" onClick={() => setShowFilter(false)}>Apply</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Folder search + grid when viewing root or a folder that has children */}
          {(!activeFolder || getChildren(activeFolder).length > 0) && (
            <>
              <div className="cdoc__content-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input value={folderSearch} placeholder="Search folders…" onChange={(e) => setFolderSearch(e.target.value)} />
              </div>
              <div className="docmgr__folder-grid">{((activeFolder === null ? filteredRootFolders : getChildren(activeFolder)).filter((f) => !folderSearch || f.name.toLowerCase().includes(folderSearch.toLowerCase()))).map((f) => {
                const childCount = getChildren(f.id).length;
                const fileCount = docCounts[f.name] || 0;
                return (
                  <div
                    key={f.id}
                    className={`docmgr__folder-card${folderSelected.has(f.id) ? ' docmgr__folder-card--sel' : ''}`}
                    onClick={() => { if (selectMode) { toggleFolderSelect(f.id); return; } setActiveFolder(f.id); setDocSelected([]); }}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ id: f.id, x: e.clientX, y: e.clientY }); }}
                  >
                    <div className="cdoc__folder-card-icon" style={{ position: 'relative' }}>
                      {selectMode && (
                        <input
                          type="checkbox"
                          className="cdoc__folder-card-checkbox"
                          checked={folderSelected.has(f.id)}
                          onChange={() => toggleFolderSelect(f.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                    </div>
                    <span className="docmgr__folder-card-name">{f.name}</span>
                    <span className="docmgr__folder-card-meta">
                      {childCount > 0 && `${childCount} folder${childCount > 1 ? 's' : ''}`}
                      {childCount > 0 && fileCount > 0 && ' · '}
                      {fileCount > 0 && `${fileCount} file${fileCount > 1 ? 's' : ''}`}
                      {childCount === 0 && fileCount === 0 && 'Empty'}
                    </span>
                    <button
                      className="cdoc__folder-card-menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setCtxMenu({ id: f.id, x: rect.right - 160, y: rect.bottom + 4 });
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
          )}

          {/* Document list / grid — when inside a leaf folder or showing all docs */}
          {isFileView ? (
            <>
              {loading ? (
                <div className="empty"><span className="spinner" /></div>
              ) : sorted.length === 0 ? (
                <div className="empty">
                  <div className="empty__icon"><Icon name="folder" size={24} /></div>
                  <p className="muted">No documents found.</p>
                </div>
              ) : viewMode === 'list' ? (
                <div className="cdoc__table-wrap">
                  <table className="cdoc__table">
                    <thead>
                      <tr>
                        <th className="cdoc__th cdoc__th--check">
                          <input type="checkbox" checked={allChecked} ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }} onChange={toggleAll} />
                        </th>
                        <th className="cdoc__th cdoc__th--name">Name</th>
                        <th className="cdoc__th">Type</th>
                        <th className="cdoc__th">Size</th>
                        <th className="cdoc__th">Uploaded On</th>
                        <th className="cdoc__th">Uploaded By</th>
                        <th className="cdoc__th cdoc__th--actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((d) => {
                        const name = d.name || d.title || 'Untitled';
                        const isSelected = docSelected.includes(d.id);
                        return (
                          <tr key={d.id} className={`cdoc__tr${isSelected ? ' cdoc__tr--sel' : ''}`}>
                            <td className="cdoc__td cdoc__td--check">
                              <input type="checkbox" checked={isSelected} onChange={() => toggleDocSelect(d.id)} />
                            </td>
                            <td className="cdoc__td cdoc__td--name">
                              <div className="cdoc__doc-name-cell">
                                <FileTypeIcon name={name} />
                                <span className="cdoc__doc-name">{name}</span>
                              </div>
                            </td>
                            <td className="cdoc__td"><ExtBadge name={name} /></td>
                            <td className="cdoc__td cdoc__td--muted">{bytes(d.size)}</td>
                            <td className="cdoc__td cdoc__td--muted">{formatDate(d.uploaded_at || d.created_at || d.uploadedAt)}</td>
                            <td className="cdoc__td cdoc__td--muted">{d.uploaded_by || d.uploadedBy || '—'}</td>
                            <td className="cdoc__td cdoc__td--actions">
                              <button className="cdoc__action-btn" title="Preview" onClick={() => setPreview(d)}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                              </button>
                              <button className="cdoc__action-btn" title="Download">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                              </button>
                              <div className="cdoc__action-more-wrap" onClick={(e) => e.stopPropagation()}>
                                <button className="cdoc__action-btn" title="More" onClick={() => setDocMenuId(docMenuId === d.id ? null : d.id)}>
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                </button>
                                {docMenuId === d.id && (
                                  <div className="cdoc__doc-menu">
                                    <button className="cdoc__doc-menu-item" onClick={() => { setPreview(d); setDocMenuId(null); }}>Preview</button>
                                    <button className="cdoc__doc-menu-item">Download</button>
                                    <button className="cdoc__doc-menu-item">Rename</button>
                                    <button className="cdoc__doc-menu-item">Move to…</button>
                                    <div className="cdoc__doc-menu-divider" />
                                    <button className="cdoc__doc-menu-item cdoc__doc-menu-item--danger">Delete</button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  <div className="cdoc__pagination">
                    <span className="cdoc__pg-info">Showing {Math.min((page - 1) * perPage + 1, sorted.length)} to {Math.min(page * perPage, sorted.length)} of {sorted.length} documents</span>
                    <div className="cdoc__pg-right">
                      <div className="cdoc__per-page-wrap">
                        <select className="cdoc__per-page" value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
                          <option value={10}>10 per page</option>
                          <option value={25}>25 per page</option>
                          <option value={50}>50 per page</option>
                        </select>
                      </div>
                      <div className="cdoc__pg-btns">
                        <button className="cdoc__pg-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <button key={p} className={`cdoc__pg-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                        ))}
                        <button className="cdoc__pg-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Grid view */
                <div className="docgrid">
                  {sorted.map((d) => {
                    const name = d.name || d.title || 'Untitled';
                    const isSelected = docSelected.includes(d.id);
                    return (
                      <div key={d.id} className={`doccard${isSelected ? ' doccard--sel' : ''}`}>
                        <div className="doccard__top">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleDocSelect(d.id)} />
                        </div>
                        <div className="doccard__icon"><FileTypeIcon name={name} /></div>
                        <div className="doccard__name" title={name}>{name}</div>
                        <div className="doccard__meta">
                          <ExtBadge name={name} />
                          <span>{bytes(d.size)}</span>
                        </div>
                        <div className="doccard__actions">
                          <button className="cdoc__action-btn" title="Preview" onClick={() => setPreview(d)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          </button>
                          <button className="cdoc__action-btn" title="Download">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}

          {/* Empty state for folder with no docs and no sub-folders */}
          {activeFolder && getChildren(activeFolder).length === 0 && sorted.length === 0 && !loading && (
            <div className="empty">
              <div className="empty__icon"><Icon name="folder" size={24} /></div>
              <p className="muted">This folder is empty.</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <Button size="sm" variant="primary" onClick={() => fileInputRef.current?.click()}>Upload a document</Button>
                <Button size="sm" variant="ghost" icon="plus" onClick={() => { setCreating(true); setBulkAdding(false); setNewName(''); }}>Add sub-folder</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (() => {
        const f = folders.find((x) => x.id === ctxMenu.id);
        if (!f) return null;
        return (
          <div className="cdoc__ctx-menu" style={{ position: 'fixed', left: ctxMenu.x, top: ctxMenu.y }}>
            <button className="cdoc__ctx-item" onClick={(e) => { e.stopPropagation(); startRename(f); setCtxMenu(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              Rename
            </button>
            <button className="cdoc__ctx-item" onClick={(e) => { e.stopPropagation(); cutFolder(f); setCtxMenu(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>
              Cut
            </button>
            <button className="cdoc__ctx-item" onClick={(e) => { e.stopPropagation(); copyFolder(f); setCtxMenu(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              Copy
            </button>
            <div className="cdoc__ctx-divider" />
            <button className="cdoc__ctx-item" onClick={(e) => { e.stopPropagation(); setFolderProps(f); setCtxMenu(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
              Properties
            </button>
            <button className="cdoc__ctx-item cdoc__ctx-item--danger" onClick={(e) => { e.stopPropagation(); deleteFolder(f); setCtxMenu(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              Delete
            </button>
          </div>
        );
      })()}

      {/* Preview modal */}
      {preview && (
        <div className="modal-overlay" onClick={() => setPreview(null)}>
          <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <span className="modal__title">{preview.name || 'Document Preview'}</span>
              <button className="modal__close" onClick={() => setPreview(null)}><Icon name="close" size={18} /></button>
            </div>
            <div className="modal__body" style={{ whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.7 }}>
              {preview.text || preview.content || 'No preview available.'}
            </div>
          </div>
        </div>
      )}

      {/* Folder properties modal */}
      {folderProps && (
        <div className="modal-overlay" onClick={() => setFolderProps(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal__head">
              <span className="modal__title">
                <Icon name="folder" size={16} /> {folderProps.name}
              </span>
              <button className="modal__close" onClick={() => setFolderProps(null)}><Icon name="close" size={18} /></button>
            </div>
            <div className="modal__body" style={{ fontSize: 13, lineHeight: 2 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px 12px' }}>
                <span style={{ color: 'var(--text-faint)' }}>Name</span>
                <span style={{ fontWeight: 600 }}>{folderProps.name}</span>
                <span style={{ color: 'var(--text-faint)' }}>Kind</span>
                <span>{folderProps.kind || 'document'}</span>
                <span style={{ color: 'var(--text-faint)' }}>Sub-folders</span>
                <span>{getChildren(folderProps.id).length}</span>
                <span style={{ color: 'var(--text-faint)' }}>Documents</span>
                <span>{docCounts[folderProps.name] || 0}</span>
                <span style={{ color: 'var(--text-faint)' }}>Created</span>
                <span>{folderProps.created_at ? formatDate(folderProps.created_at) : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}