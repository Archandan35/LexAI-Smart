import React, { useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { Input, Textarea, Select } from './Field.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';

const TABS = [
  { key: 'single-add', label: 'Single Add', icon: 'plus', group: 'single' },
  { key: 'single-edit', label: 'Single Edit', icon: 'edit', group: 'single' },
  { key: 'single-delete', label: 'Single Delete', icon: 'trash', group: 'single', danger: true },
  { key: 'bulk-add', label: 'Bulk Add', icon: 'users', group: 'bulk' },
  { key: 'bulk-edit', label: 'Bulk Edit', icon: 'edit', group: 'bulk' },
  { key: 'bulk-delete', label: 'Bulk Delete', icon: 'trash', group: 'bulk', danger: true },
  { key: 'import', label: 'Import', icon: 'upload', group: 'import', import: true },
];

export default function EntityManager({ open, onClose, title, logic, items: propItems, onChanged, fields, initialTab }) {
  const toast = useToast();
  const hasCode = fields?.includes('code');

  const [tab, setTab] = useState(initialTab || 'single-add');
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newStatus, setNewStatus] = useState('Active');
  const [newDesc, setNewDesc] = useState('');

  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editStatus, setEditStatus] = useState('Active');

  const [delId, setDelId] = useState('');

  const [bulkText, setBulkText] = useState('');
  const [bulkEditText, setBulkEditText] = useState('');
  const [bulkDelText, setBulkDelText] = useState('');
  const [importFile, setImportFile] = useState(null);

  const resetAdd = () => { setNewName(''); setNewCode(''); setNewStatus('Active'); setNewDesc(''); };

  /* ---- actions ---- */
  const add = async () => {
    if (!newName.trim()) { toast.push('Name is required.', 'error'); return; }
    if (hasCode && !newCode.trim()) { toast.push('Short code is required.', 'error'); return; }
    const payload = { name: newName, ...(hasCode ? { short_code: newCode, status: newStatus, description: newDesc } : {}) };
    const res = await logic.create(payload);
    if (res.ok) { resetAdd(); toast.push(`${title.slice(0, -1) || title} added.`, 'success'); onChanged?.(); }
    else toast.push(res.error, 'error');
  };

  const saveEdit = async () => {
    if (!editId) { toast.push('Select an item to edit.', 'error'); return; }
    if (!editName.trim()) { toast.push('Name is required.', 'error'); return; }
    const payload = { name: editName, ...(hasCode ? { short_code: editCode, status: editStatus } : {}) };
    const res = await logic.update(editId, payload);
    if (res.ok) { toast.push(`Updated.`, 'success'); onChanged?.(); }
    else toast.push(res.error, 'error');
  };

  const doDelete = async () => {
    if (!delId) { toast.push('Select an item to delete.', 'error'); return; }
    const item = propItems.find((x) => x.id === delId);
    if (!confirm(`Delete "${item?.name}"?`)) return;
    await logic.remove(delId);
    setDelId('');
    toast.push(`Deleted.`, 'success'); onChanged?.();
  };

  const addBulk = async () => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { toast.push('Paste at least one entry.', 'error'); return; }
    let added = 0, skipped = 0;
    for (const line of lines) {
      if (hasCode) {
        const [name, code] = line.split(':').map((s) => s.trim());
        if (!name || !code) { skipped++; continue; }
        const res = await logic.create({ name, short_code: code.toUpperCase() });
        if (res.ok) added++; else skipped++;
      } else {
        const res = await logic.create({ name: line });
        if (res.ok) added++; else skipped++;
      }
    }
    setBulkText('');
    toast.push(`${added} added.${skipped ? ` ${skipped} skipped.` : ''}`, added ? 'success' : 'info');
    onChanged?.();
  };

  const saveBulkEdit = async () => {
    const lines = bulkEditText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { toast.push('Paste at least one entry.', 'error'); return; }
    let updated = 0, skipped = 0;
    for (const line of lines) {
      const [idPart, ...rest] = line.split('|').map((s) => s.trim());
      const item = propItems.find((x) => x.short_code === idPart || x.name === idPart || x.id === idPart);
      if (!item || !rest[0]) { skipped++; continue; }
      const [name, code] = rest[0].split(':').map((s) => s.trim());
      const payload = { name: name || item.name, ...(hasCode && code ? { short_code: code } : {}) };
      const res = await logic.update(item.id, payload);
      if (res.ok) updated++; else skipped++;
    }
    setBulkEditText('');
    toast.push(`${updated} updated.${skipped ? ` ${skipped} skipped.` : ''}`, updated ? 'success' : 'info');
    onChanged?.();
  };

  const doBulkDelete = async () => {
    const lines = bulkDelText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { toast.push('Paste at least one name or code.', 'error'); return; }
    const toDelete = propItems.filter((x) => lines.includes(x.name) || lines.includes(x.short_code));
    if (!toDelete.length) { toast.push('No matching items found.', 'error'); return; }
    if (!confirm(`Delete ${toDelete.length} item(s)?`)) return;
    for (const item of toDelete) await logic.remove(item.id);
    setBulkDelText('');
    toast.push(`${toDelete.length} deleted.`, 'success'); onChanged?.();
  };

  /* ---- pick selected item for edit ---- */
  const onSelectEdit = (id) => {
    setEditId(id);
    const item = propItems.find((x) => x.id === id);
    if (item) { setEditName(item.name); setEditCode(item.short_code || ''); setEditStatus(item.status || 'Active'); }
  };

  /* ---- render tab content ---- */
  const renderTabContent = () => {
    switch (tab) {
      case 'single-add': return (
        <>
          <div className="em-form-grid">
            <div>
              <div className="em-field-label"><span>Case Type Name</span><span className="required-star">*</span></div>
              <div className="em-input-icon">
                <span className="em-input-icon__ico"><Icon name="notes" size={15} /></span>
                <Input className="input" value={newName} placeholder="e.g., Civil" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
              </div>
              <div className="em-field-hint">Enter the full name of the {title.toLowerCase().replace(/s$/, '')}</div>
            </div>
            {hasCode && (
              <div>
                <div className="em-field-label"><span>Short Code</span><span className="required-star">*</span></div>
                <div className="em-input-icon">
                  <span className="em-input-icon__ico" style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy-600)' }}>Aa</span>
                  <Input className="input" value={newCode} placeholder="e.g., CIV" onChange={(e) => setNewCode(e.target.value.toUpperCase().slice(0, 10))} onKeyDown={(e) => e.key === 'Enter' && add()} />
                </div>
                <div className="em-field-hint">Short code or abbreviation (max 10 characters)</div>
              </div>
            )}
            {hasCode && (
              <div>
                <div className="em-field-label"><span>Status</span><span className="required-star">*</span></div>
                <div className="em-select-wrapper">
                  <span className="em-select-status-dot" style={{ background: newStatus === 'Active' ? 'var(--green)' : 'var(--text-faint)' }} />
                  <Select className="select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option>Active</option>
                    <option>Inactive</option>
                  </Select>
                </div>
                <div className="em-field-hint">Select status for this {title.toLowerCase().replace(/s$/, '')}</div>
              </div>
            )}
            {hasCode && (
              <div>
                <div className="em-field-label"><span>Description</span> <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(Optional)</span></div>
                <div className="em-input-icon">
                  <span className="em-input-icon__ico" style={{ top: 14, transform: 'none' }}><Icon name="file" size={15} /></span>
                  <textarea
                    className="textarea"
                    style={{ paddingLeft: 38, minHeight: 90, resize: 'vertical' }}
                    value={newDesc}
                    placeholder={`Enter a brief description about this ${title.toLowerCase().replace(/s$/, '')}...`}
                    maxLength={250}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
                <div className="em-field-hint" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Maximum 250 characters</span>
                  <span>{newDesc.length} / 250</span>
                </div>
              </div>
            )}
          </div>
          <div className="em-form-actions">
            <Button icon="plus" onClick={add}>Add {title.replace(/s$/, '')}</Button>
          </div>
        </>
      );

      case 'single-edit': return (
        <>
          <div className="em-form-grid">
            <div className="em-form-full">
              <div className="em-field-label"><span>Select {title.replace(/s$/, '')} to Edit</span><span className="required-star">*</span></div>
              <Select className="select" value={editId} onChange={(e) => onSelectEdit(e.target.value)}>
                <option value="">— choose one —</option>
                {propItems.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}{hasCode && item.short_code ? ` (${item.short_code})` : ''}</option>
                ))}
              </Select>
            </div>
            {editId && (
              <>
                <div>
                  <div className="em-field-label"><span>Name</span><span className="required-star">*</span></div>
                  <Input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                {hasCode && (
                  <div>
                    <div className="em-field-label">Short Code</div>
                    <Input className="input" value={editCode} onChange={(e) => setEditCode(e.target.value.toUpperCase().slice(0, 10))} />
                  </div>
                )}
                {hasCode && (
                  <div>
                    <div className="em-field-label">Status</div>
                    <div className="em-select-wrapper">
                      <span className="em-select-status-dot" style={{ background: editStatus === 'Active' ? 'var(--green)' : 'var(--text-faint)' }} />
                      <Select className="select" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                        <option>Active</option>
                        <option>Inactive</option>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          {editId && (
            <div className="em-form-actions">
              <Button icon="check" onClick={saveEdit}>Save Changes</Button>
            </div>
          )}
        </>
      );

      case 'single-delete': return (
        <>
          <div style={{ marginBottom: 20 }}>
            <div className="em-field-label"><span>Select {title.replace(/s$/, '')} to Delete</span><span className="required-star">*</span></div>
            <Select className="select" value={delId} onChange={(e) => setDelId(e.target.value)}>
              <option value="">— choose one —</option>
              {propItems.map((item) => (
                <option key={item.id} value={item.id}>{item.name}{hasCode && item.short_code ? ` (${item.short_code})` : ''}</option>
              ))}
            </Select>
            {delId && (
              <div style={{ marginTop: 14, padding: '12px 16px', background: 'var(--red-soft)', border: '1px solid #f5c6c4', borderRadius: 10, fontSize: 13, color: 'var(--red)' }}>
                <strong>Warning:</strong> This action cannot be undone.
              </div>
            )}
          </div>
          {delId && (
            <div className="em-form-actions">
              <Button variant="danger" icon="trash" onClick={doDelete}>Delete {title.replace(/s$/, '')}</Button>
            </div>
          )}
        </>
      );

      case 'bulk-add': return (
        <>
          <div style={{ marginBottom: 6 }}>
            <div className="em-field-label">
              {hasCode ? `Paste entries — one per line as Name:CODE` : `Paste names — one per line`}
            </div>
            <Textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={hasCode
                ? `Civil Suit:CIV\nCriminal Case:CRL\nWrit Petition:WP`
                : `Supreme Court of India\nHigh Court\nDistrict & Sessions Court`}
              rows={8}
            />
          </div>
          <div className="em-form-actions">
            <Button icon="plus" onClick={addBulk}>Add All</Button>
          </div>
        </>
      );

      case 'bulk-edit': return (
        <>
          <div style={{ marginBottom: 6 }}>
            <div className="em-field-label">
              Format: <code style={{ fontSize: 12, background: 'var(--bg)', padding: '1px 6px', borderRadius: 5 }}>OldName|NewName{hasCode ? ':NEWCODE' : ''}</code> — one per line
            </div>
            <Textarea
              value={bulkEditText}
              onChange={(e) => setBulkEditText(e.target.value)}
              placeholder={hasCode ? `Civil Suit|Civil Matter:CIV\nCriminal Case|Criminal:CRL` : `Old Name|New Name\nAnother Old|Another New`}
              rows={8}
            />
          </div>
          <div className="em-form-actions">
            <Button icon="check" onClick={saveBulkEdit}>Save All Changes</Button>
          </div>
        </>
      );

      case 'bulk-delete': return (
        <>
          <div style={{ marginBottom: 6 }}>
            <div className="em-field-label">Paste names{hasCode ? ' or short codes' : ''} to delete — one per line</div>
            <Textarea
              value={bulkDelText}
              onChange={(e) => setBulkDelText(e.target.value)}
              placeholder={hasCode ? `Civil Suit\nCIV\nCriminal Case` : `Court Name 1\nCourt Name 2`}
              rows={8}
            />
            <div style={{ marginTop: 10, padding: '12px 16px', background: 'var(--red-soft)', border: '1px solid #f5c6c4', borderRadius: 10, fontSize: 13, color: 'var(--red)' }}>
              <strong>Warning:</strong> All matched items will be permanently deleted.
            </div>
          </div>
          <div className="em-form-actions">
            <Button variant="danger" icon="trash" onClick={doBulkDelete}>Delete All Matched</Button>
          </div>
        </>
      );

      case 'import': return (
        <>
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ width: 56, height: 56, background: 'var(--brand-soft)', borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, color: 'var(--navy-600)' }}>
              <Icon name="upload" size={24} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Import from CSV</div>
            <div style={{ color: 'var(--text-soft)', fontSize: 13, marginBottom: 20 }}>
              {hasCode ? 'CSV columns: name, short_code, status (optional)' : 'CSV columns: name'}
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => setImportFile(e.target.files[0])} />
              <span className="btn btn--ghost">{importFile ? importFile.name : 'Choose CSV file'}</span>
            </label>
            {importFile && (
              <div style={{ marginTop: 18 }}>
                <Button icon="upload" onClick={() => toast.push('CSV import coming soon.', 'info')}>Import</Button>
              </div>
            )}
          </div>
        </>
      );

      default: return null;
    }
  };

  const tipTexts = {
    'single-add': `Use meaningful ${title.toLowerCase()} names and short codes for better organization and quick identification.`,
    'single-edit': `Editing a ${title.toLowerCase().replace(/s$/, '')} name updates it across all associated cases.`,
    'single-delete': `Deleting removes the ${title.toLowerCase().replace(/s$/, '')} permanently. Ensure no active cases are using it first.`,
    'bulk-add': hasCode ? `Format each line as Name:CODE — e.g. "Civil Suit:CIV". Short codes should be uppercase abbreviations.` : `Enter one ${title.toLowerCase().replace(/s$/, '')} name per line. Blank lines are ignored.`,
    'bulk-edit': `Match by the current name or short code, then provide the new values after the pipe character.`,
    'bulk-delete': `Only exact name or code matches will be deleted. Double-check entries before proceeding.`,
    'import': `CSV files must have a header row. Columns: name${hasCode ? ', short_code, status' : ''}.`,
  };

  const subtitles = {
    'single-add': `Add a new ${title.toLowerCase().replace(/s$/, '')} to your practice.`,
    'single-edit': `Edit an existing ${title.toLowerCase().replace(/s$/, '')}.`,
    'single-delete': `Remove a ${title.toLowerCase().replace(/s$/, '')} from your practice.`,
    'bulk-add': `Add multiple ${title.toLowerCase()} at once.`,
    'bulk-edit': `Update multiple ${title.toLowerCase()} in one operation.`,
    'bulk-delete': `Remove multiple ${title.toLowerCase()} in one operation.`,
    'import': `Import ${title.toLowerCase()} from a CSV file.`,
  };

  return (
    <Modal
      open={open}
      title={`Manage ${title}`}
      subtitle={subtitles[tab]}
      onClose={onClose}
      size="lg"
    >
      {/* Operation tabs */}
      <div className="em-op-tabs">
        {TABS.map((t, i) => {
          const prev = TABS[i - 1];
          const showDivider = prev && t.group !== prev.group;
          return (
            <React.Fragment key={t.key}>
              {showDivider && <div className="em-op-tab-divider" />}
              <button
                className={`em-op-tab${t.danger ? ' em-op-tab--danger' : ''}${t.import ? ' em-op-tab--import' : ''}${tab === t.key ? ' active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <Icon name={t.icon} size={14} />
                {t.label}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Tab content */}
      {renderTabContent()}

      {/* Tip box */}
      <div className="em-tip-box">
        <div className="em-tip-icon">
          <Icon name="bolt" size={17} />
        </div>
        <div className="em-tip-text">
          <strong>Tip</strong>
          <span>{tipTexts[tab]}</span>
        </div>
      </div>
    </Modal>
  );
}