import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import FolderPicker from './FolderPicker.jsx';
import { Field, Select } from './Field.jsx';
import { caseLogic } from '@/logic/caseLogic.js';
import { fileLogic } from '@/logic/fileLogic.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';

// StoreInCaseModal — choose a case + document folder to move a draft into.
export default function StoreInCaseModal({ open, draft, lockedCaseId, onClose, onStore }) {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState(lockedCaseId || '');
  const [folders, setFolders] = useState([]);
  const [folder, setFolder] = useState('');

  useEffect(() => { if (open && !lockedCaseId) caseLogic.list().then((rows) => setCases(rows.filter((c) => !c.archived))); }, [open, lockedCaseId]);
  useEffect(() => { setCaseId(lockedCaseId || ''); }, [lockedCaseId, open]);
  useEffect(() => {
    if (!caseId) { setFolders([]); return; }
    fileLogic.listFolders(caseId, 'document').then(setFolders);
  }, [caseId]);

  const createFolder = async (name) => { await fileLogic.createFolder(caseId, name, 'document', user); setFolders(await fileLogic.listFolders(caseId, 'document')); };

  return (
    <Modal open={open} title="Store Draft in Case" onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon="save" disabled={!caseId || !folder} onClick={() => onStore?.({ caseId, folder })}>Store in Case</Button></>}>
      <div className="alert alert--info" style={{ marginBottom: 14 }}>
        <Icon name="save" size={15} />
        <span>The draft <b>{draft?.title}</b> will be moved into the chosen case folder and removed from the Draft Workspace.</span>
      </div>
      {!lockedCaseId && (
        <Field label="Case">
          <Select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            <option value="">Select case…</option>
            {cases.map((c) => <option key={c.id} value={c.id}>{c.caseNumber} — {c.title}</option>)}
          </Select>
        </Field>
      )}
      {caseId && <FolderPicker folders={folders} value={folder} onChange={setFolder} onCreateFolder={createFolder} label="Destination folder" />}
    </Modal>
  );
}
