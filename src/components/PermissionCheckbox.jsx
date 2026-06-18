import React from 'react';
import { PERM_SOURCE } from '@/constants/permissions.js';

// PermissionCheckbox — a single permission cell. Colour-coded by provenance
// (inherited=green, custom=blue, denied=red) for the Permission Manager.
export default function PermissionCheckbox({ checked, onChange, disabled, source = PERM_SOURCE.NONE, title }) {
  const cls = [
    'perm-check',
    checked ? 'perm-check--on' : '',
    `perm-check--${source}`,
    disabled ? 'perm-check--disabled' : '',
  ].join(' ').trim();
  return (
    <label className={cls} title={title}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
      <span className="perm-check__box" aria-hidden="true" />
    </label>
  );
}
