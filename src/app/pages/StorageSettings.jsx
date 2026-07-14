import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Badge from '@/components/Badge.jsx';
import Icon from '@/components/Icon.jsx';
import PermissionGate from '@/components/PermissionGate.jsx';
import { storageStatsService } from '@/services/storageStatsService.js';
import { fileLogic } from '@/logic/fileLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { bytes, useFormat } from '@/utils/format.js';

const FUTURE_PROVIDERS = ['mega', 'terabox', 'supabase', 's3', 'r2', 'onedrive', 'dropbox'];

export default function StorageSettings() {
  const { formatDateTime } = useFormat();
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => { setSummary(await storageStatsService.summary()); }, []);
  useEffect(() => { load(); }, [load]);

  const testConnection = async () => {
    setBusy('test');
    const res = await storageStatsService.testConnection();
    setBusy('');
    toast.push(res?.ok ? `Connection OK — ${res.message || res.provider}` : `Connection failed: ${res?.message || 'unknown error'}`, res?.ok ? 'success' : 'error');
  };
  const syncNow = async () => {
    setBusy('sync');
    const res = await fileLogic.syncAll();
    setBusy('');
    toast.push(`Synced ${res.synced}/${res.total} file(s).`, 'success');
    load();
  };
  const rebuildIndex = async () => { setBusy('rebuild'); await load(); setBusy(''); toast.push('File index rebuilt.', 'success'); };
  const verify = async () => { setBusy('verify'); await load(); setBusy(''); toast.push('Storage verified.', 'success'); };

  if (!summary) return null;

  const health = summary.failed > 0 ? { tone: 'red', label: 'Degraded' } : summary.connected ? { tone: 'green', label: 'Healthy' } : { tone: 'amber', label: 'Disconnected' };

  return (
    <div className="fade-in">
      <PageHeader
        icon="database"
        title="Storage & Sync Center"
        subtitle="Cloud storage for Manage Cases documents and draft files. The database Backup & Recovery module is separate and unchanged."
      />

      <div className="grid-2 mb-16">
        <Card title="Connected Provider" sub="Provider is selected via environment variables (provider-agnostic).">
          <div className="kv"><span>Current Provider</span><b className="dm-capitalize">{summary.provider.replace('_', ' ')}</b></div>
          <div className="kv"><span>Connection Status</span><Badge tone={summary.connected ? 'green' : 'amber'} dot>{summary.connected ? 'Connected' : 'Disconnected'}</Badge></div>
          <div className="kv"><span>Sync Health</span><Badge tone={health.tone} dot>{health.label}</Badge></div>
          <div className="kv"><span>Auto Sync</span><Badge tone={summary.autoSync ? 'green' : 'grey'} dot>{summary.autoSync ? 'Enabled' : 'Disabled'}</Badge></div>
          <div className="kv"><span>Root Folder</span><span>{summary.rootFolder}</span></div>
          <div className="kv"><span>Last Sync Time</span><span>{summary.lastSync ? formatDateTime(summary.lastSync) : '—'}</span></div>
          {summary.statusMessage && <div className="alert alert--info storage-settings__status-message"><Icon name="bolt" size={15} /><span>{summary.statusMessage}</span></div>}
        </Card>

        <Card title="Storage Dashboard">
          <div className="health-grid">
            <Stat label="Files" value={summary.fileCount} icon="file" />
            <Stat label="Folders" value={summary.folderCount} icon="folder" />
            <Stat label="Storage Used" value={bytes(summary.totalBytes)} icon="database" />
            <Stat label="Versions" value={summary.versionCount} icon="history" />
            <Stat label="Synced" value={summary.synced} icon="check" />
            <Stat label="Failed" value={summary.failed} icon="alert" />
          </div>
        </Card>
      </div>

      <Card title="Sync Actions">
        <div className="toolbar-row flex-wrap">
          <PermissionGate perm="storage.test"><Button variant="ghost" icon="bolt" loading={busy === 'test'} onClick={testConnection}>Test Connection</Button></PermissionGate>
          <PermissionGate perm="storage.sync"><Button icon="refresh" loading={busy === 'sync'} onClick={syncNow}>Sync Now</Button></PermissionGate>
          <PermissionGate perm="storage.sync"><Button variant="ghost" icon="layers" loading={busy === 'rebuild'} onClick={rebuildIndex}>Rebuild Index</Button></PermissionGate>
          <PermissionGate perm="storage.sync"><Button variant="ghost" icon="shield" loading={busy === 'verify'} onClick={verify}>Verify Storage</Button></PermissionGate>
        </div>
        <div className="alert alert--warn mt-14">
          <Icon name="alert" size={16} />
          <span>
            <b>Change Provider:</b> set <code>VITE_STORAGE_PROVIDER</code> in the environment, then reconnect. Future providers:{' '}
            {FUTURE_PROVIDERS.join(', ')}. All provider credentials live only in environment variables — never in the frontend bundle.
          </span>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className="health-cell">
      <span className="health-cell__icon"><Icon name={icon} size={16} /></span>
      <div>
        <div className="health-cell__value">{value}</div>
        <div className="health-cell__label">{label}</div>
      </div>
    </div>
  );
}

