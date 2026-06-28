import Button from '@/components/Button.jsx';
import StatusBadge from '../wizard/StatusBadge.jsx';

export default function PlanStep({ scanResult, onPlanned, back }) {
  const missing = scanResult?.missing || [];
  const present = scanResult?.present || [];
  const total = missing.length + present.length;

  const sections = [
    { title: 'Existing Components', status: 'ok', items: present, count: present.length },
    { title: 'Missing Components', status: 'fail', items: missing, count: missing.length },
  ];

  return (
    <div>
      <p className="wizard-desc">
        Installation plan generated. {total} total component(s) in the blueprint.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sections.map(s => (
          <div key={s.title} className="wizard-section-card">
            <div className="wizard-section-card__head">
              <span className="wizard-section-card__title">{s.title}</span>
              <StatusBadge status={s.status} label={`${s.count} item(s)`} />
            </div>
            {s.items.length > 0 && (
              <div className="wizard-section-card__body">
                {s.items.map(i => <span key={i} className="tag">{i}</span>)}
              </div>
            )}
            {s.items.length === 0 && (
              <div className="wizard-section-card__empty">None</div>
            )}
          </div>
        ))}
      </div>
      <div className="wizard-actions" style={{ marginTop: 24 }}>
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button variant="primary" onClick={() => onPlanned(scanResult)}>
          {missing.length > 0 ? 'Continue to Review' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
