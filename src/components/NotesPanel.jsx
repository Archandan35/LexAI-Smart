import Card from './Card.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import Modal from './Modal.jsx';
import EmptyState from './EmptyState.jsx';
import PermissionGate from './PermissionGate.jsx';
import { Field, Input, Textarea } from './Field.jsx';
import { caseService } from '@/services/caseService.js';
import { caseActivityService } from '@/services/caseActivityService.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { nowISO } from '@/utils/id.js';
import { formatDate } from '@/utils/format.js';

// NotesPanel — add / edit / delete / view case notes.
export default function NotesPanel({ caseId, notes, onChanged }) {
  const toast = useToast();
  const { user } = useAuth();
  const [editing, setEditing] = useState(null); // note or {} for new
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState({ title: '', body: '' });

  const openNew = () => { setForm({ title: '', body: '' }); setEditing({}); };
  const openEdit = (n) => { setForm({ title: n.title, body: n.body }); setEditing(n); };

  const save = async () => {
    if (!form.title.trim()) { toast.push('Title is required.', 'error'); return; }
    if (editing.id) {
      await caseService.deleteNote(editing.id); // simple replace (no note-update API)
      await caseService.addNote({ id: editing.id, caseId, ...form, createdAt: editing.createdAt || nowISO() });
      await caseActivityService.record(caseId, 'note.update', `Updated note "${form.title}"`, user);
    } else {
      await caseService.addNote({ caseId, ...form, createdAt: nowISO() });
      await caseActivityService.record(caseId, 'note.add', `Added note "${form.title}"`, user);
    }
    setEditing(null); toast.push('Note saved.', 'success'); onChanged?.();
  };
  const remove = async (n) => {
    if (!confirm(`Delete note "${n.title}"?`)) return;
    await caseService.deleteNote(n.id);
    await caseActivityService.record(caseId, 'note.delete', `Deleted note "${n.title}"`, user);
    toast.push('Note deleted.', 'success'); onChanged?.();
  };

  return (
    <Card title={`Case Notes (${notes.length})`} actions={<PermissionGate perm="manageCase.edit"><Button size="sm" variant="ghost" icon="plus" onClick={openNew}>Add Note</Button></PermissionGate>}>
      {notes.length === 0 ? <EmptyState icon="notes" title="No notes." /> : notes.map((n) => (
        <div key={n.id} className="qa-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong style={{ flex: 1 }}>{n.title}</strong>
            <span className="muted">{formatDate(n.createdAt)}</span>
            <div className="row-actions">
              <button className="iconbtn" title="View" onClick={() => setViewing(n)}><Icon name="eye" size={14} /></button>
              <PermissionGate perm="manageCase.edit"><button className="iconbtn" title="Edit" onClick={() => openEdit(n)}><Icon name="edit" size={14} /></button></PermissionGate>
              <PermissionGate perm="manageCase.delete"><button className="iconbtn iconbtn--danger" title="Delete" onClick={() => remove(n)}><Icon name="trash" size={14} /></button></PermissionGate>
            </div>
          </div>
          <div style={{ fontSize: 13, marginTop: 6, color: 'var(--text-soft)', whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>{n.body}</div>
        </div>
      ))}

      <Modal open={!!editing} title={editing?.id ? 'Edit Note' : 'Add Note'} onClose={() => setEditing(null)}
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button icon="save" onClick={save}>Save</Button></>}>
        <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></Field>
        <Field label="Note"><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} style={{ minHeight: 160 }} /></Field>
      </Modal>

      <Modal open={!!viewing} title={viewing?.title} onClose={() => setViewing(null)}>
        <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>{viewing?.body}</div>
      </Modal>
    </Card>
  );
}
