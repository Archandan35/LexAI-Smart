import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Spinner from '@/components/Spinner.jsx';
import { Field, Input, Textarea } from '@/components/Field.jsx';
import { crossExaminationLogic } from '@/logic/crossExaminationLogic.js';
import { exportPdf } from '@/utils/exportDoc.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

const BANKS = [
  { key: 'friendly', label: 'Friendly Questions', icon: 'check', color: 'var(--green)' },
  { key: 'admission', label: 'Admission Questions', icon: 'shield', color: 'var(--navy-700)' },
  { key: 'hostile', label: 'Hostile Questions', icon: 'bolt', color: 'var(--red)' },
  { key: 'impeachment', label: 'Impeachment Questions', icon: 'target', color: 'var(--amber)' },
];

export default function CrossExamination() {
  const toast = useToast();
  const [witnessName, setWitnessName] = useState('');
  const [statement, setStatement] = useState('');
  const [tab, setTab] = useState('friendly');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setBusy(true);
    const res = await crossExaminationLogic.generate({ statement, witnessName });
    setBusy(false);
    if (!res.ok) { toast.push(res.error, 'error'); return; }
    setResult(res.data);
  };

  const exportAll = () => {
    if (!result) return;
    const lines = BANKS.flatMap((b) => [
      `\n${b.label.toUpperCase()}`,
      ...result.banks[b.key].map((q, i) => `${i + 1}. ${q.q}  (${q.purpose})`),
    ]);
    exportPdf(`Cross-Examination — ${witnessName || 'Witness'}`, lines.join('\n'));
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="mic"
        title="Cross Examination Studio"
        subtitle="Generate friendly, admission, hostile and impeachment question banks from a witness statement or examination-in-chief."
        actions={result && <Button variant="ghost" icon="download" onClick={exportAll}>Export PDF</Button>}
      />

      <div className="grid-sidebar">
        <Card title="Witness Statement">
          <Field label="Witness Name"><Input value={witnessName} onChange={(e) => setWitnessName(e.target.value)} placeholder="e.g. PW-1 Ramesh Kumar" /></Field>
          <Field label="Statement / Examination-in-Chief">
            <Textarea value={statement} onChange={(e) => setStatement(e.target.value)} style={{ minHeight: 240 }} placeholder="Paste the witness's chief examination or affidavit…" />
          </Field>
          <Button icon="mic" loading={busy} onClick={run} className="btn--block">Generate Question Banks</Button>
        </Card>

        <div>
          {busy && <Spinner label="Preparing cross-examination…" />}
          {!busy && !result && <Card><EmptyState icon="mic" title="No questions yet." hint="Paste a statement to generate question banks." /></Card>}
          {!busy && result && (
            <Card>
              <div className="tabs">
                {BANKS.map((b) => (
                  <div key={b.key} className={`tab ${tab === b.key ? 'active' : ''}`} onClick={() => setTab(b.key)}>
                    {b.label} ({result.banks[b.key].length})
                  </div>
                ))}
              </div>
              {result.banks[tab].length === 0 ? (
                <EmptyState icon="mic" title="No questions in this bank." hint="The statement lacked triggers for this category." />
              ) : result.banks[tab].map((q, i) => (
                <div key={i} className="qa-card">
                  <div className="qa-card__q"><span style={{ color: 'var(--navy-700)', fontWeight: 800 }}>Q{i + 1}.</span> {q.q}</div>
                  <div className="qa-card__p"><Icon name="target" size={12} /> {q.purpose}{q.anchor ? ` · ${q.anchor}` : ''}</div>
                </div>
              ))}
              {result.aiHints && (
                <div className="alert alert--info" style={{ marginTop: 14 }}>
                  <Icon name="bolt" size={16} /><div><strong>Themes:</strong> {result.aiHints}</div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
