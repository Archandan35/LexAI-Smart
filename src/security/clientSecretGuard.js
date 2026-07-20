// Runtime guard: detects privileged secrets that must NEVER ship in the
// client bundle. Vite inlines every import.meta.env.VITE_* var into the
// built JS, so a misconfigured .env (e.g. VITE_SUPABASE_SERVICE_ROLE_KEY)
// leaks it to anyone who opens the page source. This fails loud at boot,
// not silently in production.

const DANGEROUS_SECRETS = [
  {
    test: /VITE_.*SERVICE_ROLE/i,
    level: 'CRITICAL',
    reason: 'Service-role key bypasses Row-Level Security and grants full DB admin. It must live only on a backend.',
  },
  {
    test: /VITE_.*REFRESH_TOKEN/i,
    level: 'HIGH',
    reason: 'Long-lived OAuth refresh token — can mint access tokens. Must live only on a backend.',
  },
  {
    test: /VITE_.*ACCESS_TOKEN/i,
    level: 'HIGH',
    reason: 'Bearer access token — acts as a logged-in credential. Must live only on a backend.',
  },
  {
    test: /VITE_(OPENAI|ANTHROPIC|GEMINI|INDIANKANOON)_API_KEY/i,
    level: 'MEDIUM',
    reason: 'Provider API key billed to your account. For untrusted/multi-user deployments, proxy through a backend instead of shipping it to the browser.',
  },
];

export function scanClientSecrets(env = import.meta.env ?? {}) {
  const offenders = [];
  for (const key of Object.keys(env)) {
    if (key === '__vite__' || typeof env[key] === 'undefined' || env[key] === '' || env[key] === null) continue;
    for (const rule of DANGEROUS_SECRETS) {
      if (rule.test.test(key)) {
        offenders.push({ key, ...rule });
        break;
      }
    }
  }
  return offenders;
}

export function guardClientSecrets() {
  const offenders = scanClientSecrets();
  if (!offenders.length) return;
  const lines = [
    '%c[LexAI Security] Privileged secret(s) detected in the client bundle!',
    'These values are embedded in the shipped JS and visible to anyone via "View Page Source".',
  ];
  for (const o of offenders) {
    lines.push(`  • ${o.level}  ${o.key} — ${o.reason}`);
  }
  lines.push('Fix: move this value to a backend (e.g. VITE_BACKEND_URL) and read it server-side. See docs/CLIENT_SECRETS.md.');
  // eslint-disable-next-line no-console
  console.error(`%c${lines.join('\n')}`, 'color:#b00020;font-weight:bold;');
}

export default guardClientSecrets;
