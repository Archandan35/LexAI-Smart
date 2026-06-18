import React from 'react';
import { Select } from './Field.jsx';

// RoleSelector — dropdown of roles (by code). Reused in Permission Manager,
// User forms and bulk-assign.
export default function RoleSelector({ roles = [], value, onChange, includeBlank = false, blankLabel = 'Select role…', ...rest }) {
  return (
    <Select value={value || ''} onChange={(e) => onChange?.(e.target.value)} {...rest}>
      {includeBlank && <option value="">{blankLabel}</option>}
      {roles.map((r) => (
        <option key={r.code} value={r.code}>{r.name}{r.status === 'Disabled' ? ' (disabled)' : ''}</option>
      ))}
    </Select>
  );
}
