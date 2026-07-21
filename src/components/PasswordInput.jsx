import { useState } from 'react';
import { getPasswordMinLength } from '@/utils/passwordPolicy.js';
import Icon from './Icon.jsx';

export default function PasswordInput({ value, onChange, placeholder, label, required, autoFocus, id, name, className = '', minLength }) {
  const [visible, setVisible] = useState(false);

  const toggle = () => setVisible((v) => !v);

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
    </div>
  );
}

