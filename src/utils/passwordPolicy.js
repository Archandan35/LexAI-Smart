import settingsCache from '@/core/settingsCache.js';

function readPolicy() {
  const raw = settingsCache.get('passwordPolicy');
  if (raw === 'Low (6+ chars)') return { minLength: 6, requireUppercase: false, requireLowercase: false, requireNumber: false, requireSpecial: false };
  if (raw === 'High (12+ chars, special)') return { minLength: 12, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSpecial: true };
  return { minLength: 8, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSpecial: false };
}

export function getPasswordMinLength() {
  return readPolicy().minLength;
}

export function getPasswordRequirements() {
  return readPolicy();
}

export function validatePassword(password) {
  const reqs = readPolicy();
  const errors = [];
  if (!password || password.length < reqs.minLength) errors.push(`At least ${reqs.minLength} characters`);
  if (reqs.requireUppercase && !/[A-Z]/.test(password)) errors.push('At least one uppercase letter');
  if (reqs.requireLowercase && !/[a-z]/.test(password)) errors.push('At least one lowercase letter');
  if (reqs.requireNumber && !/[0-9]/.test(password)) errors.push('At least one number');
  if (reqs.requireSpecial && !/[^A-Za-z0-9]/.test(password)) errors.push('At least one special character');
  return { valid: errors.length === 0, errors };
}
