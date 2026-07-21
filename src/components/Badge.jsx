import { memo } from 'react';
import { getBadgeColors, fixedToneFor } from '../utils/badgeColors.js';

const Badge = memo(function Badge({ children, tone, dot, blink, style: externalStyle }) {
  const key = fixedToneFor(children) || tone;
  const c = getBadgeColors(key);
  return (
    <span
      className="badge badge--dyn"
      style={{
        '--bd-bg': c.bg,
        '--bd-color': c.text,
        '--bd-border': c.border,
        ...externalStyle,
      }}
    >
      {dot && <span className={`dot sync__dot--dyn${blink ? ' badge__dot--blink' : ''}`} style={{ '--dot-bg': c.text }} />}
      {children}
    </span>
  );
});

export default Badge;
