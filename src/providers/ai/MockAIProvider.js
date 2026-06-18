import AIProvider from './AIProvider.js';
import { DRAFT_TYPE_MAP } from '@/constants/draftTypes.js';

// MockAIProvider — deterministic, offline AI used as the default so the app
// runs with zero credentials. It produces structured, legally-shaped text but
// NEVER produces citations (those only ever come from a CitationProvider).
export default class MockAIProvider extends AIProvider {
  async ask(prompt) {
    await wait();
    return `「Mock AI」\nPrompt understood:\n${prompt.slice(0, 400)}\n\nThis is a deterministic mock response. Configure VITE_AI_PROVIDER to use a real model. No citations are produced by the AI layer.`;
  }

  async chat(messages) {
    await wait();
    const last = [...messages].reverse().find((m) => m.role === 'user');
    return `「Mock AI」 reply to: "${(last?.content || '').slice(0, 200)}"`;
  }

  async analyzeDocument(document) {
    await wait();
    const text = document?.text || '';
    return {
      summary: `Document of ~${text.split(/\s+/).length} words analyzed (mock).`,
      observations: [
        'Identify the operative reliefs and the cause of action.',
        'Cross-check pleaded dates against the limitation period.',
        'Confirm territorial and pecuniary jurisdiction.',
      ],
    };
  }

  async generateDraft(data) {
    await wait();
    const meta = DRAFT_TYPE_MAP[data?.type] || { label: 'Legal Document' };
    return buildDraftSkeleton(meta.label, data || {});
  }
}

function wait(ms = 350) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildDraftSkeleton(label, data) {
  const {
    court = 'IN THE COURT OF __________',
    caseNumber = '____ No. ____ of 20__',
    plaintiff = 'AB',
    defendant = 'CD',
    facts = 'State the material facts here.',
    reliefs = 'State the reliefs claimed here.',
  } = data;
  const heading = label.toUpperCase();
  return [
    court.toUpperCase(),
    '',
    caseNumber,
    '',
    `${plaintiff} … Petitioner/Plaintiff`,
    'Versus',
    `${defendant} … Respondent/Defendant`,
    '',
    heading,
    '',
    'MOST RESPECTFULLY SHEWETH:',
    '',
    '1. FACTS',
    facts,
    '',
    '2. GROUNDS',
    'a) That ____________________________________________.',
    'b) That ____________________________________________.',
    '',
    '3. PRAYER',
    reliefs,
    '',
    'Place: __________                         Advocate for the Petitioner',
    'Date:  __________',
    '',
    '— Drafted with LexAI (mock generator). Insert verified citations via Citation Search. —',
  ].join('\n');
}
