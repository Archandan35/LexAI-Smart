import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import FileDrop from '@/components/FileDrop.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Spinner from '@/components/Spinner.jsx';
import CaseSelect from '@/components/CaseSelect.jsx';
import { Field, Textarea } from '@/components/Field.jsx';
import { documentReviewLogic } from '@/logic/documentReviewLogic.js';
import { fileLogic } from '@/logic/fileLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAppData } from '@/data-layer/AppDataContext.jsx';

const ENTITY_META = [
  { key: 'dates', label: 'Dates', icon: 'calendar' },
  { key: 'parties', label: 'Parties', icon: 'vault' },
  { key: 'caseNumbers', label: 'Case Numbers', icon: 'folder' },
  { key: 'plotNumbers', label: 'Plot / Survey Numbers', icon: 'grid' },
  { key: 'khataNumbers', label: 'Khata Numbers', icon: 'doc' },
  { key: 'exhibits', label: 'Exhibits', icon: 'layers' },
];

export default function DocumentReview() {
  const toast = useToast();
  const { refreshCases } = useAppData();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [file, setFile] = useState(null);
  const [caseId, setCaseId] = useState('');
  const [text, setText] = useState('');

  const onFile = async (f) => {
    setFile(f);
    setBusy(true);
    const res = await documentReviewLogic.review(f);
    setBusy(false);
    if (!res.ok) { toast.push(res.error, 'error'); return; }
    setResult(res.data);
    setText(res.data.text);
  };

  const reviewPasted = () => {
    const res = documentReviewLogic.reviewText(text);
    setResult(res.data);
  };

  const saveToVault = async () => {
    if (!file && !text) return;
    await fileLogic.uploadDocument(file || { name: 'Pasted text.txt', text, type: 'text/plain' }, { caseId, folder: 'Reviewed' });
    await refreshCases();
    toast.push('Saved to Case Vault.', 'success');
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="file"
        title="Document Review"
        subtitle="Upload PDF, DOCX or images. OCR extracts the text and LexAI pulls out dates, parties, case numbers, plot & khata numbers and exhibits."
      />

      <div className="grid-sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Upload">
            <FileDrop onFile={onFile} hint="PDF · DOCX · PNG · JPG · TXT" />
            <div style={{ marginTop: 14 }}>
              <Field label="Or paste text">
                <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste document text…" />
              </Field>
              <Button variant="ghost" icon="scan" onClick={reviewPasted} className="btn--block">Extract Entities from Text</Button>
            </div>
          </Card>
          {result && (
            <Card title="Save to Vault">
              <Field label="Link to Case"><CaseSelect value={caseId} onChange={setCaseId} /></Field>
              <Button icon="save" onClick={saveToVault} className="btn--block">Save Document</Button>
            </Card>
          )}
        </div>

        <div>
          {busy && <Spinner label="Running OCR & extraction…" />}
          {!busy && !result && <Card><EmptyState icon="file" title="No document reviewed yet." hint="Upload a file to extract entities." /></Card>}
          {!busy && result && (
            <>
              <div className="grid-2">
                {ENTITY_META.map((e) => {
                  const items = result.entities[e.key] || [];
                  return (
                    <Card key={e.key} title={e.label} sub={`${items.length} found`} className="card--hover">
                      {items.length === 0 ? (
                        <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>None detected.</div>
                      ) : (
                        <div>{items.map((it, i) => <span key={i} className="tag tag--key">{it}</span>)}</div>
                      )}
                    </Card>
                  );
                })}
              </div>
              <Card title="Extracted Text" style={{ marginTop: 16 }}>
                <div style={{ maxHeight: 280, overflow: 'auto', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text-soft)' }}>
                  {result.text}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
