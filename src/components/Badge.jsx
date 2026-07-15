import { getBadgeColors, fixedToneFor } from '../utils/badgeColors.js';

// Single reusable badge. Background is a light tint of the color and text is a
// dark shade of the same color family. Active is always green, Inactive is
// always red, no matter which tone the caller passes.
export default function Badge({ children, tone, dot, blink, style: externalStyle }) {
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
}
