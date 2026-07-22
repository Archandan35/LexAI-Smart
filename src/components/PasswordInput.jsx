import { useState, useMemo } from 'react';
import { getPasswordMinLength, validatePassword, getPasswordRequirements, isCommonPassword } from '@/utils/passwordPolicy.js';
import Icon from './Icon.jsx';

export default function PasswordInput({ value, onChange, placeholder, label, required, autoFocus, id, name, className = '', minLength }) {
  const [visible, setVisible] = useState(false);

  const toggle = () => setVisible((v) => !v);

  const reqs = useMemo(() => getPasswordRequirements(), []);

  const checks = useMemo(() => {
    if (!value || value.length === 0) return [];
    const items = [];
    items.push({ label: `At least ${reqs.minLength} characters`, pass: value.length >= reqs.minLength });
    if (reqs.requireUppercase) items.push({ label: 'At least one uppercase letter', pass: /[A-Z]/.test(value) });
    if (reqs.requireLowercase) items.push({ label: 'At least one lowercase letter', pass: /[a-z]/.test(value) });
    if (reqs.requireNumber) items.push({ label: 'At least one number', pass: /[0-9]/.test(value) });
    if (reqs.requireSpecial) items.push({ label: 'At least one special character', pass: /[^A-Za-z0-9]/.test(value) });
    if (value.length >= reqs.minLength) items.push({ label: 'Not a common password', pass: !isCommonPassword(value) });
    return items;
  }, [value, reqs]);

  return (
    <div className="password-field">
      {label && <label className="field__label" htmlFor={id}>{label}</label>}
      <div className="password-field__wrapper">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          className={`input ${className}`}
          minLength={minLength ?? getPasswordMinLength()}
        />
        <button
          type="button"
          className="password-field__toggle"
          onClick={toggle}
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </div>
      {checks.length > 0 && (
        <div className="password-hints">
          {checks.map((c, i) => (
            <span key={i} className={`password-hint${c.pass ? ' password-hint--pass' : ''}`}>
              <Icon name={c.pass ? 'check' : 'circle'} size={12} />
              {c.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
