import { useState, useEffect } from 'react';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import FileDrop from '@/components/FileDrop.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Spinner from '@/components/Spinner.jsx';
import CaseSelect from '@/components/CaseSelect.jsx';
import { Field, Textarea } from '@/components/Field.jsx';
import { timelineLogic } from '@/logic/timelineLogic.js';
import { fileLogic } from '@/logic/fileLogic.js';
import { exportPdf } from '@/utils/exportDoc.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

// Case Timeline — OCR-driven chronology from documents or pasted text.
export default function CaseTimeline() {
  const toast = useToast();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991);
  const [events, setEvents] = useState(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [caseId, setCaseId] = useState('');

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 991px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    handler(mql);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const fromFile = async (file) => {
    setBusy(true);
    const res = await timelineLogic.buildFromDocuments([file]);
    setBusy(false);
    if (!res.ok) { toast.push(res.error, 'error'); return; }
    setEvents(res.data.events);
    toast.push(`${res.data.count} event(s) extracted.`, 'success');
  };

  const fromText = () => {
    const { events: ev, count } = timelineLogic.buildFromText(text);
    setEvents(ev);
    toast.push(`${count} event(s) extracted.`, 'success');
  };

  const fromCase = async () => {
    if (!caseId) { toast.push('Select a case first.', 'error'); return; }
    setBusy(true);
    const docs = await fileLogic.listDocuments(caseId);
    const res = await timelineLogic.buildFromDocuments(docs);
    setBusy(false);
    if (!res.ok) { toast.push(res.error, 'error'); return; }
    setEvents(res.data.events);
    toast.push(`${res.data.count} event(s) from ${docs.length} document(s).`, 'success');
  };

  const exportTimeline = () => {
    if (!events?.length) return;
    exportPdf('Case Chronology', events.map((e) => `${e.date}\t${e.event}\t(${e.source})`).join('\n'));
  };

  return (
    <div className="fade-in">
      {!isMobile ? (
        <div className="bench-types__hero">
          <div className="bench-types__hero-icon"><Icon name="clock" size={34} /></div>
          <div className="bench-types__hero-text">
            <h2>Case Timeline</h2>
            <p>Auto-create a chronology from case documents. OCR extracts text, then dates are mined and ordered into an evidentiary timeline.</p>
            <div className="bench-types__hero-accent" />
          </div>
          {events?.length > 0 && <Button variant="ghost" icon="download" style={{ marginLeft: 'auto' }} onClick={exportTimeline}>Export</Button>}
          <Icon name="clock" className="bench-types__hero-watermark bench-types__watermark-icon" />
        </div>
      ) : (
        <div className="bench-types__hero" style={{ margin: '0 0 20px' }}>
          <div className="bench-types__hero-icon"><Icon name="clock" size={34} /></div>
          <div className="bench-types__hero-text">
            <h2>Case Timeline</h2>
            <p>Auto-create a chronology from case documents.</p>
            <div className="bench-types__hero-accent" />
            {events?.length > 0 && <Button variant="ghost" icon="download" onClick={exportTimeline}>Export</Button>}
          </div>
          <Icon name="clock" className="bench-types__hero-watermark bench-types__watermark-icon" />
        </div>
      )}

      <div className="grid-sidebar">
        <div className="flex-col gap-16">
          <Card title="From Manage Cases">
            <Field label="Build from a case's documents"><CaseSelect value={caseId} onChange={setCaseId} /></Field>
            <Button icon="folder" loading={busy} onClick={fromCase} className="btn--block">Build from Case</Button>
          </Card>
          <Card title="From Upload"><FileDrop onFile={fromFile} hint="OCR-driven date extraction" /></Card>
          <Card title="From Text">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a narrative with dates…" />
            <Button variant="ghost" icon="clock" onClick={fromText} className="btn--block mt-10">Build from Text</Button>
          </Card>
        </div>

        <div>
          {busy && <Spinner label="Building chronology…" />}
          {!busy && !events && <Card><EmptyState icon="clock" title="No timeline yet." hint="Build from a case, an upload, or pasted text." /></Card>}
          {!busy && events && (
            <Card title="Chronology" sub={`${events.length} event(s)`}>
              {events.length === 0 ? (
                <EmptyState icon="clock" title="No dates found." hint="The source contained no recognizable dates." />
              ) : (
                <div className="timeline">
                  {events.map((e, i) => (
                    <div className="timeline-item" key={i}>
                      <div className="timeline-item__date">{e.date}</div>
                      <div className="timeline-item__event">{e.event}</div>
                      <div className="timeline-item__source"><Icon name="file" size={11} /> {e.source}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

