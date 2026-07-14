// Standard badge color system.
// Every badge derives a light tint background and a dark shade text color from
// a single source color, so text always belongs to the same color family as
// the background. Active is always green, Inactive is always red.

const isHex = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);

// Named tones map to a single base color. Semantic aliases (success, danger,
// info, warn, muted) resolve to the same base as their color counterpart.
const NAMED = {
  green: '#22c55e', success: '#22c55e', active: '#22c55e',
  red: '#ef4444', danger: '#ef4444', inactive: '#ef4444',
  amber: '#f59e0b', warn: '#f59e0b', warning: '#f59e0b',
  yellow: '#eab308',
  orange: '#f97316',
  blue: '#3b82f6', info: '#3b82f6',
  navy: '#1e40af',
  purple: '#8b5cf6', violet: '#8b5cf6',
  pink: '#ec4899',
  teal: '#06b6d4', cyan: '#06b6d4',
  grey: '#6b7280', gray: '#6b7280', muted: '#6b7280', neutral: '#6b7280',
};

const DEFAULT_BASE = '#6b7280';

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      default: h = ((r - g) / d + 4);
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}

function hslToHex({ h, s, l }) {
  h /= 360;
  const hue = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r;
  let g;
  let b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue(p, q, h + 1 / 3);
    g = hue(p, q, h);
    b = hue(p, q, h - 1 / 3);
  }
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function resolveBase(input) {
  if (isHex(input)) return input;
  if (typeof input === 'string') {
    const key = input.trim().toLowerCase();
    if (NAMED[key]) return NAMED[key];
  }
  return DEFAULT_BASE;
}

// Returns { bg, text, border, dot } for any tone name or hex color.
// bg  = light tint, text = dark shade of the same hue, border = medium tint.
export function getBadgeColors(input) {
  const base = resolveBase(input);
  const { h, s } = rgbToHsl(hexToRgb(base));
  const isNeutral = s < 0.12;
  const textS = isNeutral ? s : clamp(s, 0.4, 1);
  const tintS = isNeutral ? s : clamp(s, 0, 0.85);
  return {
    dot: base,
    text: hslToHex({ h, s: textS, l: 0.3 }),
    bg: hslToHex({ h, s: tintS, l: 0.94 }),
    border: hslToHex({ h, s: tintS, l: 0.84 }),
  };
}

// Detects fixed status text so Active is always green and Inactive always red,
// regardless of the tone passed by the caller.
export function fixedToneFor(children) {
  if (typeof children !== 'string') return null;
  const t = children.trim().toLowerCase();
  if (t === 'active') return 'active';
  if (t === 'inactive') return 'inactive';
  return null;
}
