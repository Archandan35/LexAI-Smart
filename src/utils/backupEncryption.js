const enc = new TextEncoder();
const dec = new TextDecoder();

function getKeyMaterial(password) {
  return crypto.subtle.importKey(
    'raw', enc.encode(password),
    { name: 'PBKDF2' }, false, ['deriveKey']
  );
}

function getKey(keyMaterial, salt) {
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt']
  );
}

function isAvailable() {
  return typeof crypto !== 'undefined' && crypto.subtle && crypto.getRandomValues;
}

export async function encryptBackup(data, password) {
  if (!isAvailable()) return { encrypted: false, reason: 'Web Crypto API not available', data };
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await getKeyMaterial(password);
  const key = await getKey(keyMaterial, salt);
  const payload = enc.encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);
  return {
    encrypted: true,
    algorithm: 'AES-256-GCM',
    salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
    iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
    ciphertext: Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join(''),
  };
}

export async function decryptBackup(encrypted, password) {
  if (!isAvailable()) return { decrypted: false, reason: 'Web Crypto API not available' };
  try {
    const salt = new Uint8Array(encrypted.salt.match(/.{2}/g).map(b => parseInt(b, 16)));
    const iv = new Uint8Array(encrypted.iv.match(/.{2}/g).map(b => parseInt(b, 16)));
    const ciphertext = new Uint8Array(encrypted.ciphertext.match(/.{2}/g).map(b => parseInt(b, 16)));
    const keyMaterial = await getKeyMaterial(password);
    const key = await getKey(keyMaterial, salt);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return { decrypted: true, data: JSON.parse(dec.decode(plaintext)) };
  } catch {
    return { decrypted: false, reason: 'Decryption failed — wrong password or corrupted data' };
  }
}


