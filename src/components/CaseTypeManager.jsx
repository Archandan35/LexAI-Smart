import EntityManager from './EntityManager.jsx';
import { caseTypeLogic } from '@/logic/caseTypeLogic.js';

export default function CaseTypeManager({ open, onClose, caseTypes, onChanged }) {
  return (
    <EntityManager
      open={open}
      onClose={onClose}
      title="Case Types"
      logic={caseTypeLogic}
      items={caseTypes}
      onChanged={onChanged}
      fields={['code']}
    />
  );
}
