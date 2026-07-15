import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import { Input } from '@/components/Field.jsx';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { caseFoldersRepository } from '@/data-layer/repositories/caseFoldersRepository.js';
import storageService from '@/services/storageService.js';
import { fileLogic } from '@/logic/fileLogic.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { bytes, useFormat } from '@/utils/format.js';
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
    <span className="cdoc__type-icon" style={{ '--ti-bg': cfg.bg, '--ti-color': cfg.color }}>
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
        <Icon name={icon} size={20} />
      </div>
      <div className="cdoc__stat-val">{value}</div>
      <div className="cdoc__stat-label">{label}</div>
      {sub && <div className="cdoc__stat-sub">{sub}</div>}
    </div>
  );
}

/* ── main ── */
export default function CaseDocuments() {
  const { formatDate } = useFormat();
  const toast = useToast();
  const { user } = useAuth();
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
  const [contentCtx, setContentCtx] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [folderProps, setFolderProps] = useState(null);
  const fileInputRef = useRef(null);

  // close context menus on click outside
  useEffect(() => {
    if (!ctxMenu && !contentCtx) return;
    const handler = () => { setCtxMenu(null); setContentCtx(null); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [ctxMenu, contentCtx]);

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
    docs.forEach((d) => { const key = d.folder_id || d.folder; m[key] = (m[key] || 0) + 1; });
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
    : docs.filter((d) => (d.folder_id || d.folder) === (activeFolder || getFolderName(activeFolder)));

  const sorted = useMemo(() => {
    let arr = [...visible];
    if (search) arr = arr.filter((d) => (d.name || d.title || '').toLowerCase().includes(search.toLowerCase()));
    if (fileExtFilter.length > 0) arr = arr.filter((d) => fileExtFilter.includes(fileExt(d.name || '')));
    if (sortBy === 'name-az') arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (sortBy === 'name-za') arr.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    if (sortBy === 'date-new') arr.sort((a, b) => new Date(b.uploadedAt || b.uploaded_at || 0) - new Date(a.uploadedAt || a.uploaded_at || 0));
    if (sortBy === 'date-old') arr.sort((a, b) => new Date(a.uploadedAt || a.uploaded_at || 0) - new Date(b.uploadedAt || b.uploaded_at || 0));
    if (sortBy === 'size') arr.sort((a, b) => (b.size || 0) - (a.size || 0));
    return arr;
  }, [visible, search, fileExtFilter, sortBy]);

  const isFileView = activeFolder && getChildren(activeFolder).length === 0;

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
    if (!confirm(`Delete "${f.name}" and all of its files?`)) return;
    try {
      await fileLogic.deleteFolder(f, {}, user);
      toast.push('Folder deleted.', 'success');
      if (activeFolder === f.id || getAllDescendantIds(f.id).includes(activeFolder)) setActiveFolder(null);
      await load();
    } catch (e) {
      toast.push(e?.message || 'Failed to delete folder.', 'error');
    }
  };

  const bulkDeleteFolders = async () => {
    if (!folderSelected.size) return;
    if (!confirm(`Delete ${folderSelected.size} folder(s) and all of their files?`)) return;
    for (const id of folderSelected) {
      const f = folders.find((x) => x.id === id);
      if (f) try { await fileLogic.deleteFolder(f, {}, user); } catch {}
    }
    toast.push(`Deleted ${folderSelected.size} folder(s).`, 'success');
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
      await storageService.uploadDocument(file, { folder, folderId: activeFolder });
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
    const count = docCounts[f.id] || docCounts[f.name] || 0;

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
            <Icon name="folder" size={22} />
          </div>
          <div>
            <h1 className="cdoc__title">Case Documents</h1>
            <p className="cdoc__subtitle">Organize and manage all documents related to this case.</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" hidden onChange={handleUpload} accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.txt" />
        <div className="flex-row gap-8">
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
        <StatCard icon="folder" value={folders.length} label="Folders" />
        <StatCard icon="file" value={docs.length} label="Documents" />
        <StatCard icon="database" value={bytes(totalSize)} label="Total Size" />
        <StatCard icon="calendar" value={lastUpdated ? formatDate(lastUpdated) : '—'} label="Last Updated" />
      </div>

      {/* Main layout: folder panel + content */}
      <div className="cdoc__layout">

        {/* Left: Folder tree panel */}
        <aside className="cdoc__sidebar">
          <div className="cdoc__sidebar-head">
            <span className="cdoc__sidebar-title">FOLDERS</span>
            <div className="flex-row gap-4">
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
              <span className="muted"><Icon name={clipboard.type === 'cut' ? 'scissors' : 'copy'} size={13} /> {clipboard.type === 'cut' ? 'Move' : 'Copy'}: <strong>{clipboard.folder.name}</strong></span>
              <button className="iconbtn" onClick={cancelClipboard}><Icon name="close" size={13} /></button>
            </div>
          )}

          {/* Folder search */}
          <div className="cdoc__sidebar-search">
            <Icon name="search" size={13} />
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

          {clipboard && <button className="docmgr__paste-btn cdoc__paste-root" onClick={() => pasteHere(null)}><Icon name="cornerDownRight" size={13} /> Paste to root</button>}

          {renderTree(filteredRootFolders)}

        </aside>

        {/* Right: Content panel */}
        <div className="cdoc__content" onContextMenu={(e) => { e.preventDefault(); setContentCtx({ x: e.clientX, y: e.clientY }); }}>

          {/* Content toolbar */}
          <div className="cdoc__toolbar">
            {/* Breadcrumb */}
            <div className="cdoc__breadcrumb">
              <button
                className={`cdoc__bc-btn${!activeFolder ? ' active' : ''}`}
                onClick={() => { setActiveFolder(null); setDocSelected([]); }}
              >
                <Icon name="layers" size={14} />
                All Documents
              </button>
              {breadcrumbPath.map((f) => (
                <React.Fragment key={f.id}>
                  <span className="cdoc__bc-sep">
                    <Icon name="chevron" size={12} />
                  </span>
                  <span className="cdoc__bc-sep">
                    <Icon name="folder" size={13} />
                  </span>
                  <button className="cdoc__bc-btn" onClick={() => { setActiveFolder(f.id); setDocSelected([]); }}>{f.name}</button>
                </React.Fragment>
              ))}
            </div>

            <div className="cdoc__toolbar-right">
              {/* View toggle */}
              <div className="cdoc__seg">
                <button className={`cdoc__seg-btn${viewMode === 'grid' ? ' active' : ''}`} title="Grid view" onClick={() => setViewMode('grid')}>
                  <Icon name="grid" size={15} />
                </button>
                <button className={`cdoc__seg-btn${viewMode === 'list' ? ' active' : ''}`} title="List view" onClick={() => setViewMode('list')}>
                  <Icon name="list" size={15} />
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
                <Icon name="chevronDown" size={12} />
              </div>

              {/* Filters */}
              <div className="cdoc__filter-wrap">
                <button className={`cdoc__filter-btn${fileExtFilter.length > 0 ? ' cdoc__filter-btn--active' : ''}`} onClick={() => setShowFilter((s) => !s)}>
                  <Icon name="filter" size={14} />
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
          </div>

          {/* Folder search + grid when viewing root or a folder that has children */}
          {(!activeFolder || getChildren(activeFolder).length > 0) && (
            <>
              <div className="cdoc__content-search">
                <Icon name="search" size={14} />
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
                    <div className="cdoc__folder-card-icon pos-relative">
                      {selectMode && (
                        <input
                          type="checkbox"
                          className="cdoc__folder-card-checkbox"
                          checked={folderSelected.has(f.id)}
                          onChange={() => toggleFolderSelect(f.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <Icon name="folder" size={32} strokeWidth={1.5} />
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
                      <Icon name="more-vertical" size={14} />
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
                                <Icon name="eye" size={15} />
                              </button>
                              <button className="cdoc__action-btn" title="Download" onClick={async () => { const url = await fileLogic.getUrl(d.ref).catch(() => null); if (url) window.open(url, '_blank'); }}>
                                <Icon name="download" size={15} />
                              </button>
                              <div className="cdoc__action-more-wrap" onClick={(e) => e.stopPropagation()}>
                                <button className="cdoc__action-btn" title="More" onClick={() => setDocMenuId(docMenuId === d.id ? null : d.id)}>
                                  <Icon name="more-vertical" size={15} />
                                </button>
                                {docMenuId === d.id && (
                                  <div className="cdoc__doc-menu">
                                    <button className="cdoc__doc-menu-item" onClick={() => { setPreview(d); setDocMenuId(null); }}>Preview</button>
                                    <button className="cdoc__doc-menu-item" onClick={async () => { const url = await fileLogic.getUrl(d.ref).catch(() => null); if (url) { window.open(url, '_blank'); setDocMenuId(null); } }}>Download</button>
                                    <button className="cdoc__doc-menu-item" onClick={async () => { const n = prompt('Rename document:', d.name); if (n && n.trim()) { await fileLogic.renameDocument(d.id, n.trim()); setDocMenuId(null); await load(); } }}>Rename</button>
                                    <button className="cdoc__doc-menu-item" onClick={async () => { const n = prompt('Move to folder:'); if (n && n.trim()) { await fileLogic.moveDocument(d, n.trim(), null, user); setDocMenuId(null); await load(); } }}>Move to…</button>
                                    <div className="cdoc__doc-menu-divider" />
                                    <button className="cdoc__doc-menu-item cdoc__doc-menu-item--danger" onClick={async () => { if (confirm(`Delete "${d.name}"?`)) { await fileLogic.deleteDocument(d, user); setDocMenuId(null); await load(); } }}>Delete</button>
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
                          <Icon name="chevronLeft" size={14} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <button key={p} className={`cdoc__pg-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                        ))}
                        <button className="cdoc__pg-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                          <Icon name="chevron" size={14} />
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
                            <Icon name="eye" size={14} />
                          </button>
                          <button className="cdoc__action-btn" title="Download" onClick={async () => { const url = await fileLogic.getUrl(d.ref).catch(() => null); if (url) window.open(url, '_blank'); }}>
                            <Icon name="download" size={14} />
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
              <div className="flex-row gap-8 mt-4">
                <Button size="sm" variant="primary" onClick={() => fileInputRef.current?.click()}>Upload a document</Button>
                <Button size="sm" variant="ghost" icon="plus" onClick={() => { setCreating(true); setBulkAdding(false); setNewName(''); }}>Add sub-folder</Button>
              </div>
            </div>
          )}

          {/* Inline folder creation */}
          {creating && (
            <div className="cdoc__create-folder">
              {!bulkAdding ? (
                <div className="flex-row gap-6">
                  <Input autoFocus value={newName} placeholder="Folder name..." onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') { setCreating(false); setBulkAdding(false); } }} />
                  <button className="iconbtn" title="Confirm" onClick={createFolder}><Icon name="check" size={14} /></button>
                  <button className="iconbtn" title="Cancel" onClick={() => { setCreating(false); setBulkAdding(false); }}><Icon name="close" size={14} /></button>
                </div>
              ) : (
                <div className="flex-col gap-6">
                  <textarea className="input docmgr__bulk-textarea" autoFocus value={bulkNames} placeholder="Enter folder names, one per line..." onChange={(e) => setBulkNames(e.target.value)} rows={4} />
                  <div className="flex-row gap-6">
                    <Button size="sm" icon="plus" onClick={bulkAddFolders}>Create All</Button>
                    <Button size="sm" variant="ghost" onClick={() => setBulkAdding(false)}>Single</Button>
                    <div className="flex-1" />
                    <button className="iconbtn" title="Cancel" onClick={() => { setCreating(false); setBulkAdding(false); }}><Icon name="close" size={14} /></button>
                  </div>
                </div>
              )}
              {!bulkAdding && <button className="docmgr__bulk-toggle" onClick={() => { setBulkAdding(true); setNewName(''); }}>+ Add multiple folders</button>}
            </div>
          )}
        </div>
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (() => {
        const f = folders.find((x) => x.id === ctxMenu.id);
        if (!f) return null;
        return (
          <div className="cdoc__ctx-menu cdoc__ctx-menu--fixed" style={{ '--menu-x': `${ctxMenu.x}px`, '--menu-y': `${ctxMenu.y}px` }}>
            <button className="cdoc__ctx-item" onClick={(e) => { e.stopPropagation(); startRename(f); setCtxMenu(null); }}>
              <Icon name="edit" size={14} />
              Rename
            </button>
            <button className="cdoc__ctx-item" onClick={(e) => { e.stopPropagation(); cutFolder(f); setCtxMenu(null); }}>
              <Icon name="scissors" size={14} />
              Cut
            </button>
            <button className="cdoc__ctx-item" onClick={(e) => { e.stopPropagation(); copyFolder(f); setCtxMenu(null); }}>
              <Icon name="copy" size={14} />
              Copy
            </button>
            <div className="cdoc__ctx-divider" />
            <button className="cdoc__ctx-item" onClick={(e) => { e.stopPropagation(); setFolderProps(f); setCtxMenu(null); }}>
              <Icon name="info" size={14} />
              Properties
            </button>
            <button className="cdoc__ctx-item cdoc__ctx-item--danger" onClick={(e) => { e.stopPropagation(); deleteFolder(f); setCtxMenu(null); }}>
              <Icon name="trash" size={14} />
              Delete
            </button>
          </div>
        );
      })()}

      {/* Content-panel right-click context menu */}
      {contentCtx && (
        <div className="cdoc__ctx-menu cdoc__ctx-menu--fixed" style={{ '--menu-x': `${contentCtx.x}px`, '--menu-y': `${contentCtx.y}px` }}>
          <button className="cdoc__ctx-item" onClick={(e) => { e.stopPropagation(); setCreating(true); setBulkAdding(false); setNewName(''); setContentCtx(null); }}>
            <Icon name="plus" size={14} />
            Add new folder
          </button>
          <div className="cdoc__ctx-divider" />
          <button className="cdoc__ctx-item cdoc__ctx-item--disabled" disabled onClick={(e) => { e.stopPropagation(); }}>
            <Icon name="redo" size={14} />
            Redo
          </button>
          <button className="cdoc__ctx-item cdoc__ctx-item--disabled" disabled onClick={(e) => { e.stopPropagation(); }}>
            <Icon name="undo" size={14} />
            Undo
          </button>
          <div className="cdoc__ctx-divider" />
          <button className="cdoc__ctx-item cdoc__ctx-item--disabled" disabled onClick={(e) => { e.stopPropagation(); }}>
            <Icon name="trash" size={14} />
            Delete
          </button>
          <button className="cdoc__ctx-item cdoc__ctx-item--disabled" disabled onClick={(e) => { e.stopPropagation(); }}>
            <Icon name="scissors" size={14} />
            Cut
          </button>
          <button className="cdoc__ctx-item cdoc__ctx-item--disabled" disabled onClick={(e) => { e.stopPropagation(); }}>
            <Icon name="move" size={14} />
            Move
          </button>
          <div className="cdoc__ctx-divider" />
          <button className="cdoc__ctx-item" onClick={(e) => { e.stopPropagation(); setContentCtx(null); if (activeFolder) { const f = folders.find((x) => x.id === activeFolder); if (f) setFolderProps(f); } }}>
            <Icon name="info" size={14} />
            Properties
          </button>
          <div className="cdoc__ctx-divider" />
          <button className={`cdoc__ctx-item${viewMode === 'grid' ? ' cdoc__ctx-item--active' : ''}`} onClick={(e) => { e.stopPropagation(); setViewMode('grid'); setContentCtx(null); }}>
            <Icon name="grid" size={14} />
            View: Grid
          </button>
          <button className={`cdoc__ctx-item${viewMode === 'list' ? ' cdoc__ctx-item--active' : ''}`} onClick={(e) => { e.stopPropagation(); setViewMode('list'); setContentCtx(null); }}>
            <Icon name="list" size={14} />
            View: List
          </button>
          <div className="cdoc__ctx-divider" />
          <div className="cdoc__ctx-label">Sort by</div>
          <button className={`cdoc__ctx-item${sortBy === 'name-az' ? ' cdoc__ctx-item--active' : ''}`} onClick={(e) => { e.stopPropagation(); setSortBy('name-az'); setContentCtx(null); }}>Name (A–Z)</button>
          <button className={`cdoc__ctx-item${sortBy === 'name-za' ? ' cdoc__ctx-item--active' : ''}`} onClick={(e) => { e.stopPropagation(); setSortBy('name-za'); setContentCtx(null); }}>Name (Z–A)</button>
          <button className={`cdoc__ctx-item${sortBy === 'date-new' ? ' cdoc__ctx-item--active' : ''}`} onClick={(e) => { e.stopPropagation(); setSortBy('date-new'); setContentCtx(null); }}>Date (Newest)</button>
          <button className={`cdoc__ctx-item${sortBy === 'date-old' ? ' cdoc__ctx-item--active' : ''}`} onClick={(e) => { e.stopPropagation(); setSortBy('date-old'); setContentCtx(null); }}>Date (Oldest)</button>
          <button className={`cdoc__ctx-item${sortBy === 'size' ? ' cdoc__ctx-item--active' : ''}`} onClick={(e) => { e.stopPropagation(); setSortBy('size'); setContentCtx(null); }}>Size</button>
          <div className="cdoc__ctx-divider" />
          <button className="cdoc__ctx-item cdoc__ctx-item--disabled" disabled onClick={(e) => { e.stopPropagation(); }}>
            <Icon name="folder" size={14} />
            Group by
          </button>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="modal-overlay" onClick={() => setPreview(null)}>
          <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <span className="modal__title">{preview.name || 'Document Preview'}</span>
              <button className="modal__close" onClick={() => setPreview(null)}><Icon name="close" size={18} /></button>
            </div>
            <div className="modal__body cdoc__preview-body">
              {preview.text || preview.content || 'No preview available.'}
            </div>
          </div>
        </div>
      )}

      {/* Folder properties modal */}
      {folderProps && (
        <div className="modal-overlay" onClick={() => setFolderProps(null)}>
          <div className="modal cdoc__props-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <span className="modal__title">
                <Icon name="folder" size={16} /> {folderProps.name}
              </span>
              <button className="modal__close" onClick={() => setFolderProps(null)}><Icon name="close" size={18} /></button>
            </div>
            <div className="modal__body cdoc__props-body">
              <div className="cdoc__props-grid">
                <span className="text-faint">Name</span>
                <span className="font-medium">{folderProps.name}</span>
                <span className="text-faint">Kind</span>
                <span>{folderProps.kind || 'document'}</span>
                <span className="text-faint">Sub-folders</span>
                <span>{getChildren(folderProps.id).length}</span>
                <span className="text-faint">Documents</span>
                <span>{docCounts[folderProps.name] || 0}</span>
                <span className="text-faint">Created</span>
                <span>{folderProps.created_at ? formatDate(folderProps.created_at) : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}