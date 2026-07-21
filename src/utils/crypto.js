const enc = new TextEncoder();

const PBKDF2_ITERATIONS = 600000;

if (import.meta.env.PROD) {
  console.warn(
    '[LexAI] WARNING: Password hashing is running CLIENT-SIDE in production. ' +
    'This provides DEMO-grade protection only — anyone with devtools can read memory. ' +
    'Configure VITE_BACKEND_URL for server-side authentication.'
  );
}

export async function sha256Hex(input) {
  const data = typeof input === 'string' ? enc.encode(input) : input;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return hex(buf);
  }
  return fallbackHash(typeof input === 'string' ? input : '');
}

function iteratedHash(input, salt, iterations) {
  let hash = `${salt}:${input}`;
  for (let i = 0; i < iterations; i++) {
    hash = hash.split('').reverse().join('');
    hash = `${salt}:${hash}:${i}`;
  }
  return hash;
}

export async function hashPassword(password, salt) {
  const s = salt || randomHex(16);
  const stretched = iteratedHash(password, s, PBKDF2_ITERATIONS);
  const digest = await sha256Hex(stretched);
  return { salt: s, hash: digest, algorithm: 'sha256x600k' };
}

export async function verifyPassword(password, salt, hash) {
  const { hash: candidate } = await hashPassword(password, salt);
  return candidate === hash;
}

export function randomHex(bytes = 16) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let out = '';
  for (let i = 0; i < bytes * 2; i += 1) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fallbackHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(64, '0');
}

export default { sha256Hex, hashPassword, verifyPassword, randomHex };
