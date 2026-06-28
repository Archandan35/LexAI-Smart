import { HealthAnalyzer } from '@/services/setup/HealthAnalyzer.js';
import { DatabaseScanner } from '@/services/setup/DatabaseScanner.js';
import { VerificationEngine } from '@/services/setup/VerificationEngine.js';
import Button from '@/components/Button.jsx';

function ScoreRing({ score, label, color }) {
  const r = 36; const circ = 2 * Math.PI * r; const offset = circ - (score / 100) * circ;
  return (
    <div className="wizard-score-ring">
      <svg width={90} height={90} viewBox="0 0 90 90">
        <circle cx={45} cy={45} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle cx={45} cy={45} r={r} fill="none" stroke={color || 'var(--brand)'} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 45 45)" strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s var(--ease)' }} />
        <text x={45} y={45} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={800} fill="var(--text)">{score}</text>
      </svg>
      <div className="wizard-score-label">{label}</div>
    </div>
  );
}

export default function HealthReport({ onComplete, back }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const scan = await DatabaseScanner.scan();
      const diff = await DatabaseScanner.diff();
      const v = await VerificationEngine.verify();
      if (!active) return;
      const h = HealthAnalyzer.analyze(scan, diff);
      h.verification = v;
      setHealth(h);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return <div className="wizard-center wizard-center--lg"><div className="spinner" /><p className="wizard-loading-text">Analyzing health...</p></div>;
  }

  return (
    <div>
      <p className="wizard-health-desc">Database health report</p>
      <div className="wizard-score-grid">
        <ScoreRing score={health.overallScore} label="Overall" color="var(--brand)" />
        <ScoreRing score={health.installationScore} label="Installation" color={health.installationScore >= 80 ? 'var(--green)' : 'var(--amber)'} />
        <ScoreRing score={health.securityScore} label="Security" color="var(--green)" />
        <ScoreRing score={health.performanceScore} label="Performance" color="var(--green)" />
      </div>
      {health.warnings.length > 0 && (
        <div className="wizard-health-section">
          <h4 className="wizard-health-title wizard-health-title--amber">Warnings</h4>
          {health.warnings.map((w, i) => <div key={i} className="wizard-health-item wizard-health-item--amber">{w}</div>)}
        </div>
      )}
      {health.recommendations.length > 0 && (
        <div className="wizard-health-section">
          <h4 className="wizard-health-title wizard-health-title--brand">Recommendations</h4>
          {health.recommendations.map((r, i) => <div key={i} className="wizard-health-item wizard-health-item--brand">{r}</div>)}
        </div>
      )}
      <div className="wizard-actions" style={{ marginTop: 20 }}>
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button variant="primary" onClick={() => onComplete(health)}>Finish</Button>
      </div>
    </div>
  );
}
