import Icon from './Icon.jsx';
import Button from './Button.jsx';
import { Input } from './Field.jsx';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { caseFoldersRepository } from '@/data-layer/repositories/caseFoldersRepository.js';
import storageService from '@/services/storageService.js';
import { formatDate, bytes } from '@/utils/format.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

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

export default function CaseDocTab({ caseId, caseNumber, onChanged, caseObj }) {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showMissingWarning, setShowMissingWarning] = useState(false);
  const [creatingStructure, setCreatingStructure] = useState(false);

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [activeFolder, setActiveFolder] = useState(null);
  const [expanded, setExpanded] = useState({});
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
  const perPage = 10;
  const [docMenuId, setDocMenuId] = useState(null);
  const [folderSearch, setFolderSearch] = useState('');
  const [fileExtFilter, setFileExtFilter] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [contentCtx, setContentCtx] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [folderProps, setFolderProps] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!ctxMenu && !contentCtx) return;
    const handler = () => { setCtxMenu(null); setContentCtx(null); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [ctxMenu, contentCtx]);

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
    const caseFolders = (Array.isArray(f) ? f : []).filter((x) => x.caseId === caseId || x.case_id === caseId);
    setShowMissingWarning(caseFolders.length === 0);
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!docMenuId) return;
    const handler = () => setDocMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [docMenuId]);

  const caseFolders = useMemo(() =>
    folders.filter((f) => f.caseId === caseId || f.case_id === caseId),
    [folders, caseId]
  );

  const rootFolder = useMemo(() =>
    caseFolders.find((f) => !f.parent_id && !f.parentId) || null,
    [caseFolders]
  );

  const rootFolders = useMemo(() =>
    rootFolder ? [rootFolder] : caseFolders.filter((f) => !f.parent_id && !f.parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [rootFolder, caseFolders]
  );

  const getChildren = useCallback((parentId) =>
    caseFolders.filter((f) => f.parent_id === parentId || f.parentId === parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [caseFolders]
  );

  const docCounts = useMemo(() => {
    const m = {};
    docs.forEach((d) => { m[d.folder] = (m[d.folder] || 0) + 1; });
    return m;
  }, [docs]);

  const getFolderName = useCallback((id) => {
    const f = caseFolders.find((x) => x.id === id);
    return f ? f.name : null;
  }, [caseFolders]);

  const getAllDescendantIds = useCallback((parentId) => {
    const ids = [];
    const walk = (pid) => {
      const children = caseFolders.filter((f) => f.parent_id === pid || f.parentId === pid);
      for (const c of children) { ids.push(c.id); walk(c.id); }
    };
    walk(parentId);
    return ids;
  }, [caseFolders]);

  const breadcrumbPath = useMemo(() => {
    if (!activeFolder) return [];
    const path = [];
    let current = caseFolders.find((f) => f.id === activeFolder);
    while (current) {
      path.unshift(current);
      current = current.parent_id || current.parentId ? caseFolders.find((f) => f.id === (current.parent_id || current.parentId)) : null;
    }
    return path;
  }, [activeFolder, caseFolders]);

  function folderMatches(f, term) {
    if (!term) return true;
    const t = term.toLowerCase();
    if (f.name.toLowerCase().includes(t)) return true;
    return caseFolders.some((c) => (c.parent_id === f.id || c.parentId === f.id) && folderMatches(c, t));
  }

  const filteredRootFolders = useMemo(() => {
    if (!folderSearch) return rootFolders;
    return rootFolders.filter((f) => folderMatches(f, folderSearch));
  }, [folderSearch, rootFolders, caseFolders]);

  const visible = !activeFolder
    ? docs.filter((d) => caseFolders.some((f) => f.name === d.folder))
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

  const isFileView = activeFolder && getChildren(activeFolder).length === 0;

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [search, activeFolder, sortBy]);

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const createFolder = async () => {
    const name = newName.trim();
    if (!name) { toast.push('Folder name is required.', 'error'); return; }
    const order = caseFolders.reduce((m, f) => Math.max(m, f.order ?? 0), 0) + 1;
    const res = await caseFoldersRepository.create({ caseId, name, kind: 'document', parent_id: activeFolder || null, order, system: false, created_at: new Date().toISOString() }).catch((e) => { toast.push(e?.message || 'Failed to create folder.', 'error'); return null; });
    if (res) { toast.push('Folder created.', 'success'); setNewName(''); setCreating(false); await load(); if (activeFolder) setExpanded((p) => ({ ...p, [activeFolder]: true })); }
  };

  const bulkAddFolders = async () => {
    const names = bulkNames.split('\n').map((n) => n.trim()).filter(Boolean);
    if (!names.length) { toast.push('Enter at least one folder name.', 'error'); return; }
    const order = caseFolders.reduce((m, f) => Math.max(m, f.order ?? 0), 0) + 1;
    let created = 0;
    for (let i = 0; i < names.length; i++) {
      const res = await caseFoldersRepository.create({ caseId, name: names[i], kind: 'document', parent_id: activeFolder || null, order: order + i, system: false, created_at: new Date().toISOString() }).catch(() => null);
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
        const source = caseFolders.find((f) => f.id === sourceId);
        if (!source) return;
        const children = getChildren(sourceId);
        const newFolder = await caseFoldersRepository.create({ caseId, name: source.name, kind: source.kind, parent_id: newParentId || null, order: source.order ?? 0, system: false, created_at: new Date().toISOString() }).catch(() => null);
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
      await storageService.uploadDocument(file, { caseId, folder });
      toast.push('Document uploaded.', 'success');
      await load();
    } catch (err) {
      toast.push(err?.message || 'Upload failed.', 'error');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteDocument = async (d) => {
    if (!confirm(`Delete "${d.name}"?`)) return;
    await storageService.deleteDocument(d.id, d.ref).catch(() => { });
    await load();
    toast.push('Document deleted.', 'success');
  };

  const handleCreateStructure = async () => {
    setCreatingStructure(true);
    try {
      const folderName = caseObj && caseObj.case_type && caseObj.case_number != null && caseObj.case_year
        ? `${caseObj.case_type} ${caseObj.case_number}/${caseObj.case_year}`
        : caseNumber || 'Miscellaneous';
      const existing = await caseFoldersRepository.getAll().catch(() => []);
      const hasFolder = Array.isArray(existing) && existing.some((f) => (f.caseId === caseId || f.case_id === caseId));
      if (!hasFolder) {
        await caseFoldersRepository.create({ caseId, name: folderName, kind: 'document', order: 0, system: true, created_at: new Date().toISOString() });
      }
      toast.push('Folder created.', 'success');
      await load();
    } catch (err) {
      toast.push(err?.message || 'Failed to create folder.', 'error');
    }
    setCreatingStructure(false);
  };

  if (loading) return <div className="loading-block"><span className="spinner" /> Loading documents…</div>;

  if (showMissingWarning && rootFolders.length === 0) {
    return (
      <div className="empty" style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ marginBottom: 16 }}><Icon name="folder" size={48} style={{ color: 'var(--text-faint)' }} /></div>
        <h3 style={{ margin: '0 0 8px', color: 'var(--navy-900)' }}>No document folder has been created for this case.</h3>
        <p style={{ color: 'var(--text-soft)', margin: '0 0 24px', fontSize: 14, lineHeight: 1.5 }}>
          Create the case document folder and default subfolders to start managing documents.
        </p>
        <Button icon="plus" loading={creatingStructure} onClick={handleCreateStructure}>Create Folder Structure</Button>
      </div>
    );
  }

  return (
    <div className="cdoc__layout">
      {ctxMenu && (
        <div className="cdoc__ctx-menu" style={{ position: 'fixed', left: ctxMenu.x, top: ctxMenu.y }} onClick={(e) => e.stopPropagation()}>
          <div className="cdoc__ctx-item" onClick={() => { startRename(caseFolders.find((f) => f.id === ctxMenu.id)); setCtxMenu(null); }}>Rename</div>
          <div className="cdoc__ctx-item" onClick={() => { cutFolder(caseFolders.find((f) => f.id === ctxMenu.id)); setCtxMenu(null); }}>Cut</div>
          <div className="cdoc__ctx-item" onClick={() => { copyFolder(caseFolders.find((f) => f.id === ctxMenu.id)); setCtxMenu(null); }}>Copy</div>
          <div className="cdoc__ctx-divider" />
          <div className="cdoc__ctx-item" onClick={() => { const f = caseFolders.find((x) => x.id === ctxMenu.id); setFolderProps(f); setCtxMenu(null); }}>Properties</div>
          <div className="cdoc__ctx-item cdoc__ctx-item--danger" onClick={() => { deleteFolder(caseFolders.find((f) => f.id === ctxMenu.id)); setCtxMenu(null); }}>Delete</div>
        </div>
      )}
      {contentCtx && (
        <div className="cdoc__ctx-menu" style={{ position: 'fixed', left: contentCtx.x, top: contentCtx.y }} onClick={(e) => e.stopPropagation()}>
          <div className="cdoc__ctx-item" onClick={() => { setCreating(true); setContentCtx(null); }}>Add new folder</div>
          <div className="cdoc__ctx-divider" />
          <div className="cdoc__ctx-item cdoc__ctx-item--disabled">Redo</div>
          <div className="cdoc__ctx-item cdoc__ctx-item--disabled">Undo</div>
          <div className="cdoc__ctx-divider" />
          <div className="cdoc__ctx-item cdoc__ctx-item--disabled">Delete</div>
          <div className="cdoc__ctx-item cdoc__ctx-item--disabled">Cut</div>
          <div className="cdoc__ctx-item cdoc__ctx-item--disabled">Move</div>
          <div className="cdoc__ctx-item" onClick={() => { const f = caseFolders.find((x) => x.id === activeFolder); if (f) setFolderProps(f); setContentCtx(null); }}>Properties</div>
          <div className="cdoc__ctx-divider" />
          <div className="cdoc__ctx-item" onClick={() => { setViewMode('grid'); setContentCtx(null); }}>View: Grid</div>
          <div className="cdoc__ctx-item" onClick={() => { setViewMode('list'); setContentCtx(null); }}>View: List</div>
          <div className="cdoc__ctx-divider" />
          <div className="cdoc__ctx-item" onClick={() => { setSortBy('name-az'); setContentCtx(null); }}>Sort by Name A–Z</div>
          <div className="cdoc__ctx-item" onClick={() => { setSortBy('name-za'); setContentCtx(null); }}>Sort by Name Z–A</div>
          <div className="cdoc__ctx-item" onClick={() => { setSortBy('date-new'); setContentCtx(null); }}>Sort by Date (newest)</div>
          <div className="cdoc__ctx-item" onClick={() => { setSortBy('date-old'); setContentCtx(null); }}>Sort by Date (oldest)</div>
          <div className="cdoc__ctx-item" onClick={() => { setSortBy('size'); setContentCtx(null); }}>Sort by Size</div>
        </div>
      )}

      <aside className="cdoc__sidebar">
        <div className="cdoc__sidebar-head">
          <span className="cdoc__sidebar-title">FOLDERS</span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button className="cdoc__sidebar-btn" title="Expand all" onClick={() => { const all = {}; const walk = (list) => { list.forEach((f) => { all[f.id] = true; walk(getChildren(f.id)); }); }; walk(rootFolders); setExpanded(all); }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg></button>
            <button className="cdoc__sidebar-btn" title="Collapse all" onClick={() => setExpanded({})}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg></button>
          </div>
        </div>

        <div className="cdoc__sidebar-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-faint)', flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="text" placeholder="Search folders…" value={folderSearch} onChange={(e) => setFolderSearch(e.target.value)} style={{ border: 'none', background: 'none', outline: 'none', flex: 1, fontSize: 12 }} />
        </div>

        <div className="cdoc__tree">
          {filteredRootFolders.length === 0 ? (
            <div className="empty" style={{ padding: 16 }}><p className="muted" style={{ fontSize: 12 }}>No folders</p></div>
          ) : (function renderTree(list, depth = 0) {
            return list.map((f, i) => {
              const isLast = i === list.length - 1;
              const children = getChildren(f.id);
              const open = expanded[f.id];
              const isCut = clipboard?.type === 'cut' && clipboard.folderId === f.id;
              return (
                <div key={f.id}>
                  <div
                    className={`cdoc__tree-row${activeFolder === f.id ? ' cdoc__tree-row--active' : ''}${isCut ? ' cdoc__tree-row--cut' : ''}`}
                    style={{ paddingLeft: 12 + depth * 16 }}
                    onClick={() => { if (!selectMode) { setActiveFolder(f.id); setDocSelected([]); } }}
                    onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ id: f.id, x: e.clientX, y: e.clientY }); }}
                    onMouseEnter={() => setHoveredId(f.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {children.length > 0 && (
                      <span className="cdoc__tree-expand" onClick={(e) => { e.stopPropagation(); toggleExpand(f.id); }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                          <polygon points="6 3 20 12 6 21 6 3" />
                        </svg>
                      </span>
                    )}
                    {children.length === 0 && <span className="cdoc__tree-spacer" />}
                    {selectMode && <input type="checkbox" checked={folderSelected.has(f.id)} onChange={() => toggleFolderSelect(f.id)} onClick={(e) => e.stopPropagation()} style={{ marginRight: 4 }} />}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="cdoc__tree-icon">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    {editingId === f.id ? (
                      <input className="cdoc__rename-input" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') cancelRename(); }} onBlur={saveRename} autoFocus onClick={(e) => e.stopPropagation()} style={{ flex: 1, fontSize: 12, padding: '1px 4px' }} />
                    ) : (
                      <span className="cdoc__tree-name" style={{ fontWeight: activeFolder === f.id ? 700 : 450, opacity: isCut ? 0.4 : 1 }}>{f.name}</span>
                    )}
                    <span className="cdoc__tree-count">{docCounts[f.name] || 0}</span>
                    {hoveredId === f.id && editingId !== f.id && !selectMode && (
                      <span className="cdoc__tree-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="cdoc__tree-act" title="Rename" onClick={() => startRename(f)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                        <button className="cdoc__tree-act" title="Cut" onClick={() => cutFolder(f)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg></button>
                        <button className="cdoc__tree-act" title="Copy" onClick={() => copyFolder(f)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg></button>
                        <button className="cdoc__tree-act cdoc__tree-act--danger" title="Delete" onClick={() => deleteFolder(f)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>
                      </span>
                    )}
                    {clipboard && clipboard.folderId !== f.id && hoveredId !== f.id && (
                      <button className="cdoc__tree-paste" title="Paste here" onClick={(e) => { e.stopPropagation(); pasteHere(f.id); }}>Paste</button>
                    )}
                  </div>
                  {open && children.length > 0 && renderTree(children, depth + 1)}
                </div>
              );
            });
          })(filteredRootFolders, 0)}
        </div>

        {clipboard && (
          <div className="cdoc__clipboard-bar">
            <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
              {clipboard.type === 'cut' ? 'Move:' : 'Copy:'} {clipboard.folder.name}
            </span>
            <button className="cdoc__clipboard-close" onClick={cancelClipboard}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
          </div>
        )}

        <div className="cdoc__sidebar-actions">
          <button className="cdoc__sidebar-btn" onClick={() => { setCreating(!creating); setBulkAdding(false); }} style={{ width: '100%', justifyContent: 'flex-start', gap: 6, padding: '6px 10px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Folder
          </button>
          <button className="cdoc__sidebar-btn" onClick={() => setSelectMode(!selectMode)} style={{ width: '100%', justifyContent: 'flex-start', gap: 6, padding: '6px 10px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            {selectMode ? 'Done' : 'Select'}
          </button>
        </div>

        {creating && (
          <div className="cdoc__create-panel" style={{ padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Folder name…" onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); }} style={{ fontSize: 12, marginBottom: 6 }} autoFocus />
            <div style={{ display: 'flex', gap: 4 }}>
              <Button size="sm" onClick={createFolder}>Create</Button>
              <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setNewName(''); }}>Cancel</Button>
            </div>
            <div style={{ marginTop: 6 }}>
              <span className="cdoc__bulk-link" onClick={() => setBulkAdding(true)} style={{ fontSize: 11, color: 'var(--brand)', cursor: 'pointer' }}>Add multiple folders</span>
            </div>
            {bulkAdding && (
              <div style={{ marginTop: 6 }}>
                <textarea className="textarea" rows={3} value={bulkNames} onChange={(e) => setBulkNames(e.target.value)} placeholder="One folder per line" style={{ fontSize: 12, marginBottom: 4 }} />
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button size="sm" onClick={bulkAddFolders}>Create All</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setBulkAdding(false); setBulkNames(''); }}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {selectMode && folderSelected.size > 0 && (
          <div className="cdoc__bulk-bar" style={{ padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12 }}>{folderSelected.size} selected</span>
            <button className="cdoc__sidebar-btn" onClick={bulkDeleteFolders} style={{ color: 'var(--red)' }}>Delete selected</button>
          </div>
        )}
      </aside>

      <div className="cdoc__content" onContextMenu={(e) => { if (!e.target.closest('.cdoc__ctxmenu')) { e.preventDefault(); setContentCtx({ x: e.clientX, y: e.clientY }); } }}>
        {/* toolbar */}
        <div className="cdoc__toolbar">
          <div className="cdoc__breadcrumb">
            <button className={`cdoc__bc-btn${!activeFolder ? ' active' : ''}`} onClick={() => { setActiveFolder(null); setDocSelected([]); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.79 0l-8-4a2 2 0 0 1-1.1-1.8V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z" /></svg>
              {rootFolder?.name || 'Documents'}
            </button>
            {breadcrumbPath.map((f) => (
              <React.Fragment key={f.id}>
                <span className="cdoc__bc-sep"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg></span>
                <button className="cdoc__bc-btn" onClick={() => { setActiveFolder(f.id); setDocSelected([]); }}>{f.name}</button>
              </React.Fragment>
            ))}
          </div>

          <div className="cdoc__toolbar-actions">
            {isFileView && (
              <>
                <div className="cdoc__search-wrap">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-faint)', flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input type="text" placeholder="Search documents…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: 'none', background: 'none', outline: 'none', flex: 1, fontSize: 13 }} />
                </div>
                <div className="cdoc__filter-wrap">
                  <button className={`cdoc__toolbtn${fileExtFilter.length > 0 ? ' cdoc__toolbtn--active' : ''}`} onClick={() => setShowFilter(!showFilter)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                    Filters{fileExtFilter.length > 0 && ` (${fileExtFilter.length})`}
                  </button>
                  {showFilter && (
                    <div className="cdoc__filter-popup">
                      {['PDF', 'DOCX', 'DOC', 'XLSX', 'XLS'].map((ext) => (
                        <label key={ext} className="cdoc__filter-opt">
                          <input type="checkbox" checked={fileExtFilter.includes(ext)} onChange={() => toggleFileExt(ext)} />
                          <span>{ext}</span>
                        </label>
                      ))}
                      <div className="cdoc__filter-popup-actions">
                        <button className="cdoc__filter-clear" onClick={() => setFileExtFilter([])}>Clear</button>
                        <button className="cdoc__filter-apply" onClick={() => setShowFilter(false)}>Apply</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            <div className="cdoc__sort-wrap">
              <span className="cdoc__sort-label">Sort: {({ 'name-az': 'Name A–Z', 'name-za': 'Name Z–A', 'date-new': 'Date (newest)', 'date-old': 'Date (oldest)', size: 'Size' })[sortBy]}</span>
              <select className="cdoc__sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="name-az">Name A–Z</option>
                <option value="name-za">Name Z–A</option>
                <option value="date-new">Date (newest)</option>
                <option value="date-old">Date (oldest)</option>
                <option value="size">Size</option>
              </select>
            </div>
            <button className="cdoc__toolbtn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <button className="cdoc__toolbtn" onClick={() => { setCreating(true); setBulkAdding(false); }}>+ Add Folder</button>
            <input ref={fileInputRef} type="file" hidden onChange={handleUpload} accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.txt" />
            <div className="cdoc__seg">
              <button className={`cdoc__seg-btn${viewMode === 'grid' ? ' active' : ''}`} title="Grid" onClick={() => setViewMode('grid')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              </button>
              <button className={`cdoc__seg-btn${viewMode === 'list' ? ' active' : ''}`} title="List" onClick={() => setViewMode('list')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* folder grid when viewing parent */}
        {(!activeFolder || getChildren(activeFolder).length > 0) && (
          <div className="docmgr__folder-grid" style={{ marginTop: 12 }}>
            {(activeFolder === null ? rootFolders : getChildren(activeFolder)).map((f) => {
              const childCount = getChildren(f.id).length;
              const fileCount = docCounts[f.name] || 0;
              return (
                <div key={f.id} className="docmgr__folder-card" onClick={() => { setActiveFolder(f.id); setDocSelected([]); }} onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ id: f.id, x: e.clientX, y: e.clientY }); }}>
                  <div className="cdoc__folder-card-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                  </div>
                  <span className="docmgr__folder-card-name">{f.name}</span>
                  <span className="docmgr__folder-card-meta">
                    {childCount > 0 && `${childCount} folder${childCount > 1 ? 's' : ''}`}
                    {childCount > 0 && fileCount > 0 && ' · '}
                    {fileCount > 0 && `${fileCount} file${fileCount > 1 ? 's' : ''}`}
                    {childCount === 0 && fileCount === 0 && 'Empty'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* document view */}
        {isFileView && (
          sorted.length === 0 ? (
            <div className="empty" style={{ marginTop: 20, textAlign: 'center', padding: 40 }}>
              <div className="empty__icon" style={{ marginBottom: 8 }}><Icon name="folder" size={24} /></div>
              <p className="muted" style={{ margin: 0 }}>No documents in this folder.</p>
              <div style={{ marginTop: 12 }}>
                <button className="btn btn--ghost btn--sm" onClick={() => fileInputRef.current?.click()}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  Upload Document
                </button>
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <div className="cdoc__table-wrap" style={{ marginTop: 12 }}>
              <table className="cdoc__table">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}><input type="checkbox" checked={allChecked} ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }} onChange={toggleAll} /></th>
                    <th className="cdoc__th cdoc__th--name">Name</th>
                    <th className="cdoc__th">Type</th>
                    <th className="cdoc__th">Size</th>
                    <th className="cdoc__th">Uploaded On</th>
                    <th className="cdoc__th" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((d) => {
                    const name = d.name || d.title || 'Untitled';
                    return (
                      <tr key={d.id} className="cdoc__tr">
                        <td className="cdoc__td"><input type="checkbox" checked={docSelected.includes(d.id)} onChange={() => toggleDocSelect(d.id)} /></td>
                        <td className="cdoc__td cdoc__td--name">
                          <div className="cdoc__doc-name-cell">
                            <FileTypeIcon name={name} />
                            <span className="cdoc__doc-name">{name}</span>
                          </div>
                        </td>
                        <td className="cdoc__td"><ExtBadge name={name} /></td>
                        <td className="cdoc__td cdoc__td--muted">{bytes(d.size)}</td>
                        <td className="cdoc__td cdoc__td--muted">{formatDate(d.uploaded_at || d.created_at || d.uploadedAt)}</td>
                        <td className="cdoc__td cdoc__td--actions">
                          <div className="cdoc__action-more-wrap">
                            <button className="cdoc__doc-menu-btn" onClick={(e) => { e.stopPropagation(); setDocMenuId(docMenuId === d.id ? null : d.id); }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                            </button>
                            {docMenuId === d.id && (
                              <div className="cdoc__doc-menu" onClick={(e) => e.stopPropagation()}>
                                <div className="cdoc__doc-menu-item" onClick={() => { setPreview(d); setDocMenuId(null); }}>Preview</div>
                                <div className="cdoc__doc-menu-item" onClick={async () => { const url = await storageService.getUrl(d.ref); if (url) window.open(url, '_blank'); setDocMenuId(null); }}>Download</div>
                                <div className="cdoc__doc-menu-divider" />
                                <div className="cdoc__doc-menu-item cdoc__doc-menu-item--danger" onClick={() => { deleteDocument(d); setDocMenuId(null); }}>Delete</div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="cdoc__pagination">
                  <span className="cdoc__pg-info">Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, sorted.length)} of {sorted.length}</span>
                  <div className="cdoc__pg-btns">
                    <button className="cdoc__pg-btn" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>«</button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button key={i} className={`cdoc__pg-btn${page === i + 1 ? ' active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
                    ))}
                    <button className="cdoc__pg-btn" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}>»</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="docgrid" style={{ marginTop: 12 }}>
              {paginated.map((d) => {
                const name = d.name || d.title || 'Untitled';
                return (
                  <div key={d.id} className="doccard" style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 6, left: 6 }}><input type="checkbox" checked={docSelected.includes(d.id)} onChange={() => toggleDocSelect(d.id)} /></div>
                    <div className="doccard__icon"><FileTypeIcon name={name} /></div>
                    <div className="doccard__name" title={name}>{name}</div>
                    <div className="doccard__meta">
                      <ExtBadge name={name} />
                      <span>{bytes(d.size)}</span>
                    </div>
                    <div className="doccard__actions" style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <button className="cdoc__doc-action" title="Preview" onClick={() => setPreview(d)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg></button>
                      <button className="cdoc__doc-action" title="Download" onClick={async () => { const url = await storageService.getUrl(d.ref); if (url) window.open(url, '_blank'); }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg></button>
                      <button className="cdoc__doc-action cdoc__doc-action--danger" title="Delete" onClick={() => deleteDocument(d)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setPreview(null)}>
          <div className="modal modal--lg">
            <header className="modal__head">
              <span className="modal__title">{preview.name}</span>
              <button className="modal__close" onClick={() => setPreview(null)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
            </header>
            <div className="modal__body">
              {preview.text ? (
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'serif', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{preview.text}</pre>
              ) : (
                <div className="empty"><p className="muted">No preview available.</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Folder properties modal */}
      {folderProps && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setFolderProps(null)}>
          <div className="modal">
            <header className="modal__head">
              <span className="modal__title">Folder Properties</span>
              <button className="modal__close" onClick={() => setFolderProps(null)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
            </header>
            <div className="modal__body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><strong style={{ color: 'var(--text-soft)', fontSize: 12, display: 'block', marginBottom: 2 }}>Name</strong><span style={{ fontSize: 14 }}>{folderProps.name}</span></div>
                <div><strong style={{ color: 'var(--text-soft)', fontSize: 12, display: 'block', marginBottom: 2 }}>Kind</strong><span style={{ fontSize: 14 }}>{folderProps.kind || 'document'}</span></div>
                <div><strong style={{ color: 'var(--text-soft)', fontSize: 12, display: 'block', marginBottom: 2 }}>Sub-folders</strong><span style={{ fontSize: 14 }}>{getChildren(folderProps.id).length}</span></div>
                <div><strong style={{ color: 'var(--text-soft)', fontSize: 12, display: 'block', marginBottom: 2 }}>Documents</strong><span style={{ fontSize: 14 }}>{docCounts[folderProps.name] || 0}</span></div>
                <div><strong style={{ color: 'var(--text-soft)', fontSize: 12, display: 'block', marginBottom: 2 }}>Created</strong><span style={{ fontSize: 14 }}>{formatDate(folderProps.created_at)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}