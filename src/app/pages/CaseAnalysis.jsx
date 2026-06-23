import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import FileDrop from '@/components/FileDrop.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Spinner from '@/components/Spinner.jsx';
import { Field, Textarea, Select } from '@/components/Field.jsx';
import { caseAnalysisLogic } from '@/logic/caseAnalysisLogic.js';
import { fileLogic } from '@/logic/fileLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

const DOC_TYPES = [
  { id: 'plaint', label: 'Plaint' },
  { id: 'written_statement', label: 'Written Statement' },
  { id: 'counter_claim', label: 'Counter Claim' },
  { id: 'order', label: 'Order / Judgment' },
];

const SECTIONS = [
  { key: 'weaknesses', label: 'Weaknesses', icon: 'alert', tone: 'amber' },
  { key: 'contradictions', label: 'Contradictions', icon: 'bolt', tone: 'red' },
  { key: 'admissions', label: 'Admissions', icon: 'check', tone: 'navy' },
  { key: 'missingPleadings', label: 'Missing Pleadings', icon: 'file', tone: 'amber' },
  { key: 'limitationIssues', label: 'Limitation Issues', icon: 'clock', tone: 'red' },
  { key: 'jurisdictionIssues', label: 'Jurisdiction Issues', icon: 'target', tone: 'red' },
];

export default function CaseAnalysis() {
  const toast = useToast();
  const [type, setType] = useState('plaint');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const onFile = async (file) => {
    toast.push('Extracting text…', 'info');
    const { text: extracted } = await fileLogic.extract(file);
    setText(extracted);
    toast.push('Text extracted. Review & analyze.', 'success');
  };

  const analyze = async () => {
    setBusy(true);
    const res = await caseAnalysisLogic.analyze({ text, type });
    setBusy(false);
    if (!res.ok) { toast.push(res.error, 'error'); return; }
    setResult(res.data);
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="scan"
        title="Case Analysis"
        subtitle="Upload pleadings or orders to detect weaknesses, contradictions, admissions, missing pleadings, and limitation / jurisdiction issues."
      />

      <div className="grid-sidebar">
        <div className="case-analysis__column">
          <Card title="Document">
            <Field label="Document Type">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {DOC_TYPES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </Select>
            </Field>
            <FileDrop onFile={onFile} hint="Upload to auto-extract, or paste below" />
            <Field label="Text" hint="Edit extracted text or paste directly">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} className="case-analysis__textarea" placeholder="Paste the document text…" />
            </Field>
            <Button icon="scan" loading={busy} onClick={analyze} className="btn--block">Analyze Document</Button>
          </Card>
        </div>

        <div>
          {busy && <Spinner label="Analyzing pleadings…" />}
          {!busy && !result && <Card><EmptyState icon="scan" title="No analysis yet." hint="Upload or paste a document, then analyze." /></Card>}
          {!busy && result && (
            <>
              {result.aiSummary && (
                <div className="alert alert--info alert--mb">
                  <Icon name="bolt" size={16} /><div>{result.aiSummary}</div>
                </div>
              )}
              {result.contradictions.length > 0 && (
                <Card title="Contradiction Detection" sub={`${result.contradictions.length} potential internal contradiction(s)`} className="card--hover" >
                  {result.contradictions.map((c, i) => (
                    <div key={i} className="qa-card">
                      <div className="case-analysis__contra-meta">On: <strong>{c.on}</strong></div>
                      <div className="case-analysis__contra-text"><Icon name="arrow" size={12} /> {c.a}</div>
                      <div className="case-analysis__contra-text-b"><Icon name="arrow" size={12} /> {c.b}</div>
                    </div>
                  ))}
                </Card>
              )}
              <div className="grid-2 case-analysis__grid-mt">
                {SECTIONS.filter((s) => s.key !== 'contradictions').map((s) => {
                  const items = result[s.key] || [];
                  return (
                    <Card key={s.key} title={s.label} sub={`${items.length} finding(s)`} className="card--hover">
                      {items.length === 0 ? (
                        <div className="case-analysis__none-detected">
                          <Icon name="check" size={15} /> None detected.
                        </div>
                      ) : (
                        <ul className="case-analysis__findings-list">
                          {items.map((it, i) => <li key={i}>{it}</li>)}
                        </ul>
                      )}
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
