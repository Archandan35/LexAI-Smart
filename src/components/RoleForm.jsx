import React, { useState } from 'react';
import { Field, Input, Textarea, Select } from './Field.jsx';
import Button from './Button.jsx';
import { ROLE_TEMPLATES, TEMPLATE_KEYS } from '@/constants/permissions.js';

// RoleForm — create/edit a role's metadata. Permission editing happens in the
// matrix (RoleDetails); this captures name/code/description/status/template.
export default function RoleForm({ initial, onSubmit, onCancel, busy }) {
  const isEdit = !!initial?.id;
  const [name, setName] = useState(initial?.name || '');
  const [code, setCode] = useState(initial?.code || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [status, setStatus] = useState(initial?.status || 'Active');
  const [template, setTemplate] = useState('custom');

  const submit = (andContinue) => {
    onSubmit?.({ name, code, description, status, template }, andContinue);
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
      {!isEdit && (
        <Field label="Permission template" hint="Pre-fills permissions; you can fine-tune them in the matrix afterwards.">
          <Select value={template} onChange={(e) => setTemplate(e.target.value)}>
            {TEMPLATE_KEYS.map((k) => <option key={k} value={k}>{ROLE_TEMPLATES[k].name}</option>)}
          </Select>
        </Field>
      )}

      <div className="modal__foot" style={{ padding: '8px 0 0', borderTop: 'none' }}>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        {!isEdit && <Button variant="ghost" icon="plus" onClick={() => submit(true)} loading={busy}>Save &amp; Continue</Button>}
        <Button variant="primary" icon="save" onClick={() => submit(false)} loading={busy}>{isEdit ? 'Save changes' : 'Save role'}</Button>
      </div>
    </div>
  );
}
