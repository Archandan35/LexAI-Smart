import Card from './Card.jsx';
import Button from './Button.jsx';
import Badge from './Badge.jsx';
import Icon from './Icon.jsx';
import Modal from './Modal.jsx';
import EmptyState from './EmptyState.jsx';
import FileDrop from './FileDrop.jsx';
import FolderPicker from './FolderPicker.jsx';
import PermissionGate from './PermissionGate.jsx';
import SyncStatus from './SyncStatus.jsx';
import { fileLogic } from '@/logic/fileLogic.js';
import { preferencesService } from '@/services/preferencesService.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { usePermissions } from '@/hooks/usePermissions.js';
import { exportJson } from '@/utils/exportData.js';
import { bytes, formatDate } from '@/utils/format.js';

const VIEW_KEY = 'lexai.docview.v1';

// DocumentManager — folder-based document manager with list/grid views, upload
// workflow (choose/create folder), per-file actions and bulk actions.
export default function DocumentManager({ caseId, documents, folders, onChanged }) {
  const toast = useToast();
  const { user } = useAuth();
  const { can } = usePermissions();
  const [view, setView] = useState(() => preferencesService.get(VIEW_KEY, 'list'));
  const [activeFolder, setActiveFolder] = useState('all');
  const [selected, setSelected] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFolder, setUploadFolder] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null); // doc or 'bulk'
  const [moveFolder, setMoveFolder] = useState('');
  const [preview, setPreview] = useState(null);
  const [folderMgr, setFolderMgr] = useState(false);

  const setViewMode = (v) => { setView(v); preferencesService.set(VIEW_KEY, v); };

  const docFolders = folders.filter((f) => f.kind === 'document');
  const counts = useMemo(() => {
    const m = {};
    documents.forEach((d) => { m[d.folder] = (m[d.folder] || 0) + 1; });
    return m;
  }, [documents]);

  const visible = activeFolder === 'all' ? documents : documents.filter((d) => d.folder === activeFolder);

  const createFolder = async (name) => {
    const res = await fileLogic.createFolder(caseId, name, 'document', user);
    if (!res.ok) toast.push(res.error, 'error'); else { toast.push('Folder created.', 'success'); onChanged?.(); }
  };

  const doUpload = async () => {
    if (!pendingFile || !uploadFolder) { toast.push('Pick a file and folder.', 'error'); return; }
    const res = await fileLogic.uploadDocument(pendingFile, { caseId, folder: uploadFolder }, user);
    if (res.ok) { toast.push('Document uploaded.', 'success'); setUploadOpen(false); setPendingFile(null); setUploadFolder(''); onChanged?.(); }
    else toast.push(res.error, 'error');
  };

  const view1 = async (d) => {
    const url = d.ref ? await fileLogic.getUrl(d.ref) : null;
    if (d.text || d.content) { setPreview(d); return; }
    if (url) window.open(url, '_blank'); else toast.push('Preview not available.', 'info');
  };
  const downloadDoc = async (d) => {
    const url = d.ref ? await fileLogic.getUrl(d.ref) : null;
    if (url) { const a = document.createElement('a'); a.href = url; a.download = d.name; a.click(); }
    else if (d.text) { exportJson(d.name, { name: d.name, text: d.text }); }
    else toast.push('Nothing to download.', 'info');
  };
  const del = async (d) => { if (confirm(`Delete "${d.name}"?`)) { await fileLogic.deleteDocument(d, user); toast.push('Deleted.', 'success'); onChanged?.(); } };
  const copy = async (d) => { await fileLogic.copyDocument(d); toast.push('Copied.', 'success'); onChanged?.(); };

  const move = async () => {
    if (!moveFolder) return;
    if (moveTarget === 'bulk') await fileLogic.bulkMove(documents.filter((d) => selected.includes(d.id)), moveFolder, user);
    else await fileLogic.moveDocument(moveTarget, moveFolder, user);
    toast.push('Moved.', 'success'); setMoveTarget(null); setMoveFolder(''); setSelected([]); onChanged?.();
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.length} document(s)?`)) return;
    await fileLogic.bulkDelete(documents.filter((d) => selected.includes(d.id)), user);
    toast.push('Deleted.', 'success'); setSelected([]); onChanged?.();
  };
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const docActions = (d) => (
    <div className="row-actions">
      <button className="iconbtn" title="View" onClick={() => view1(d)}><Icon name="eye" size={15} /></button>
      <PermissionGate perm="documents.download"><button className="iconbtn" title="Download" onClick={() => downloadDoc(d)}><Icon name="download" size={15} /></button></PermissionGate>
      <PermissionGate perm="documents.edit"><button className="iconbtn" title="Move" onClick={() => { setMoveTarget(d); setMoveFolder(d.folder); }}><Icon name="move" size={15} /></button></PermissionGate>
      <PermissionGate perm="documents.create"><button className="iconbtn" title="Copy" onClick={() => copy(d)}><Icon name="copy" size={15} /></button></PermissionGate>
      <PermissionGate perm="documents.delete"><button className="iconbtn iconbtn--danger" title="Delete" onClick={() => del(d)}><Icon name="trash" size={15} /></button></PermissionGate>
    </div>
  );

  return (
    <div className="docmgr">
      <aside className="docmgr__folders">
        <div className="docmgr__folders-head">
          <span>Folders</span>
          <PermissionGate perm="documents.edit"><button className="iconbtn" title="Manage folders" onClick={() => setFolderMgr(true)}><Icon name="gear" size={14} /></button></PermissionGate>
        </div>
        <button className={`docmgr__folder ${activeFolder === 'all' ? 'active' : ''}`} onClick={() => setActiveFolder('all')}>
          <Icon name="layers" size={15} /> <span>All</span> <span className="docmgr__count">{documents.length}</span>
        </button>
        {docFolders.map((f) => (
          <button key={f.id} className={`docmgr__folder ${activeFolder === f.name ? 'active' : ''}`} onClick={() => setActiveFolder(f.name)}>
            <Icon name="folder" size={15} /> <span>{f.name}</span> <span className="docmgr__count">{counts[f.name] || 0}</span>
          </button>
        ))}
      </aside>

      <div className="docmgr__main">
        <div className="toolbar-row">
          <PermissionGate perm="documents.upload"><Button size="sm" icon="upload" onClick={() => { setUploadFolder(activeFolder === 'all' ? '' : activeFolder); setUploadOpen(true); }}>Upload</Button></PermissionGate>
          <div style={{ flex: 1 }} />
          {selected.length > 0 && (
            <>
              <span className="muted">{selected.length} selected</span>
              <PermissionGate perm="documents.edit"><Button size="sm" variant="ghost" icon="move" onClick={() => { setMoveTarget('bulk'); setMoveFolder(''); }}>Move</Button></PermissionGate>
              <PermissionGate perm="documents.export"><Button size="sm" variant="ghost" icon="download" onClick={() => exportJson('documents_export', documents.filter((d) => selected.includes(d.id)))}>Export</Button></PermissionGate>
              <PermissionGate perm="documents.bulkDelete"><Button size="sm" variant="danger" icon="trash" onClick={bulkDelete}>Delete</Button></PermissionGate>
            </>
          )}
          <div className="seg">
            <button className={`seg__btn ${view === 'list' ? 'active' : ''}`} title="List view" onClick={() => setViewMode('list')}><Icon name="list" size={15} /></button>
            <button className={`seg__btn ${view === 'grid' ? 'active' : ''}`} title="Grid view" onClick={() => setViewMode('grid')}><Icon name="grid" size={15} /></button>
          </div>
        </div>

        {visible.length === 0 ? <EmptyState icon="file" title="No documents in this folder." /> : view === 'list' ? (
          <Card bodyClass="card__body--flush">
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th style={{ width: 34 }} /><th>Name</th><th>Folder</th><th>Sync</th><th>Size</th><th>Uploaded</th><th style={{ width: 170 }}>Actions</th></tr></thead>
                <tbody>
                  {visible.map((d) => (
                    <tr key={d.id} className={selected.includes(d.id) ? 'row--selected' : ''}>
                      <td>{can('documents.bulkDelete') && <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggle(d.id)} />}</td>
                      <td style={{ fontWeight: 600 }}><Icon name="file" size={14} /> {d.name}</td>
                      <td><Badge tone="grey">{d.folder}</Badge></td>
                      <td><SyncStatus status={d.syncStatus} /></td>
                      <td>{bytes(d.size)}</td>
                      <td>{formatDate(d.uploadedAt)}</td>
                      <td>{docActions(d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="docgrid">
            {visible.map((d) => (
              <div key={d.id} className={`doccard ${selected.includes(d.id) ? 'doccard--sel' : ''}`}>
                <div className="doccard__top">
                  {can('documents.bulkDelete') && <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggle(d.id)} />}
                  <SyncStatus status={d.syncStatus} dot />
                </div>
                <div className="doccard__icon"><Icon name="file" size={26} /></div>
                <div className="doccard__name" title={d.name}>{d.name}</div>
                <div className="doccard__meta"><Badge tone="grey">{d.folder}</Badge> <span>{bytes(d.size)}</span></div>
                <div className="doccard__actions">{docActions(d)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload workflow */}
      <Modal open={uploadOpen} title="Upload Document" onClose={() => setUploadOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setUploadOpen(false)}>Cancel</Button><Button icon="upload" onClick={doUpload}>Upload</Button></>}>
        <FolderPicker folders={docFolders} value={uploadFolder} onChange={setUploadFolder} onCreateFolder={createFolder} label="Save to folder" />
        <div style={{ marginTop: 12 }}><FileDrop onFile={setPendingFile} /></div>
        {pendingFile && <div className="alert alert--info" style={{ marginTop: 12 }}><Icon name="file" size={15} />Ready: {pendingFile.name}</div>}
      </Modal>

      {/* Move */}
      <Modal open={!!moveTarget} title="Move to folder" onClose={() => setMoveTarget(null)}
        footer={<><Button variant="ghost" onClick={() => setMoveTarget(null)}>Cancel</Button><Button icon="move" onClick={move}>Move</Button></>}>
        <FolderPicker folders={docFolders} value={moveFolder} onChange={setMoveFolder} onCreateFolder={createFolder} label="Destination folder" />
      </Modal>

      {/* Text preview */}
      <Modal open={!!preview} title={preview?.name} onClose={() => setPreview(null)} size="lg">
        <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.7 }}>{preview?.text || preview?.content}</div>
      </Modal>

      <FolderManagerModal open={folderMgr} onClose={() => setFolderMgr(false)} caseId={caseId} folders={docFolders} kind="document" onChanged={onChanged} />
    </div>
  );
}

// Inline folder manager (create/rename/delete) reused for documents & drafts.
export function FolderManagerModal({ open, onClose, caseId, folders, kind, onChanged }) {
  const toast = useToast();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const add = async () => {
    const res = await fileLogic.createFolder(caseId, name, kind, user);
    if (res.ok) { setName(''); onChanged?.(); } else toast.push(res.error, 'error');
  };
  const save = async (f) => { const res = await fileLogic.renameFolder(f, editName, user); if (res.ok) { setEditId(null); onChanged?.(); } else toast.push(res.error, 'error'); };
  const del = async (f) => { if (confirm(`Delete folder "${f.name}"? Items move to Miscellaneous.`)) { await fileLogic.deleteFolder(f, { moveTo: 'Miscellaneous' }, user); onChanged?.(); } };

  return (
    <Modal open={open} title={`Manage ${kind === 'draft' ? 'Draft' : 'Document'} Folders`} onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Input value={name} placeholder="New folder…" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button icon="folderPlus" onClick={add}>Add</Button>
      </div>
      <div className="table-scroll" style={{ maxHeight: '46vh' }}>
        <table className="table">
          <tbody>
            {folders.map((f) => (
              <tr key={f.id}>
                <td>{editId === f.id ? <Input value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} /> : <><Icon name="folder" size={14} /> {f.name}{f.system && <Badge tone="grey">default</Badge>}</>}</td>
                <td style={{ width: 100 }}>
                  <div className="row-actions">
                    {editId === f.id
                      ? <><button className="iconbtn" onClick={() => save(f)}><Icon name="check" size={14} /></button><button className="iconbtn" onClick={() => setEditId(null)}><Icon name="close" size={14} /></button></>
                      : <><button className="iconbtn" onClick={() => { setEditId(f.id); setEditName(f.name); }}><Icon name="edit" size={14} /></button><button className="iconbtn iconbtn--danger" onClick={() => del(f)}><Icon name="trash" size={14} /></button></>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
