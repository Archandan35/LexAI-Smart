import { useState } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Spinner from '@/components/Spinner.jsx';
import CaseSelect from '@/components/CaseSelect.jsx';
import CitationCard from '@/components/CitationCard.jsx';
import { Field, Textarea } from '@/components/Field.jsx';
import { hearingNotesLogic } from '@/logic/hearingNotesLogic.js';
import { exportPdf } from '@/utils/exportDoc.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

// Hearing Notes — assembles Facts, Issues, Evidence, Citations, Oral Submissions.
export default function HearingNotes() {
  const toast = useToast();
  const [caseId, setCaseId] = useState('');
  const [facts, setFacts] = useState('');
  const [issuesText, setIssuesText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState(null);

  const generate = async () => {
    setBusy(true);
    const res = await hearingNotesLogic.generate({ caseId, facts, issuesText });
    setBusy(false);
    if (!res.ok) { toast.push(res.error, 'error'); return; }
    setNotes(res.data);
  };

  const exportNotes = () => {
    if (!notes) return;
    const lines = [
      'FACTS', ...notes.facts.map((f, i) => `${i + 1}. ${f}`), '',
      'ISSUES', ...notes.issues.map((q, i) => `${i + 1}. ${q}`), '',
      'EVIDENCE', ...notes.evidence.map((e) => `- ${e.exhibit} (${e.folder})`), '',
      'CITATIONS (verified)', ...notes.citations.map((c) => `- ${c.citation} — ${c.court}`), '',
      'ORAL SUBMISSIONS', notes.oralSubmissions,
    ];
    exportPdf(`Hearing Notes — ${notes.case?.caseNumber || ''}`, lines.join('\n'));
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="notes"
        title="Hearing Notes"
        subtitle="Generate structured hearing notes — facts, issues, evidence, verified citations and oral submission points — ready for the next date."
        actions={notes && <Button variant="ghost" icon="download" onClick={exportNotes}>Export PDF</Button>}
      />

      <div className="grid-sidebar">
        <Card title="Inputs">
          <Field label="Case"><CaseSelect value={caseId} onChange={setCaseId} /></Field>
          <Field label="Facts (optional — defaults to case description)">
            <Textarea value={facts} onChange={(e) => setFacts(e.target.value)} placeholder="Override the facts for these notes…" />
          </Field>
          <Field label="Issues (optional — one per line)">
            <Textarea value={issuesText} onChange={(e) => setIssuesText(e.target.value)} className="hearing-notes__issues" placeholder="Leave blank to auto-derive issues" />
          </Field>
          <Button icon="notes" loading={busy} onClick={generate} className="btn--block">Generate Hearing Notes</Button>
        </Card>

        <div>
          {busy && <Spinner label="Assembling hearing notes…" />}
          {!busy && !notes && <Card><EmptyState icon="notes" title="No notes yet." hint="Pick a case and generate." /></Card>}
          {!busy && notes && (
            <div className="flex-col gap-16">
              <Card title="Facts">
                <ol className="hearing-notes__list">
                  {(notes.facts || []).map((f, i) => <li key={i}>{f}</li>)}
                </ol>
              </Card>
              <Card title="Issues">
                <ol className="hearing-notes__list">
                  {(notes.issues || []).map((q, i) => <li key={i}>{q}</li>)}
                </ol>
              </Card>
              <Card title="Evidence">
                {(!notes.evidence || notes.evidence.length === 0) ? <EmptyState icon="file" title="No documents on record." /> : notes.evidence.map((e, i) => (
                  <div className="list-row" key={i}>
                    <div className="list-row__icon"><Icon name="file" size={15} /></div>
                    <div><div className="list-row__title">{e.exhibit}</div><div className="list-row__meta">{e.folder}</div></div>
                  </div>
                ))}
              </Card>
              <Card title="Citations" sub="Verified authorities only">
                {!notes.citations || notes.citations.length === 0 ? (
                  <div className="alert alert--warn">No verified precedent found.</div>
                ) : notes.citations.map((c, i) => <CitationCard key={c.id} item={c} rank={i + 1} />)}
              </Card>
              <Card title="Oral Submissions">
                <div className="hearing-notes__oral-submissions">{notes.oralSubmissions}</div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

