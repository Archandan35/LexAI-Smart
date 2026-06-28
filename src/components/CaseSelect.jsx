import { useAppData } from '@/data-layer/AppDataContext.jsx';
import { Select } from './Field.jsx';

function fmtCaseNum(c) {
  if (!c) return '';
  const ct = c.case_type || '';
  const cn = c.case_number || c.caseNumber || c.case_display_number;
  const cy = c.case_year || '';
  if (ct && cn && cy) return `${ct} ${cn}/${cy}`;
  return c.case_display_number || c.caseNumber || String(cn || '');
}

// Shared case-number dropdown reused across order sheet, case manager, drafting,
// hearing notes. Reads the shared case list from AppDataContext.
export default function CaseSelect({ value, onChange, placeholder = 'Select case…', allowEmpty = true }) {
  const { cases } = useAppData();
  return (
    <Select value={value || ''} onChange={(e) => onChange(e.target.value)}>
      {allowEmpty && <option value="">{placeholder}</option>}
      {cases.map((c) => (
        <option key={c.id} value={c.id}>{fmtCaseNum(c)} — {c.title}</option>
      ))}
    </Select>
  );
}
