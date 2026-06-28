import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Modal from '@/components/Modal.jsx';
import Icon from '@/components/Icon.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import DocEditor from '@/components/DocEditor.jsx';
import CaseSelect from '@/components/CaseSelect.jsx';
import GuardrailBanner from '@/components/GuardrailBanner.jsx';
import StoreInCaseModal from '@/components/StoreInCaseModal.jsx';
import PermissionGate from '@/components/PermissionGate.jsx';
import { Field, Input, Textarea, Select } from '@/components/Field.jsx';
import { draftTypeLogic } from '@/logic/draftTypeLogic.js';
import { folderTemplateLogic } from '@/logic/folderTemplateLogic.js';
import { DRAFT_FILE_TYPES, DEFAULT_DRAFT_FILE_TYPE } from '@/constants/caseFolders.js';
import { draftingLogic } from '@/logic/draftingLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { config } from '@/config/config.js';
import { preferencesService } from '@/services/preferencesService.js';
import { exportPdf, exportDocx, exportHtml, exportTxt } from '@/utils/exportDoc.js';
import { fromNow, formatDateTime, formatDate } from '@/utils/format.js';

const FOLDER_KEY = 'lexai.draftfolders.v1';
const AUTOSAVE_KEY = 'lexai.autosave.v1';

const PLACEHOLDERS = [
  { label: 'Today’s Date', value: formatDate(new Date()) },
  { label: 'Court Name', value: '«Court Name»' },
  { label: 'Case Number', value: '«Case Number»' },
  { label: 'Plaintiff / Petitioner', value: '«Plaintiff»' },
  { label: 'Defendant / Respondent', value: '«Defendant»' },
  { label: 'Advocate', value: '«Advocate for the Plaintiff»' },
];

export default function DraftingStudio() {
  const toast = useToast();
  const { user } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const [draftTypes, setDraftTypes] = useState([]);
  const [draftTypeMap, setDraftTypeMap] = useState({});
  const [folderTpls, setFolderTpls] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState('all');
  const [active, setActive] = useState(null);
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState('edit'); // 'edit' | 'view'
  const [layout, setLayout] = useState({ pageSize: 'a4', orientation: 'portrait', margin: 'normal' });
  const [genOpen, setGenOpen] = useState(false);
  const [blankOpen, setBlankOpen] = useState(false);
  const [verOpen, setVerOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [folderMgr, setFolderMgr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState(''); // '', 'saving', 'saved'
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSave, setAutoSave] = useState(() => preferencesService.get(AUTOSAVE_KEY, 'on') !== 'on');

  const [form, setForm] = useState({
    type: '', caseId: '', folder: '', fileType: DEFAULT_DRAFT_FILE_TYPE,
    court: '', caseNumber: '', plaintiff: '', defendant: '', facts: '', reliefs: '', attachCitations: true,
  });
  const [blank, setBlank] = useState({ title: '', folder: '', fileType: DEFAULT_DRAFT_FILE_TYPE });

  const interval = config.storage?.autoSaveInterval || 5000;
  const saveTimer = useRef(null);

  const loadDrafts = useCallback(async () => {
    const rows = await draftingLogic.listDrafts();
    setDrafts(rows);
    return rows;
  }, []);

  const loadLookups = useCallback(async () => {
    const [typesResult, folderResult] = await Promise.all([
      draftTypeLogic.list(),
      folderTemplateLogic.list('draft'),
    ]);
    const types = Array.isArray(typesResult) ? typesResult : [];
    const tpls = Array.isArray(folderResult) ? folderResult : [];
    setDraftTypes(types);
    setDraftTypeMap(Object.fromEntries(types.map((t) => [t.id || t.name, t])));
    setFolderTpls(tpls);
    const fSaved = preferencesService.get(FOLDER_KEY, null);
    const fList = Array.isArray(fSaved) && fSaved.length ? fSaved : tpls.map((t) => t.name);
    setFolders(fList);
    const defaultFolder = fList[0] || '';
    setForm((prev) => ({ ...prev, folder: prev.folder || defaultFolder }));
    setBlank((prev) => ({ ...prev, folder: prev.folder || defaultFolder }));
  }, []);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);
  useEffect(() => { loadLookups(); }, [loadLookups]);

  const persistFolders = (next) => { setFolders(next); preferencesService.set(FOLDER_KEY, next); };

  const openDraft = (d, m = 'edit') => { setActive(d); setContent(d.content || ''); setDirty(false); setMode(m); setSaveState(''); setLastSaved(d.updatedAt || null); };

  const doSave = useCallback(async (silent = false) => {
    if (!active) return;
    setSaveState('saving');
    await draftingLogic.saveDraft(active.id, { content });
    setDirty(false); setSaveState('saved'); setLastSaved(new Date().toISOString());
    const rows = await loadDrafts();
    setActive((a) => rows.find((d) => d.id === a?.id) || a);
    if (!silent) toast.push('Draft saved (version snapshot created).', 'success');
  }, [active, content, loadDrafts, toast]);

  // Auto-save: debounce after edits when enabled.
  useEffect(() => {
    if (!autoSave || !dirty || mode !== 'edit' || !active) return undefined;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { doSave(true); }, interval);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [content, autoSave, dirty, mode, active, interval, doSave]);

  const onGenerate = async () => {
    setBusy(true);
    const res = await draftingLogic.generate(form);
    setBusy(false);
    if (!res.ok) { toast.push(res.error, 'error'); return; }
    const created = await draftingLogic.createDraft({
      caseId: form.caseId || null, type: form.type, folder: form.folder, fileType: form.fileType,
      title: `${draftTypeMap[form.type]?.label || form.type}${form.plaintiff ? ` — ${form.plaintiff}` : ''}`,
      content: res.data.content, court: form.court, caseNumber: form.caseNumber,
      plaintiff: form.plaintiff, defendant: form.defendant,
    });
    setGenOpen(false);
    await loadDrafts();
    openDraft(created);
    toast.push('Draft generated.', 'success');
  };

  const onCreateBlank = async () => {
    if (!blank.title.trim()) { toast.push('Enter a title.', 'error'); return; }
    const created = await draftingLogic.createDraft({ type: 'note', title: blank.title.trim(), folder: blank.folder, fileType: blank.fileType, content: '' });
    setBlankOpen(false); setBlank({ title: '', folder: folders[0] || '', fileType: DEFAULT_DRAFT_FILE_TYPE });
    await loadDrafts(); openDraft(created); toast.push('Draft created.', 'success');
  };

  const onDelete = async (id) => {
    if (!confirm('Delete this draft?')) return;
    await draftingLogic.deleteDraft(id);
    if (active?.id === id) { setActive(null); setContent(''); }
    await loadDrafts();
    toast.push('Draft deleted.', 'info');
  };

  const onDuplicate = async () => { const r = await draftingLogic.duplicate(active.id); if (r.ok) { await loadDrafts(); openDraft(r.data); toast.push('Draft duplicated.', 'success'); } };

  const onRestore = async (versionId) => {
    const restored = await draftingLogic.restoreVersion(active.id, versionId);
    if (restored) { openDraft(restored); await loadDrafts(); setVerOpen(false); toast.push('Version restored.', 'success'); }
  };

  const onStore = async ({ caseId, folder }) => {
    const r = await draftingLogic.storeInCase(active.id, { caseId, folder }, user);
    if (r.ok) { setStoreOpen(false); setActive(null); setContent(''); await loadDrafts(); toast.push(`Draft stored in case folder “${folder}”.`, 'success'); }
    else toast.push(r.error, 'error');
  };

  const toggleAutoSave = () => { const next = !autoSave; setAutoSave(next); preferencesService.set(AUTOSAVE_KEY, next ? 'on' : 'off'); };

  const visible = activeFolder === 'all' ? drafts : drafts.filter((d) => (d.folder || 'Miscellaneous') === activeFolder);
  const counts = drafts.reduce((m, d) => { const f = d.folder || 'Miscellaneous'; m[f] = (m[f] || 0) + 1; return m; }, {});

  return (
    <div className="fade-in">
      <PageHeader
        icon="pen"
        title="Drafting Studio"
        subtitle="Professional legal drafting suite — Word-grade editor, folders, version history, auto-save and PDF/DOCX/HTML/TXT export. Store finished drafts straight into a case folder."
        actions={(
          <div className="flex-row gap-8">
            <PermissionGate perm="drafting.create"><Button variant="ghost" icon="plus" onClick={() => setBlankOpen(true)}>Blank</Button></PermissionGate>
            <PermissionGate perm="drafting.create"><Button icon="bolt" onClick={() => setGenOpen(true)}>Generate</Button></PermissionGate>
          </div>
        )}
      />

      <div className="docmgr">
        <aside className="docmgr__folders">
          <div className="docmgr__folders-head">
            <span>Draft Folders</span>
            <button className="iconbtn" title="Manage folders" onClick={() => setFolderMgr(true)}><Icon name="gear" size={14} /></button>
          </div>
          <button className={`docmgr__folder ${activeFolder === 'all' ? 'active' : ''}`} onClick={() => setActiveFolder('all')}>
            <Icon name="layers" size={15} /> <span>All Drafts</span> <span className="docmgr__count">{drafts.length}</span>
          </button>
          {folders.map((f) => (
            <button key={f} className={`docmgr__folder ${activeFolder === f ? 'active' : ''}`} onClick={() => setActiveFolder(f)}>
              <Icon name="folder" size={15} /> <span>{f}</span> <span className="docmgr__count">{counts[f] || 0}</span>
            </button>
          ))}
        </aside>

        <div className="docmgr__main">
          <div className="grid-sidebar">
            <Card title="Drafts" sub={`${visible.length} document(s)`}>
              {visible.length === 0 ? (
                <EmptyState icon="pen" title="No drafts here." hint="Generate or create a blank draft." />
              ) : visible.map((d) => (
                <div
                  key={d.id}
                  className="list-row"
                  style={active?.id === d.id ? { background: 'var(--brand-soft)' } : {}}
                  onClick={() => openDraft(d)}
                >
                  <div className="list-row__icon"><Icon name="doc" size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="list-row__title ellipsis">{d.title}</div>
                    <div className="list-row__meta">{(d.fileType || 'docx').toUpperCase()} · {d.folder || 'Miscellaneous'} · {fromNow(d.updatedAt || d.createdAt)}</div>
                  </div>
                  <PermissionGate perm="drafting.delete"><button className="btn btn--danger btn--sm" onClick={(e) => { e.stopPropagation(); onDelete(d.id); }}><Icon name="trash" size={13} /></button></PermissionGate>
                </div>
              ))}
            </Card>

            <div>
              {!active ? (
                <Card><EmptyState icon="edit" title="Select or create a draft" hint="The Word-grade editor will appear here." /></Card>
              ) : (
                <Card
                  title={active.title}
                  sub={(
                    <span>
                      {draftTypeMap[active.type]?.label || active.type} · {(active.fileType || 'docx').toUpperCase()}
                      {mode === 'edit' && saveState === 'saving' && ' · Saving…'}
                      {mode === 'edit' && saveState === 'saved' && ' · ✓ Saved'}
                      {mode === 'edit' && dirty && saveState !== 'saving' && ' · unsaved changes'}
                      {lastSaved && ` · Last saved ${formatDateTime(lastSaved)}`}
                    </span>
                  )}
                  actions={(
                    <div className="flex-row gap-6 flex-wrap items-center">
                      <div className="seg">
                        <button className={`seg__btn ${mode === 'edit' ? 'active' : ''}`} onClick={() => setMode('edit')} title="Edit"><Icon name="edit" size={14} /></button>
                        <button className={`seg__btn ${mode === 'view' ? 'active' : ''}`} onClick={() => setMode('view')} title="Read-only view"><Icon name="eye" size={14} /></button>
                      </div>
                      <Button variant="ghost" size="sm" icon="history" onClick={() => setVerOpen(true)}>Versions ({(active.versions || []).length})</Button>
                      <Button variant="ghost" size="sm" icon="copy" onClick={onDuplicate}>Duplicate</Button>
                      <Button variant="ghost" size="sm" icon="download" onClick={() => exportPdf(active.title, content)}>PDF</Button>
                      <Button variant="ghost" size="sm" icon="download" onClick={() => exportDocx(active.title, content)}>DOCX</Button>
                      <Button variant="ghost" size="sm" icon="download" onClick={() => exportHtml(active.title, content)}>HTML</Button>
                      <Button variant="ghost" size="sm" icon="download" onClick={() => exportTxt(active.title, content)}>TXT</Button>
                      <PermissionGate perm="drafting.export"><Button variant="ghost" size="sm" icon="save" onClick={() => setStoreOpen(true)}>Store in Case</Button></PermissionGate>
                      <Button size="sm" icon="save" loading={busy} disabled={!dirty || mode === 'view'} onClick={() => doSave(false)}>Save</Button>
                    </div>
                  )}
                >
                  <div className="toolbar-row mb-10">
                    <Select value={layout.pageSize} onChange={(e) => setLayout({ ...layout, pageSize: e.target.value })} className="ds__select-page">
                      <option value="a4">A4</option><option value="legal">Legal</option><option value="letter">Letter</option>
                    </Select>
                    <Select value={layout.orientation} onChange={(e) => setLayout({ ...layout, orientation: e.target.value })} className="ds__select-orient">
                      <option value="portrait">Portrait</option><option value="landscape">Landscape</option>
                    </Select>
                    <Select value={layout.margin} onChange={(e) => setLayout({ ...layout, margin: e.target.value })} className="ds__select-margin">
                      <option value="normal">Normal margins</option><option value="narrow">Narrow</option><option value="wide">Wide</option>
                    </Select>
                    <div className="flex-1" />
                    <label className="muted ds__autosave-label">
                      <input type="checkbox" checked={autoSave} onChange={toggleAutoSave} /> Auto-save ({Math.round(interval / 1000)}s)
                    </label>
                  </div>
                  <DocEditor
                    value={content}
                    onChange={(v) => { setContent(v); setDirty(true); setSaveState(''); }}
                    readOnly={mode === 'view'}
                    pageSize={layout.pageSize}
                    orientation={layout.orientation}
                    margin={layout.margin}
                    placeholders={PLACEHOLDERS}
                  />
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Generate modal */}
      <Modal open={genOpen} title="Generate Draft" size="lg" onClose={() => setGenOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setGenOpen(false)}>Cancel</Button><Button icon="bolt" loading={busy} onClick={onGenerate}>Generate</Button></>}>
        <GuardrailBanner />
        <div className="input-row">
          <Field label="Document Type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{draftTypes.map((t) => <option key={t.id || t.name} value={t.id || t.name}>{t.label || t.name}</option>)}</Select></Field>
          <Field label="Link to Case (optional)"><CaseSelect value={form.caseId} onChange={(v) => setForm({ ...form, caseId: v })} /></Field>
        </div>
        <div className="input-row">
          <Field label="Draft Folder"><Select value={form.folder} onChange={(e) => setForm({ ...form, folder: e.target.value })}>{folders.map((f) => <option key={f}>{f}</option>)}</Select></Field>
          <Field label="File Type"><Select value={form.fileType} onChange={(e) => setForm({ ...form, fileType: e.target.value })}>{DRAFT_FILE_TYPES.map((t) => <option key={t} value={t}>.{t}</option>)}</Select></Field>
        </div>
        <div className="input-row">
          <Field label="Court"><Input value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })} placeholder="e.g. Civil Judge (Sr. Dvn.)" /></Field>
          <Field label="Case Number"><Input value={form.caseNumber} onChange={(e) => setForm({ ...form, caseNumber: e.target.value })} placeholder="O.S. No. __ of 20__" /></Field>
        </div>
        <div className="input-row">
          <Field label="Plaintiff / Petitioner"><Input value={form.plaintiff} onChange={(e) => setForm({ ...form, plaintiff: e.target.value })} /></Field>
          <Field label="Defendant / Respondent"><Input value={form.defendant} onChange={(e) => setForm({ ...form, defendant: e.target.value })} /></Field>
        </div>
        <Field label="Material Facts"><Textarea value={form.facts} onChange={(e) => setForm({ ...form, facts: e.target.value })} placeholder="Brief facts the draft should plead…" /></Field>
        <Field label="Reliefs / Prayer"><Textarea value={form.reliefs} onChange={(e) => setForm({ ...form, reliefs: e.target.value })} placeholder="Reliefs claimed…" className="ds__reliefs-input" /></Field>
        <label className="ds__attach-label">
          <input type="checkbox" checked={form.attachCitations} onChange={(e) => setForm({ ...form, attachCitations: e.target.checked })} />
          Attach verified authorities (retrieved &amp; verified — never invented)
        </label>
      </Modal>

      {/* Blank draft modal */}
      <Modal open={blankOpen} title="New Blank Draft" onClose={() => setBlankOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setBlankOpen(false)}>Cancel</Button><Button icon="plus" onClick={onCreateBlank}>Create</Button></>}>
        <Field label="Title"><Input value={blank.title} onChange={(e) => setBlank({ ...blank, title: e.target.value })} placeholder="e.g. Objection Petition" autoFocus /></Field>
        <div className="input-row">
          <Field label="Draft Folder"><Select value={blank.folder} onChange={(e) => setBlank({ ...blank, folder: e.target.value })}>{folders.map((f) => <option key={f}>{f}</option>)}</Select></Field>
          <Field label="File Type"><Select value={blank.fileType} onChange={(e) => setBlank({ ...blank, fileType: e.target.value })}>{DRAFT_FILE_TYPES.map((t) => <option key={t} value={t}>.{t}</option>)}</Select></Field>
        </div>
      </Modal>

      {/* Version history */}
      <Modal open={verOpen} title="Version History" onClose={() => setVerOpen(false)}>
        {(active?.versions || []).length === 0 ? (
          <EmptyState icon="history" title="No previous versions." hint="Versions are saved each time you Save." />
        ) : (active.versions).map((v, i) => (
          <div key={v.id} className="qa-card">
            <div className="flex-row items-center justify-between">
              <div><strong>Version {(active.versions.length - i)}</strong><div className="qa-card__p">{formatDateTime(v.savedAt)}</div></div>
              <Button size="sm" variant="ghost" icon="history" onClick={() => onRestore(v.id)}>Restore</Button>
            </div>
            <div className="ds__version-preview">{(v.content || '').replace(/<[^>]+>/g, ' ').slice(0, 180)}…</div>
          </div>
        ))}
      </Modal>

      <StoreInCaseModal open={storeOpen} draft={active} lockedCaseId={active?.caseId || null} onClose={() => setStoreOpen(false)} onStore={onStore} />

      <DraftFolderManager open={folderMgr} folders={folders} onClose={() => setFolderMgr(false)} onSave={persistFolders} />
    </div>
  );
}

// Inline manager for the (global) draft workspace folders.
function DraftFolderManager({ open, folders, onClose, onSave }) {
  const [list, setList] = useState(folders);
  const [name, setName] = useState('');
  useEffect(() => { setList(folders); }, [folders, open]);

  const add = () => { const n = name.trim(); if (!n || list.includes(n)) return; const next = [...list, n]; setList(next); onSave(next); setName(''); };
  const rename = (i, v) => { const next = list.map((f, idx) => (idx === i ? v : f)); setList(next); onSave(next); };
  const del = (i) => { const next = list.filter((_, idx) => idx !== i); setList(next); onSave(next); };

  return (
    <Modal open={open} title="Manage Draft Folders" onClose={onClose}>
      <div className="flex-row gap-8 mb-12">
        <Input value={name} placeholder="New folder…" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button icon="folderPlus" onClick={add}>Add</Button>
      </div>
      <div className="table-scroll ds__folder-table-scroll">
        <table className="table">
          <tbody>
            {list.map((f, i) => (
              <tr key={f}>
                <td><Input value={f} onChange={(e) => rename(i, e.target.value)} /></td>
                <td className="col-min-50"><button className="iconbtn iconbtn--danger" onClick={() => del(i)}><Icon name="trash" size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
