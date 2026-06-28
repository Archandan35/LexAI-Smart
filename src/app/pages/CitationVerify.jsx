import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import GuardrailBanner from '@/components/GuardrailBanner.jsx';
import CitationCard from '@/components/CitationCard.jsx';
import { Field, Input } from '@/components/Field.jsx';
import { citationLogic } from '@/logic/citationLogic.js';
import { VERIFICATION_STATUS, MESSAGES } from '@/constants/messages.js';

const CHECKS = [
  { key: 'judgmentExists', label: 'Judgment exists' },
  { key: 'citationExists', label: 'Citation exists' },
  { key: 'paragraphExists', label: 'Paragraph exists' },
  { key: 'sourceExists', label: 'Source exists' },
];

export default function CitationVerify() {
  const [citation, setCitation] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const onVerify = async () => {
    setBusy(true);
    const res = await citationLogic.verify(citation);
    setBusy(false);
    setResult(res.ok ? res.data : { status: VERIFICATION_STATUS.NOT_FOUND, error: res.error, checks: {} });
  };

  const verified = result?.status === VERIFICATION_STATUS.VERIFIED;

  return (
    <div className="fade-in">
      <PageHeader
        icon="shield"
        title="Citation Verification Engine"
        subtitle="Confirm that a judgment, citation, paragraph and source actually exist against an authoritative provider before you rely on it."
      />
      <GuardrailBanner text="Verification is the safeguard against hallucinated authorities. Unverified citations must never be cited in court." />

      <div className="grid-sidebar">
        <Card title="Verify a Citation">
          <Field label="Citation" hint="Paste the full citation, e.g. Kesavananda Bharati v. State of Kerala, (1973) 4 SCC 225">
            <Input value={citation} onChange={(e) => setCitation(e.target.value)} placeholder="Party v. Party, (Year) Vol Reporter Page" />
          </Field>
          <Button icon="shield" loading={busy} onClick={onVerify} className="btn--block">Verify</Button>

          <div className="citation-verify__checks">
            {CHECKS.map((c) => {
              const passed = result?.checks?.[c.key];
              return (
                <div key={c.key} className="citation-verify__check-row">
                  <span className="citation-verify__check-icon"
                    style={{
                      background: result ? (passed ? 'var(--green-soft)' : 'var(--red-soft)') : 'var(--surface-2)',
                      color: passed ? 'var(--green)' : 'var(--red)',
                    }}>
                    <Icon name={result ? (passed ? 'check' : 'close') : 'alert'} size={13} />
                  </span>
                  <span className="citation-verify__check-label">{c.label}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <div>
          {!result && (
            <Card><div className="alert alert--info"><Icon name="shield" size={18} /> Enter a citation to verify its authenticity.</div></Card>
          )}
          {result && (
            <>
              <div className={`alert ${verified ? 'alert--success' : 'alert--danger'} alert--mb`}>
                <Icon name={verified ? 'check' : 'alert'} size={18} />
                <div>
                  <strong>{verified ? 'Verified authority' : MESSAGES.noPrecedent}</strong>
                  <div className="citation-verify__result-sub">
                    {verified
                      ? 'This judgment exists in the authoritative index and is safe to rely on.'
                      : 'No matching judgment was found. Do not cite this — it may be fabricated or mis-stated.'}
                  </div>
                </div>
              </div>
              {verified && result.judgment && <CitationCard item={{ ...result.judgment, verification: 'verified' }} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
