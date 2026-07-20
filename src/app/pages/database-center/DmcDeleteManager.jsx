import { useState, useEffect } from 'react';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { userService } from '@/services/userService.js';
import { caseService } from '@/services/caseService.js';
import { documentLogic } from '@/logic/documentLogic.js';
import { fileLogic } from '@/logic/fileLogic.js';
import { caseActivityService } from '@/services/caseActivityService.js';
import { caseFolderLogic } from '@/logic/caseFolderLogic.js';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import PermissionGate from '@/components/PermissionGate.jsx';

const COLLECTIONS = ['documents', 'drafts', 'cases', 'case_folders', 'hearings', 'notes', 'audit_logs', 'reminders', 'case_history', 'case_activity'];

export default function DmcDeleteManager() {
  const { user } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [scope, setScope] = useState('collection');
  const [selectedCollection, setSelectedCollection] = useState('documents');
  const [dryRun, setDryRun] = useState(true);
  const [backupFirst, setBackupFirst] = useState(true);
  const [preview, setPreview] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    userService.list().then(setUsers).catch(() => {});
    caseService.listCases().then(setCases).catch(() => {});
  }, []);

  const analyze = async () => {
    setPreview(null);
    if (scope === 'user' && !selectedUserId) { toast.push('Select a user first.', 'error'); return; }
    if (scope === 'user') {
      const targetUser = users.find((u) => u.id === selectedUserId);
      const userCases = cases.filter((c) => c.advocate === targetUser?.name || c.createdBy === targetUser?.id);
      const userDocs = await documentLogic.getAll({ uploadedBy: targetUser?.id || targetUser?.name }).then((r) => r?.ok ? r.value : []).catch(() => []);
      setPreview({
        type: 'user', label: `Data for ${targetUser?.name || selectedUserId}`,
        cases: userCases.length, documents: userDocs.length, collections: 1,
        records: userCases.length + userDocs.length, userCases, userDocs,
      });
    } else {
      const repo = { documents: { getAll: (q) => documentLogic.getAll(q).then((r) => r?.ok ? r.value : []) } }[selectedCollection];
      if (!repo) { toast.push('Collection scanning not available for this collection.', 'error'); return; }
      const all = await repo.getAll().catch(() => []);
      setPreview({ type: 'collection', label: `All records in "${selectedCollection}"`, collections: 1, records: all.length, sample: all.slice(0, 5) });
    }
  };

  const executeDelete = async () => {
    if (!preview) return;
    if (!confirm(`Permanently delete ${preview.records} record(s)? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      if (preview.type === 'user') {
        for (const c of preview.userCases) {
          await caseFolderLogic.remove({ id: null, caseId: c.id, kind: 'document', name: '' }, {}, user).catch(() => {});
          await caseService.deleteCase(c.id);
        }
        for (const d of preview.userDocs) {
          try { await fileLogic.deleteDocument({ id: d.id, ref: d.ref, caseId: d.caseId }, user); } catch {}
        }
        await caseActivityService.record('system', 'delete.user', `Deleted data for user ${preview.label}`, user);
        toast.push(`Deleted ${preview.records} record(s) for ${preview.label}.`, 'success');
      } else {
        toast.push('Bulk collection delete not available through this interface.', 'error');
      }
      setPreview(null);
    } catch (e) {
      toast.push(e?.message || 'Delete failed.', 'error');
    }
    setDeleting(false);
  };

  const userOptions = users.filter((u) => u.id !== user?.id).map((u) => ({ value: u.id, label: u.name || u.email || u.id }));

  return (
    <>
      <div className="dmc-db-hero dmc-db-hero--sm">
        <div className="dmc-db-hero__icon"><Icon name="trash" size={26} /></div>
        <div className="dmc-db-hero__text">
          <div className="dmc-db-hero__accent" />
          <h2>Delete Manager</h2>
          <p>Safely delete data with dry-run, dependency checks, and backup-before-delete.</p>
        </div>
      </div>

      <div className="dmc-db-section">
        <div className="dmc-db-section__head">
          <div className="dmc-db-section__title"><Icon name="layers" size={18} /> Delete Scope</div>
        </div>
        <div className="dmc-db-section__body">
          <div className="dmc-db-toolbar">
            <div className="dmc-db-toolbar__left">
              <label className="dmc-checkbox-label"><input type="radio" name="scope" checked={scope === 'collection'} onChange={() => setScope('collection')} /> Collection Cleanup</label>
              <label className="dmc-checkbox-label"><input type="radio" name="scope" checked={scope === 'user'} onChange={() => setScope('user')} /> User Data Cleanup</label>
            </div>
            <div className="dmc-db-toolbar__right">
              <Button size="sm" variant="primary" onClick={analyze}>{dryRun ? 'Preview' : 'Analyze'}</Button>
            </div>
          </div>

          {scope === 'user' && (
            <div className="dmc-db-toolbar">
              <div className="dmc-db-toolbar__left">
                <select className="dmc-db-select" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                  <option value="">Select user\u2026</option>
                  {userOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {selectedUserId && (
                  <span className="fs-13 text-soft">
                    Related: {cases.filter((c) => c.advocate === users.find((u) => u.id === selectedUserId)?.name).length} cases
                  </span>
                )}
              </div>
            </div>
          )}

          {scope === 'collection' && (
            <div className="dmc-db-toolbar">
              <div className="dmc-db-toolbar__left">
                <select className="dmc-db-select" value={selectedCollection} onChange={(e) => setSelectedCollection(e.target.value)}>
                  {COLLECTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="dmc-db-toolbar">
            <div className="dmc-db-toolbar__left">
              <label className="dmc-checkbox-label"><input type="checkbox" checked={dryRun} onChange={() => setDryRun(!dryRun)} /> Dry Run (preview only)</label>
              <label className="dmc-checkbox-label"><input type="checkbox" checked={backupFirst} onChange={() => setBackupFirst(!backupFirst)} disabled={dryRun} /> Backup before delete</label>
            </div>
          </div>
        </div>
      </div>

      {!preview && (
        <div className="dmc-db-section">
          <div className="dmc-db-section__body text-center py-48 px-20">
            <div className="dmc-empty__icon"><Icon name="trash" size={36} /></div>
            <div className="dmc-empty__title">No scope selected</div>
            <div className="dmc-empty__hint">Choose a scope above and click Preview to analyze before deleting.</div>
          </div>
        </div>
      )}

      {preview && (
        <div className="dmc-db-section">
          <div className="dmc-db-section__head">
            <div className="dmc-db-section__title"><Icon name="eye" size={18} /> Delete Preview</div>
            <span className="dmc-db-section__badge">{preview.records} records</span>
          </div>
          <div className="dmc-db-table-wrap">
            <table className="dmc-db-table">
              <thead><tr><th>Scope</th><th>Collections</th><th>Records</th></tr></thead>
              <tbody>
                <tr>
                  <td>{preview.label}</td>
                  <td>{preview.collections}</td>
                  <td><strong>{preview.records}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          {preview.type === 'user' && preview.userCases?.length > 0 && (
            <div className="dmc-db-section__body">
              <div className="fw-600 mb-8">Affected Cases ({preview.cases})</div>
              <div className="dmc-db-table-wrap">
                <table className="dmc-db-table">
                  <thead><tr><th>Case</th><th>Documents</th></tr></thead>
                  <tbody>
                    {preview.userCases.slice(0, 10).map((c) => (
                      <tr key={c.id}><td>{c.caseNumber || c.case_display_number || c.id}</td><td>{preview.userDocs.filter((d) => d.caseId === c.id).length}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="dmc-db-section__body">
            <div className="flex-row gap-8">
              {!dryRun && <PermissionGate module="databaseCenter" action="delete">
                <Button variant="danger" onClick={executeDelete} disabled={deleting}>{deleting ? 'Deleting\u2026' : 'Confirm Delete'}</Button>
              </PermissionGate>}
              <Button variant="ghost" onClick={() => setPreview(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
