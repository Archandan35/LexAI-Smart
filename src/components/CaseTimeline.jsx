import Card from './Card.jsx';
import Badge from './Badge.jsx';
import Icon from './Icon.jsx';
import EmptyState from './EmptyState.jsx';
import { caseActivityService } from '@/services/caseActivityService.js';
import { formatDate } from '@/utils/format.js';
import { DateEngine } from '@/core/DateEngine.js';

const ICONS = {
  'case.create': 'plus', 'case.update': 'edit', 'case.delete': 'trash',
  'case.archive': 'vault', 'case.restore': 'history', 'stage.change': 'target',
  'folder.create': 'folderPlus', 'folder.rename': 'edit', 'folder.delete': 'trash',
  'document.upload': 'upload', 'document.delete': 'trash', 'document.move': 'move',
  'draft.store': 'save', 'draft.delete': 'trash', 'history.import': 'history', 'history.add': 'notes',
  'note.add': 'notes', 'note.delete': 'trash', 'note.update': 'edit',
};

function timeOnly(iso) {
  return DateEngine.formatTime(iso);
}

// CaseTimeline — chronological system activity (audit trail) for a case.
export default function CaseTimeline({ caseId, refreshKey }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    caseActivityService.list(caseId).then((rows) => setItems([...rows].sort((a, b) => new Date(b.at) - new Date(a.at))));
  }, [caseId, refreshKey]);

  return (
    <Card title="Case Timeline" sub="Chronological activity — filings, documents, drafts, stage changes and updates">
      {items.length === 0 ? <EmptyState icon="clock" title="No activity recorded yet." /> : (
        <div className="timeline">
          {items.map((a) => (
            <div className="timeline-item" key={a.id}>
              <div className="timeline-item__date">
                <span className="list-row__icon" style={{ width: 26, height: 26, display: 'inline-grid' }}><Icon name={ICONS[a.type] || 'bolt'} size={13} /></span>
                {formatDate(a.at)} · {timeOnly(a.at)}
              </div>
              <div className="timeline-item__event">{a.text}</div>
              <div className="timeline-item__source">{a.userName} · <Badge tone="grey">{a.type}</Badge></div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
