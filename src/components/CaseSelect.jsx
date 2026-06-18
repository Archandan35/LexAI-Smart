import React from 'react';
import { useAppData } from '@/data-layer/AppDataContext.jsx';
import { Select } from './Field.jsx';

// Shared case-number dropdown reused across cause list, case manager, drafting,
// hearing notes. Reads the shared case list from AppDataContext.
export default function CaseSelect({ value, onChange, placeholder = 'Select case…', allowEmpty = true }) {
  const { cases } = useAppData();
  return (
    <Select value={value || ''} onChange={(e) => onChange(e.target.value)}>
      {allowEmpty && <option value="">{placeholder}</option>}
      {cases.map((c) => (
        <option key={c.id} value={c.id}>{c.caseNumber} — {c.title}</option>
      ))}
    </Select>
  );
}
