import { Field, Input, Textarea, Select } from './Field.jsx';
import Button from './Button.jsx';

// RoleForm — create/edit a role's metadata. Permission editing happens in the
// matrix (RoleDetails); this captures name/code/description/status/template.
export default function RoleForm({ initial, onSubmit, onCancel, busy }) {
  const isEdit = !!initial?.id;
  const [name, setName] = useState(initial?.name || '');
  const [code, setCode] = useState(initial?.code || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [status, setStatus] = useState(initial?.status || 'Active');

  const submit = (andContinue) => {
    onSubmit?.({ name, code, description, status }, andContinue);
  };

  return (
    <div>
      <Field label="Role name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Senior Advocate" autoFocus />
      </Field>
      <div className="input-row">
        <Field label="Role code" hint="Lowercase identifier. Auto-generated if blank.">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="senior_advocate" disabled={initial?.system} />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Active</option>
            <option>Disabled</option>
          </Select>
        </Field>
      </div>
      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ minHeight: 80 }} placeholder="What this role is for…" />
      </Field>
      <div className="modal__foot" style={{ padding: '8px 0 0', borderTop: 'none' }}>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        {!isEdit && <Button variant="ghost" icon="plus" onClick={() => submit(true)} loading={busy}>Save &amp; Continue</Button>}
        <Button variant="primary" icon="save" onClick={() => submit(false)} loading={busy}>{isEdit ? 'Save changes' : 'Save role'}</Button>
      </div>
    </div>
  );
}
