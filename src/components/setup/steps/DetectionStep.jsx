import { ConnectionManager } from '@/services/setup/ConnectionManager.js';
import StatusBadge from '../wizard/StatusBadge.jsx';

export default function DetectionStep({ onDetected, back }) {
  const [detecting, setDetecting] = useState(true);
  const [env, setEnv] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await ConnectionManager.collectEnvironment();
      if (!active) return;
      setEnv(result);
      setDetecting(false);
      if (result.provider !== 'unknown') {
        setTimeout(() => onDetected(result), 1000);
      } else {
        setError('Could not detect provider');
      }
    })();
    return () => { active = false; };
  }, []);

  if (detecting) {
    return (
      <div className="wizard-center wizard-center--lg">
        <div className="spinner" />
        <p className="wizard-loading-text">Detecting environment...</p>
      </div>
    );
  }

  const cards = [
    { label: 'Provider', value: env?.provider || '—', status: env?.provider !== 'unknown' ? 'ok' : 'warn' },
    { label: 'Schema Version', value: `v${env?.version || '?'}`, status: 'info' },
    { label: 'Extensions', value: env?.extensions?.length ? `${env.extensions.length} installed` : 'None detected', status: env?.extensions?.length ? 'ok' : 'info' },
    { label: 'Schemas', value: env?.schemas?.length ? `${env.schemas.length} available` : 'None', status: env?.schemas?.length ? 'ok' : 'info' },
  ];

  return (
    <div>
      <p className="wizard-desc">Environment detected. Review the details below.</p>
      {error && <div className="wizard-alert-box wizard-alert-box--red wizard-alert-box--sm wizard-alert-box--mb">{error}</div>}
      <div className="wizard-info-grid">
        {cards.map(c => (
          <div key={c.label} className="wizard-info-card">
            <div className="wizard-info-card__label">{c.label}</div>
            <div className="wizard-info-card__row">
              <span className="wizard-info-card__value">{c.value}</span>
              <StatusBadge status={c.status} size="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
