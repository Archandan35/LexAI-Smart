import React, { useEffect, useState } from 'react';
import { HealthAnalyzer } from '@/services/setup/HealthAnalyzer.js';
import { DatabaseScanner } from '@/services/setup/DatabaseScanner.js';
import { VerificationEngine } from '@/services/setup/VerificationEngine.js';
import StatusBadge from '../wizard/StatusBadge.jsx';
import Button from '@/components/Button.jsx';

function ScoreRing({ score, label, color }) {
  const r = 36; const circ = 2 * Math.PI * r; const offset = circ - (score / 100) * circ;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={90} height={90} viewBox="0 0 90 90">
        <circle cx={45} cy={45} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle cx={45} cy={45} r={r} fill="none" stroke={color || 'var(--brand)'} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 45 45)" strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s var(--ease)' }} />
        <text x={45} y={45} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={800} fill="var(--text)">{score}</text>
      </svg>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', marginTop: 2 }}>{label}</div>
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
    return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /><p style={{ marginTop: 16, color: 'var(--text-soft)' }}>Analyzing health...</p></div>;
  }

  return (
    <div>
      <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 20 }}>Database health report</p>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <ScoreRing score={health.overallScore} label="Overall" color="var(--brand)" />
        <ScoreRing score={health.installationScore} label="Installation" color={health.installationScore >= 80 ? 'var(--green)' : 'var(--amber)'} />
        <ScoreRing score={health.securityScore} label="Security" color="var(--green)" />
        <ScoreRing score={health.performanceScore} label="Performance" color="var(--green)" />
      </div>
      {health.warnings.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--amber)' }}>Warnings</h4>
          {health.warnings.map((w, i) => <div key={i} style={{ padding: '6px 10px', background: 'var(--amber-soft)', borderRadius: 6, fontSize: 13, marginBottom: 4 }}>{w}</div>)}
        </div>
      )}
      {health.recommendations.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--brand)' }}>Recommendations</h4>
          {health.recommendations.map((r, i) => <div key={i} style={{ padding: '6px 10px', background: 'var(--brand-soft)', borderRadius: 6, fontSize: 13, marginBottom: 4 }}>{r}</div>)}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button variant="primary" onClick={() => onComplete(health)}>Finish</Button>
      </div>
    </div>
  );
}
