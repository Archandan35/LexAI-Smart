import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import CitationCard from '@/components/CitationCard.jsx';
import GuardrailBanner from '@/components/GuardrailBanner.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Spinner from '@/components/Spinner.jsx';
import { Field, Input } from '@/components/Field.jsx';
import { ACTS } from '@/constants/acts.js';
import { researchLogic } from '@/logic/researchLogic.js';

// Legal Research Workspace — statute-anchored, retrieval-only (never AI memory).
export default function LegalResearch() {
  const [actId, setActId] = useState('cpc');
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ loading: false, data: null, message: null });

  const run = async () => {
    setState({ loading: true, data: null, message: null });
    const res = await researchLogic.research({ actId, query });
    if (!res.ok) { setState({ loading: false, data: null, message: res.error }); return; }
    setState({ loading: false, data: res.data, message: res.data.message });
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="book"
        title="Legal Research Workspace"
        subtitle="Research across core Indian statutes. Authorities are retrieved from the citation index — not recalled from model memory — so every result is real and verifiable."
      />
      <GuardrailBanner text="Research uses retrieval, not AI memory. Statutory positions must always be confirmed against the bare Act." />

      <div className="grid-3 mb-20">
        {ACTS.map((a) => (
          <div
            key={a.id}
            className={`folder ${actId === a.id ? '' : ''}`}
            style={actId === a.id ? { borderColor: 'var(--navy-600)', background: 'var(--brand-soft)' } : {}}
            onClick={() => setActId(a.id)}
          >
            <div className="folder__icon"><Icon name="book" size={18} /></div>
            <div>
              <div className="legal-research__folder-title">{a.short}</div>
              <div className="folder__count">{a.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Card title="Research Query" sub="Authorities under the selected statute">
        <div className="input-row items-end">
          <Field label="Search within statute & case-law">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. rejection of plaint, condonation, basic structure…" />
          </Field>
          <Button icon="search" loading={state.loading} onClick={run} className="mb-15">Research</Button>
        </div>

        {state.loading && <Spinner label="Retrieving authorities…" />}
        {!state.loading && state.message && (
          <div className="alert alert--warn"><strong>{state.message}</strong>&nbsp;No verified precedent retrieved for this query.</div>
        )}
        {!state.loading && state.data && !state.message && (
          <div className="mt-8">
            {state.data.results.map((r, i) => <CitationCard key={r.id} item={r} rank={i + 1} />)}
          </div>
        )}
        {!state.loading && !state.data && !state.message && (
          <EmptyState icon="book" title="Select a statute and search." />
        )}
      </Card>
    </div>
  );
}
