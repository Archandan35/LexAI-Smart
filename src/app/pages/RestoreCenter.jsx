import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { Input, Select } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';

export default function RestoreCenter() {
  const toast = useToast();
  const [selectedFile, setSelectedFile] = useState('');
  const [restoreType, setRestoreType] = useState('full');

  const handleRestore = () => {
    if (!selectedFile) { toast.push('Please select a backup file to restore.', 'error'); return; }
    toast.push('Restore initiated. This may take a few minutes.', 'info');
  };

  return (
    <div className="fade-in">
      <PageHeader icon="refresh" title="Restore Center" subtitle="Restore the database from a backup file." />

      <Card title="Restore from Backup" className="mb-16">
        <div className="field">
          <label className="field__label">Backup File</label>
          <Select value={selectedFile} onChange={(e) => setSelectedFile(e.target.value)}
            options={[
              { value: '', label: '— Select a backup —' },
              { value: 'backup-2026-06-23.zip', label: 'backup-2026-06-23.zip (2.4 GB)' },
              { value: 'backup-2026-06-22.zip', label: 'backup-2026-06-22.zip (2.3 GB)' },
              { value: 'backup-2026-06-21.zip', label: 'backup-2026-06-21.zip (2.3 GB)' },
            ]}
          />
        </div>
        <div className="field">
          <label className="field__label">Restore Type</label>
          <Select value={restoreType} onChange={(e) => setRestoreType(e.target.value)}
            options={[
              { value: 'full', label: 'Full Restore (all data)' },
              { value: 'schema', label: 'Schema Only' },
              { value: 'data', label: 'Data Only' },
            ]}
          />
        </div>
        <div className="alert alert--warn restore-center__alert-mb">
          <Icon name="alert" size={15} />
          <span>Restoring will overwrite all current data. This action cannot be undone.</span>
        </div>
        <button className="btn btn--danger" onClick={handleRestore}>
          <Icon name="refresh" size={15} /> Start Restore
        </button>
      </Card>

      <Card title="Restore History">
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Backup File</th><th>Type</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr><td>2026-06-20</td><td>backup-2026-06-19.zip</td><td>Full</td><td><span className="badge badge--green">Completed</span></td></tr>
            <tr><td>2026-06-15</td><td>backup-2026-06-14.zip</td><td>Data</td><td><span className="badge badge--green">Completed</span></td></tr>
            <tr><td>2026-06-10</td><td>backup-2026-06-09.zip</td><td>Full</td><td><span className="badge badge--red">Failed</span></td></tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
