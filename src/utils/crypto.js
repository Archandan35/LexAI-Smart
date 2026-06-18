// Browser crypto helpers (Web Crypto API, no external deps).
// NOTE: This is a CLIENT-SIDE app with no backend. Password "hashing" and backup
// "encryption" here are real algorithms but provide DEMO-grade protection only —
// anyone with devtools can read localStorage. Swap in a real backend
// (SupabaseAuthProvider template) for production-grade security.

const enc = new TextEncoder();

export async function sha256Hex(input) {
  const data = typeof input === 'string' ? enc.encode(input) : input;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return hex(buf);
  }
  return fallbackHash(typeof input === 'string' ? input : '');
}

// Salted password hash. Demo-grade (see note above).
export async function hashPassword(password, salt) {
  const s = salt || randomHex(16);
  const digest = await sha256Hex(`${s}:${password}`);
  return { salt: s, hash: digest };
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
  // Deterministic-ish fallback (non-crypto environments / SSR).
  let out = '';
  for (let i = 0; i < bytes * 2; i += 1) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Simple, dependency-free non-crypto hash fallback (FNV-1a-ish, hex padded).
function fallbackHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(64, '0');
}

export default { sha256Hex, hashPassword, verifyPassword, randomHex };
