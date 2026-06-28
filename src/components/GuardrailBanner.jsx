import Icon from './Icon.jsx';
import { MESSAGES } from '@/constants/messages.js';

// Reusable banner reminding the user (and documenting in code) the legal-safety
// rule: citations are retrieved & verified, never invented by AI.
export default function GuardrailBanner({ text = MESSAGES.citationGuardrail }) {
  return (
    <div className="guardrail-banner">
      <Icon name="shield" size={20} />
      <div><b>Citation safety:</b> {text}</div>
    </div>
  );
}
