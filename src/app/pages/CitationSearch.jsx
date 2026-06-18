import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import CitationCard from '@/components/CitationCard.jsx';
import GuardrailBanner from '@/components/GuardrailBanner.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Spinner from '@/components/Spinner.jsx';
import { Field, Input, Textarea, Select } from '@/components/Field.jsx';
import { ACTS } from '@/constants/acts.js';
import { citationLogic } from '@/logic/citationLogic.js';
import { MESSAGES } from '@/constants/messages.js';
import { useCourts } from '@/hooks/useCourts.js';

// Citation Search — implements Facts→Issue→Search→Retrieve→Verify→Rank→Display.
export default function CitationSearch() {
  const { courtNames } = useCourts();
  const [q, setQ] = useState({ facts: '', issue: '', keywords: '', act: '', section: '', court: '' });
  const [state, setState] = useState({ loading: false, results: null, issues: [], message: null });

  const onSearch = async () => {
    setState({ loading: true, results: null, issues: [], message: null });
    const res = await citationLogic.search(q);
    if (!res.ok) { setState({ loading: false, results: [], issues: [], message: res.error }); return; }
    setState({ loading: false, results: res.data.results, issues: res.data.issues, message: res.data.message });
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="search"
        title="Citation Search"
        subtitle="Retrieve real, verified judgments by facts, issue, keywords, Act, section or court. Authorities are fetched from a citation provider and verified — never generated."
      />
      <GuardrailBanner />

      <div className="grid-sidebar">
        <Card title="Search Parameters">
          <Field label="Facts"><Textarea value={q.facts} onChange={(e) => setQ({ ...q, facts: e.target.value })} placeholder="Describe the facts of your matter…" /></Field>
          <Field label="Issue (optional)"><Input value={q.issue} onChange={(e) => setQ({ ...q, issue: e.target.value })} placeholder="e.g. condonation of delay" /></Field>
          <Field label="Keywords"><Input value={q.keywords} onChange={(e) => setQ({ ...q, keywords: e.target.value })} placeholder="comma or space separated" /></Field>
          <div className="input-row">
            <Field label="Act">
              <Select value={q.act} onChange={(e) => setQ({ ...q, act: e.target.value })}>
                <option value="">Any Act</option>
                {ACTS.map((a) => <option key={a.id} value={a.id}>{a.short}</option>)}
              </Select>
            </Field>
            <Field label="Section"><Input value={q.section} onChange={(e) => setQ({ ...q, section: e.target.value })} placeholder="e.g. 11" /></Field>
          </div>
          <Field label="Court">
            <Select value={q.court} onChange={(e) => setQ({ ...q, court: e.target.value })}>
              <option value="">Any Court</option>
              {courtNames.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Button icon="search" loading={state.loading} onClick={onSearch} className="btn--block">Search Authorities</Button>
        </Card>

        <div>
          {state.issues.length > 0 && (
            <div className="alert alert--info" style={{ marginBottom: 16 }}>
              <strong>Extracted issues:</strong>&nbsp;{state.issues.join(' · ')}
            </div>
          )}
          {state.loading && <Spinner label={MESSAGES.verifying} />}
          {!state.loading && state.results === null && (
            <Card><EmptyState icon="search" title="Run a search to retrieve authorities." hint="Results are ranked by relevance and verified." /></Card>
          )}
          {!state.loading && state.message && (
            <div className="alert alert--warn"><strong>{state.message}</strong>&nbsp;LexAI never fabricates citations.</div>
          )}
          {!state.loading && state.results && state.results.map((r, i) => (
            <CitationCard key={r.id} item={r} rank={r.rank || i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
