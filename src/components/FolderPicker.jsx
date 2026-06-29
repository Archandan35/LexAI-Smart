import { useState } from 'react';
import { Field, Select, Input } from './Field.jsx';
import Button from './Button.jsx';

// FolderPicker — "use existing folder OR create folder" control used in the
// upload workflow and store-in-case. Returns the chosen folder name via onPick
// (creating the folder first if requested).
export default function FolderPicker({ folders = [], value, onChange, onCreateFolder, label = 'Folder' }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const create = async () => {
    const n = name.trim();
    if (!n) return;
    const result = await onCreateFolder?.(n);
    onChange?.(result?.id || n);
    setName(''); setCreating(false);
  };

  return (
    <Field label={label}>
      {!creating ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <Select value={value || ''} onChange={(e) => onChange?.(e.target.value)}>
            <option value="">Select folder…</option>
            {folders.map((f) => <option key={f.id || f.name} value={f.id || f.name}>{f.name}</option>)}
          </Select>
          <Button variant="ghost" icon="folderPlus" onClick={() => setCreating(true)}>New</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <Input autoFocus value={name} placeholder="New folder name…" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          <Button variant="primary" icon="check" onClick={create}>Create</Button>
          <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
        </div>
      )}
    </Field>
  );
}

