import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { Input, Select, Textarea } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';

export default function CustomReports() {
  const toast = useToast();
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('cases');

  const handleGenerate = () => {
    if (!reportName.trim()) { toast.push('Report name is required.', 'error'); return; }
    toast.push('Report generation started. You will be notified when ready.', 'success');
  };

  return (
    <div className="fade-in">
      <PageHeader icon="file" title="Custom Reports" subtitle="Build and generate custom reports." />

      <div className="grid-2">
        <Card title="Report Builder">
          <div className="field">
            <label className="field__label">Report Name</label>
            <Input value={reportName} placeholder="e.g. Q2 2026 Case Summary" onChange={(e) => setReportName(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Report Type</label>
            <Select value={reportType} onChange={(e) => setReportType(e.target.value)}
              options={[
                { value: 'cases', label: 'Case Report' },
                { value: 'courts', label: 'Court Report' },
                { value: 'users', label: 'User Activity' },
                { value: 'ai', label: 'AI Usage Report' },
              ]}
            />
          </div>
          <div className="field">
            <label className="field__label">Description</label>
            <Textarea placeholder="Describe what this report should contain…" rows={4} />
          </div>
          <button className="btn btn--primary" onClick={handleGenerate}>
            <Icon name="file" size={15} /> Generate Report
          </button>
        </Card>
        <Card title="Saved Reports">
          <div className="empty" style={{ padding: '40px 20px' }}>
            <div className="empty__icon"><Icon name="file" size={24} /></div>
            <p className="muted">No saved reports yet. Generate your first report.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
