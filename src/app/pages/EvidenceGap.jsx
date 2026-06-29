import { useState } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import Badge from '@/components/Badge.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import { Field, Input, Textarea } from '@/components/Field.jsx';
import { evidenceLogic } from '@/logic/evidenceLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

// Evidence Gap Analyzer — maps claims to supporting evidence, surfaces gaps.
export default function EvidenceGap() {
  const toast = useToast();
  const [claimsText, setClaimsText] = useState('');
  const [evidence, setEvidence] = useState([{ label: '', description: '' }]);
  const [result, setResult] = useState(null);

  const addEvidence = () => setEvidence([...evidence, { label: '', description: '' }]);
  const updateEvidence = (i, k, v) => setEvidence(evidence.map((e, idx) => (idx === i ? { ...e, [k]: v } : e)));
  const removeEvidence = (i) => setEvidence(evidence.filter((_, idx) => idx !== i));

  const analyze = () => {
    const claims = claimsText.split('\n').map((s) => s.trim()).filter(Boolean);
    const items = evidence.filter((e) => e.label.trim());
    const res = evidenceLogic.analyze({ claims, evidenceItems: items });
    if (!res.ok) { toast.push(res.error, 'error'); return; }
    setResult(res.data);
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="layers"
        title="Evidence Gap Analyzer"
        subtitle="Match each pleaded claim to the evidence on record and identify where supporting proof is missing."
      />

      <div className="grid-sidebar">
        <div className="flex-col gap-16">
          <Card title="Claims" sub="One claim per line">
            <Textarea value={claimsText} onChange={(e) => setClaimsText(e.target.value)} className="evidence-gap__claims-textarea"
              placeholder={'Plaintiff is owner of Plot No. 47\nDefendant received Rs. 8,40,000\nGoods were delivered on time'} />
          </Card>
          <Card title="Evidence on Record" actions={<Button size="sm" variant="ghost" icon="plus" onClick={addEvidence}>Add</Button>}>
            {evidence.map((e, i) => (
              <div key={i} className="evidence-gap__evidence-row">
                <div className="flex-1">
                  <Input value={e.label} onChange={(ev) => updateEvidence(i, 'label', ev.target.value)} placeholder={`Exhibit / Document ${i + 1}`} />
                  <Input className="mt-6" value={e.description} onChange={(ev) => updateEvidence(i, 'description', ev.target.value)} placeholder="What it proves (keywords)" />
                </div>
                <button className="btn btn--danger btn--sm mt-4" onClick={() => removeEvidence(i)}><Icon name="trash" size={13} /></button>
              </div>
            ))}
            <Button icon="layers" onClick={analyze} className="btn--block">Analyze Evidence Gaps</Button>
          </Card>
        </div>

        <div>
          {!result && <Card><EmptyState icon="layers" title="No analysis yet." hint="Add claims & evidence, then analyze." /></Card>}
          {result && (
            <>
              <div className="stat-grid evidence-gap__stat-grid">
                <div className="stat-card"><div className="stat-card__value">{result.total}</div><div className="stat-card__label">Claims</div></div>
                <div className="stat-card"><div className="stat-card__value evidence-gap__stat--green">{result.total - result.gaps}</div><div className="stat-card__label">Supported</div></div>
                <div className="stat-card"><div className="stat-card__value evidence-gap__stat--red">{result.gaps}</div><div className="stat-card__label">Gaps</div></div>
              </div>
              <Card title="Claim-by-Claim Mapping" className="mt-4">
                <table className="table">
                  <thead><tr><th>Claim</th><th>Supporting Evidence</th><th>Status</th></tr></thead>
                  <tbody>
                    {result.rows.map((r, i) => (
                      <tr key={i}>
                        <td className="evidence-gap__claim-cell">{r.claim}</td>
                        <td>{r.supporting.length ? r.supporting.map((s) => <span key={s} className="tag tag--key">{s}</span>) : <span className="evidence-gap__suggestion">{r.suggestion}</span>}</td>
                        <td><Badge tone={r.missing ? 'red' : 'green'} dot>{r.missing ? 'Gap' : 'Proven'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

