import { useState, useEffect, useCallback } from 'react';
import Card from './Card.jsx';
import Button from './Button.jsx';
import Badge from './Badge.jsx';
import Icon from './Icon.jsx';
import Modal from './Modal.jsx';
import EmptyState from './EmptyState.jsx';
import PermissionGate from './PermissionGate.jsx';
import { Field, Input, Textarea, Select } from './Field.jsx';
import { caseHistoryLogic } from '@/logic/caseHistoryLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { formatDate } from '@/utils/format.js';
import { useHearingStatuses } from '@/hooks/useHearingStatuses.js';

// CaseHistory — scrollable legal-proceedings history with full untruncated text,
// expand/collapse, search, date-range filter, asc/desc, and order-sheet import.
export default function CaseHistory({ caseId, onChanged }) {
  const toast = useToast();
  const { user } = useAuth();
  const { statuses: hearingStatuses } = useHearingStatuses();
  const [items, setItems] = useState([]);
  const [order, setOrder] = useState('desc');
  const [search, setSearch] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const [expanded, setExpanded] = useState({});
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ date: '', status: '', text: '' });

  const load = useCallback(async () => {
    setItems(await caseHistoryLogic.list(caseId, { order }));
  }, [caseId, order]);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((h) => {
    if (search && !`${h.text} ${h.status}`.toLowerCase().includes(search.toLowerCase())) return false;
    const t = new Date(h.date).getTime();
    if (range.from && t < new Date(range.from).getTime()) return false;
    if (range.to && t > new Date(range.to).getTime()) return false;
    return true;
  });

  const importOrderSheet = async () => {
    const res = await caseHistoryLogic.importFromOrderSheet(caseId, user);
    if (res.ok) { toast.push(`Imported ${res.data.count} entr${res.data.count === 1 ? 'y' : 'ies'}.`, 'success'); load(); onChanged?.(); }
    else toast.push(res.error, 'error');
  };
  const add = async () => {
    const res = await caseHistoryLogic.add(caseId, draft, user);
    if (res.ok) { toast.push('History entry added.', 'success'); setAdding(false); setDraft({ date: '', status: '', text: '' }); load(); onChanged?.(); }
    else toast.push(res.error, 'error');
  };
  const remove = async (h) => { if (confirm('Delete this history entry?')) { await caseHistoryLogic.remove(h.id); load(); onChanged?.(); } };

  return (
    <Card
      title={`Case History (${items.length})`}
      sub="Complete proceedings history — full text, imported from the order sheet"
    >
      <div className="case-history__toolbar">
        <PermissionGate perm="manageCase.edit"><Button size="sm" variant="ghost" icon="history" onClick={importOrderSheet}>Import from Order Sheet</Button></PermissionGate>
        <PermissionGate perm="manageCase.edit"><Button size="sm" variant="ghost" icon="plus" onClick={() => setAdding(true)}>Add</Button></PermissionGate>
      </div>
      <div className="toolbar-row case-history__actions">
        <div className="datatable__search case-history__search">
          <Icon name="search" size={15} />
          <input value={search} placeholder="Search history…" onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Input type="date" placeholder="dd-mm-yyyy" className="case-history__date-input" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        <span className="muted">to</span>
        <Input type="date" placeholder="dd-mm-yyyy" className="case-history__date-input" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        <div className="case-history__spacer" />
        <button className="btn btn--ghost btn--sm" onClick={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}>
          <Icon name="arrow" size={14} style={{ transform: order === 'desc' ? 'rotate(90deg)' : 'rotate(-90deg)' }} /> {order === 'desc' ? 'Newest' : 'Oldest'}
        </button>
      </div>

      {filtered.length === 0 ? <EmptyState icon="history" title="No history yet." hint="Import from the order sheet or add an entry." /> : (
        <div className="history-scroll">
          <div className="timeline">
            {filtered.map((h) => {
              const isOpen = expanded[h.id];
              const long = (h.text || '').length > 220;
              const shown = isOpen || !long ? h.text : `${h.text.slice(0, 220)}…`;
              return (
                <div className="timeline-item" key={h.id}>
                  <div className="timeline-item__date">
                    {formatDate(h.date)} {h.status && <Badge dot>{h.status}</Badge>}
                    {h.source === 'order-sheet' && <Badge tone="grey">order sheet</Badge>}
                    <span className="case-history__status-spacer" />
                  </div>
                  <div className="timeline-item__event case-history__event-text">{shown}</div>
                  <div className="case-history__actions-row">
                    {long && <button className="linkbtn" onClick={() => setExpanded((e) => ({ ...e, [h.id]: !isOpen }))}>{isOpen ? 'Collapse' : 'Read full text'}</button>}
                    <PermissionGate perm="manageCase.edit"><button className="linkbtn linkbtn--danger" onClick={() => remove(h)}>Delete</button></PermissionGate>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal open={adding} title="Add History Entry" onClose={() => setAdding(false)}
        footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button icon="save" onClick={add}>Add</Button></>}>
        <div className="input-row">
          <Field label="Date"><Input type="date" placeholder="dd-mm-yyyy" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
          <Field label="Status"><Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="">—</option>{hearingStatuses.map((s) => <option key={s}>{s}</option>)}</Select></Field>
        </div>
        <Field label="Full text" hint="Stored exactly as entered — no truncation."><Textarea value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} className="case-history__text-field" /></Field>
      </Modal>
    </Card>
  );
}

