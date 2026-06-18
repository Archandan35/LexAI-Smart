import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import Badge from '@/components/Badge.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Spinner from '@/components/Spinner.jsx';
import { Field, Textarea } from '@/components/Field.jsx';
import { strategyLogic } from '@/logic/strategyLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

// Litigation Strategy Engine — flags threshold defences & structural defects.
export default function StrategyEngine() {
  const toast = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setBusy(true);
    const res = await strategyLogic.analyze({ text });
    setBusy(false);
    if (!res.ok) { toast.push(res.error, 'error'); return; }
    setResult(res.data);
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="target"
        title="Litigation Strategy Engine"
        subtitle="Identify Limitation, Estoppel, Res Judicata, Non-Joinder, Jurisdiction and Cause-of-Action defects to shape your strategy."
      />

      <div className="grid-sidebar">
        <Card title="Case / Pleadings Text">
          <Field label="Paste pleadings, facts or the opposing case">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 260 }} placeholder="Paste the case material to assess threshold defences…" />
          </Field>
          <Button icon="target" loading={busy} onClick={run} className="btn--block">Run Strategy Analysis</Button>
        </Card>

        <div>
          {busy && <Spinner label="Assessing threshold defences…" />}
          {!busy && !result && <Card><EmptyState icon="target" title="No analysis yet." hint="Paste case text to identify defences & defects." /></Card>}
          {!busy && result && (
            <>
              <div className="alert alert--info" style={{ marginBottom: 16 }}>
                <Icon name="bolt" size={16} />
                <div><strong>{result.triggeredCount}</strong> threshold issue(s) flagged.</div>
              </div>
              {result.flags.map((f) => (
                <div key={f.id} className="card" style={{ marginBottom: 12, borderLeft: `4px solid ${f.triggered ? 'var(--red)' : 'var(--green)'}` }}>
                  <div className="card__body" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <strong style={{ fontSize: 14 }}>{f.label}</strong>
                      <Badge tone={f.triggered ? 'red' : 'green'} dot>{f.triggered ? 'Flagged' : 'Clear'}</Badge>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 7 }}>{f.note}</div>
                    {f.evidence.length > 0 && (
                      <div style={{ marginTop: 10, borderTop: '1px dashed var(--border)', paddingTop: 10 }}>
                        {f.evidence.map((e, i) => (
                          <div key={i} style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 4 }}>“{e}”</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <Card title="Recommended Strategy" className="card--hover">
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.8 }}>
                  {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
