import { useState, useEffect, useCallback, useMemo } from 'react';
import Icon from '@/components/Icon.jsx';
import Badge from '@/components/Badge.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Modal from '@/components/Modal.jsx';
import PageHeader from '@/components/PageHeader.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Spinner from '@/components/Spinner.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import changelogService from '@/services/changelogService.js';

/* ── helpers ─────────────────────────────────────────────── */
const CATEGORY_BADGE_TONES = {
  'New Feature': 'green',
  Enhancement: 'blue',
  Improvement: 'teal',
  'Bug Fix': 'red',
  Security: 'orange',
  Performance: 'purple',
  'UI/UX': 'pink',
  Database: 'navy',
  API: 'violet',
  Authentication: 'navy',
  Authorization: 'navy',
  Notifications: 'cyan',
  Storage: 'grey',
  'Setup Wizard': 'cyan',
  Installer: 'grey',
  Migration: 'amber',
  Documentation: 'grey',
  Refactoring: 'grey',
  Testing: 'green',
  'Breaking Change': 'red',
  Deprecated: 'amber',
  Removed: 'red',
};

const RELEASE_TYPE_TONES = {
  major: 'red',
  minor: 'blue',
  patch: 'green',
  hotfix: 'orange',
  beta: 'purple',
  alpha: 'purple',
};

const STATUS_TONES = {
  planned: 'grey',
  in_progress: 'blue',
  completed: 'green',
  released: 'navy',
  deprecated: 'amber',
  rolled_back: 'red',
};

function formatDate(d) {
  if (!d) return 'N/A';
  try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return d; }
}

function formatTime(d, tz) {
  if (!d) return '';
  try {
    const opts = { hour: '2-digit', minute: '2-digit' };
    if (tz) opts.timeZone = tz;
    return new Date(d).toLocaleTimeString('en-US', opts);
  } catch { return ''; }
}

/* ── StatCard ─────────────────────────────────────────────── */
function StatCard({ icon, value, label, tone }) {
  return (
    <div className="stat-card">
      {icon && (
        <div className="stat-card__icon" style={{ background: tone ? `var(--${tone}-soft, var(--brand-soft))` : undefined }}>
          <Icon name={icon} size={20} />
        </div>
      )}
      <div className="stat-card__value">{value ?? '—'}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}

/* ── FilterBar ────────────────────────────────────────────── */
function FilterBar({ filters, onChange }) {
  const set = (key, val) => onChange({ ...filters, [key]: val });

  return (
    <div className="toolbar-row cl-filterbar">
      <div className="search-row__input" style={{ position: 'relative', flex: '1 1 auto', minWidth: 200 }}>
        <Icon name="search" size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
        <input
          className="input" type="text" placeholder="Search by version, title, keyword, author..."
          value={filters.query || ''} onChange={(e) => set('query', e.target.value)}
          style={{ paddingLeft: 36 }}
        />
      </div>
      <select className="select" value={filters.releaseType || ''} onChange={(e) => set('releaseType', e.target.value)}>
        <option value="">All Types</option>
        {changelogService.RELEASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <select className="select" value={filters.category || ''} onChange={(e) => set('category', e.target.value)}>
        <option value="">All Categories</option>
        {changelogService.CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select className="select" value={filters.status || ''} onChange={(e) => set('status', e.target.value)}>
        <option value="">All Statuses</option>
        {changelogService.STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select className="select" value={filters.environment || ''} onChange={(e) => set('environment', e.target.value)}>
        <option value="">All Environments</option>
        {changelogService.ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
      </select>
    </div>
  );
}

/* ── ReleaseCard ──────────────────────────────────────────── */
function ReleaseCard({ release, onEdit, onDelete, onManageEntries, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const entriesByCategory = useMemo(() => {
    const groups = {};
    if (!release.entries) return groups;
    for (const e of release.entries) {
      const cat = e.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(e);
    }
    return groups;
  }, [release.entries]);

  const categoryOrder = ['New Feature', 'Enhancement', 'Improvement', 'Bug Fix', 'Security', 'Performance', 'UI/UX', 'Database', 'API', 'Breaking Change', 'Deprecated', 'Removed'];

  return (
    <div className={`cl-release ${open ? 'cl-release--open' : ''}`}>
      <div className="cl-release__head" onClick={() => setOpen(!open)}>
        <div className="cl-release__head-left">
          <Badge tone={RELEASE_TYPE_TONES[release.release_type] || 'grey'}>{release.release_type}</Badge>
          <span className="cl-release__version">{release.version}</span>
          <span className="cl-release__date">{formatDate(release.release_date)}</span>
          <Badge tone={STATUS_TONES[release.status] || 'grey'}>{release.status}</Badge>
        </div>
        <div className="cl-release__head-right">
          <span className="cl-release__count">{release.entries?.length || 0} change{(release.entries?.length || 0) !== 1 ? 's' : ''}</span>
          <button className="iconbtn" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} aria-label={open ? 'Collapse' : 'Expand'}>
            <Icon name="chevron" size={16} style={{ transform: open ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.2s' }} />
          </button>
        </div>
      </div>

      {open && (
        <div className="cl-release__body">
          {release.summary && <p className="cl-release__summary">{release.summary}</p>}
          {release.description && <p className="cl-release__desc">{release.description}</p>}

          <div className="cl-release__meta-grid">
            {release.author && <div><span className="muted">Author:</span> {release.author}</div>}
            {release.environment && <div><span className="muted">Environment:</span> {release.environment}</div>}
            {release.build_number && <div><span className="muted">Build:</span> {release.build_number}</div>}
            {release.related_issue && <div><span className="muted">Issue:</span> {release.related_issue}</div>}
            {release.release_date && (
              <div>
                <span className="muted">Released:</span> {formatDate(release.release_date)}
                {release.release_time && ` ${formatTime(release.release_date, release.timezone)}`}
                {release.timezone && ` ${release.timezone}`}
              </div>
            )}
            {release.git_commit_hash && <div><span className="muted">Commit:</span> <code>{release.git_commit_hash.slice(0, 8)}</code></div>}
          </div>

          {Object.entries(entriesByCategory).length > 0 && (
            <div className="cl-release__entries">
              {categoryOrder.filter(c => entriesByCategory[c]).map(cat => (
                <div key={cat} className="cl-release__cat-group">
                  <div className="cl-release__cat-head">
                    <Badge tone={CATEGORY_BADGE_TONES[cat] || 'grey'}>{cat}</Badge>
                    <span className="muted">{entriesByCategory[cat].length}</span>
                  </div>
                  <ul className="cl-release__cat-list">
                    {entriesByCategory[cat].map((entry, i) => (
                      <li key={entry.id || i} className="cl-release__entry">
                        <span className="cl-release__entry-title">{entry.title}</span>
                        {entry.description && <p className="cl-release__entry-desc">{entry.description}</p>}
                        {entry.author && <span className="muted">— {entry.author}</span>}
                        {entry.related_issue && <span className="muted"> ({entry.related_issue})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {Object.keys(entriesByCategory).filter(c => !categoryOrder.includes(c)).map(cat => (
                <div key={cat} className="cl-release__cat-group">
                  <div className="cl-release__cat-head">
                    <Badge tone={CATEGORY_BADGE_TONES[cat] || 'grey'}>{cat}</Badge>
                    <span className="muted">{entriesByCategory[cat].length}</span>
                  </div>
                  <ul className="cl-release__cat-list">
                    {entriesByCategory[cat].map((entry, i) => (
                      <li key={entry.id || i} className="cl-release__entry">
                        <span className="cl-release__entry-title">{entry.title}</span>
                        {entry.description && <p className="cl-release__entry-desc">{entry.description}</p>}
                        {entry.author && <span className="muted">— {entry.author}</span>}
                        {entry.related_issue && <span className="muted"> ({entry.related_issue})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className="cl-release__actions">
            <Button size="sm" variant="ghost" icon="edit" onClick={() => onEdit(release)}>Edit</Button>
            <Button size="sm" variant="ghost" icon="list" onClick={() => onManageEntries(release)}>Manage Changes</Button>
            <Button size="sm" variant="ghost" icon="trash" onClick={() => onDelete(release)}>Delete</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── TimelineView ─────────────────────────────────────────── */
function TimelineView({ releases }) {
  if (!releases || releases.length === 0) {
    return <EmptyState icon="clock" title="No releases yet" hint="Create your first release to see the timeline." />;
  }
  return (
    <div className="timeline cl-timeline">
      {releases.map((r) => (
        <div key={r.id} className="timeline-item cl-timeline-item">
          <div className="timeline-item__date">
            {formatDate(r.release_date)}
            {r.release_time && <span className="muted"> {r.release_time}</span>}
          </div>
          <div className="timeline-item__event">
            <Badge tone={RELEASE_TYPE_TONES[r.release_type] || 'grey'}>{r.release_type}</Badge>
            <strong style={{ marginLeft: 8 }}>{r.version}</strong>
            <span className="muted" style={{ marginLeft: 8 }}>{r.title}</span>
          </div>
          <div className="timeline-item__source">
            <span className="muted">{r.entries?.length || 0} changes</span>
            {r.author && <span className="muted"> — {r.author}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── CompareView ──────────────────────────────────────────── */
function CompareView({ releases, onCompare }) {
  const [verA, setVerA] = useState('');
  const [verB, setVerB] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    if (!verA || !verB) return;
    setLoading(true);
    try {
      const res = await changelogService.compareVersions(verA, verB);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  const versionOptions = (releases || []).map(r => r.version).filter(Boolean);

  return (
    <div>
      <div className="toolbar-row">
        <select className="select" value={verA} onChange={(e) => setVerA(e.target.value)}>
          <option value="">Select version A (older)</option>
          {versionOptions.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <span className="muted">vs</span>
        <select className="select" value={verB} onChange={(e) => setVerB(e.target.value)}>
          <option value="">Select version B (newer)</option>
          {versionOptions.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <Button onClick={handleCompare} loading={loading} disabled={!verA || !verB}>Compare</Button>
      </div>

      {result && (
        <div className="cl-compare">
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <StatCard icon="plus" value={result.added?.length || 0} label="Added" />
            <StatCard icon="check" value={result.modified?.length || 0} label="Modified" />
            <StatCard icon="close" value={result.removed?.length || 0} label="Removed" />
            <StatCard icon="shield" value={result.fixed?.length || 0} label="Fixed" />
            <StatCard icon="alert" value={result.breaking?.length || 0} label="Breaking" />
          </div>

          <div className="grid-2" style={{ marginTop: 16 }}>
            <Card title={`Added (${result.added?.length || 0})`}>
              {(!result.added || result.added.length === 0) ? <p className="muted">No additions</p> : (
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  {result.added.map((e, i) => <li key={i} style={{ marginBottom: 6 }}><strong>{e.title}</strong>{e.description && <p className="muted" style={{ margin: '2px 0 0' }}>{e.description}</p>}</li>)}
                </ul>
              )}
            </Card>
            <Card title={`Removed (${result.removed?.length || 0})`}>
              {(!result.removed || result.removed.length === 0) ? <p className="muted">No removals</p> : (
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  {result.removed.map((e, i) => <li key={i} style={{ marginBottom: 6 }}><strong>{e.title}</strong>{e.description && <p className="muted" style={{ margin: '2px 0 0' }}>{e.description}</p>}</li>)}
                </ul>
              )}
            </Card>
          </div>

          {result.breaking && result.breaking.length > 0 && (
            <Card title={`Breaking Changes (${result.breaking.length})`} className="mt-16">
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                {result.breaking.map((e, i) => <li key={i} style={{ marginBottom: 6 }}><strong>{e.title}</strong>{e.description && <p className="muted" style={{ margin: '2px 0 0' }}>{e.description}</p>}</li>)}
              </ul>
            </Card>
          )}
        </div>
      )}

      {!result && !loading && (
        <EmptyState icon="move" title="Compare Versions" hint="Select two versions above to see what changed between them." />
      )}
    </div>
  );
}

/* ── ReleaseForm Modal ────────────────────────────────────── */
function ReleaseForm({ open, release, onClose, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (release) {
      setForm({
        version: release.version || '',
        release_date: release.release_date ? release.release_date.slice(0, 10) : '',
        release_time: release.release_time || '',
        timezone: release.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        build_number: release.build_number || '',
        release_type: release.release_type || 'patch',
        title: release.title || '',
        description: release.description || '',
        summary: release.summary || '',
        status: release.status || 'planned',
        author: release.author || '',
        environment: release.environment || 'production',
        related_issue: release.related_issue || '',
        git_commit_hash: release.git_commit_hash || '',
      });
    } else {
      setForm({
        version: '', release_date: '', release_time: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        build_number: '', release_type: 'patch', title: '', description: '', summary: '',
        status: 'planned', author: '', environment: 'production', related_issue: '',
        git_commit_hash: '',
      });
    }
  }, [release, open]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        ...form,
        release_date: form.release_date ? new Date(form.release_date).toISOString() : null,
      };
      if (release) {
        await changelogService.updateRelease(release.id, data);
      } else {
        await changelogService.createRelease(data);
        await new Promise(r => setTimeout(r, 300));
      }
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={release ? 'Edit Release' : 'New Release'} onClose={onClose} size="lg"
      footer={<div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={handleSave} loading={saving}>{release ? 'Update' : 'Create'}</Button></div>}
    >
      <div className="input-row">
        <div className="field" style={{ flex: '0 0 180px' }}>
          <label className="field__label">Version *</label>
          <input className="input" placeholder="v1.0.0" value={form.version} onChange={(e) => set('version', e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">Release Type *</label>
          <select className="select" value={form.release_type} onChange={(e) => set('release_type', e.target.value)}>
            {changelogService.RELEASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field__label">Status *</label>
          <select className="select" value={form.status} onChange={(e) => set('status', e.target.value)}>
            {changelogService.STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field__label">Title *</label>
        <input className="input" placeholder="Release title" value={form.title} onChange={(e) => set('title', e.target.value)} />
      </div>

      <div className="input-row">
        <div className="field">
          <label className="field__label">Release Date</label>
          <input className="input" type="date" value={form.release_date} onChange={(e) => set('release_date', e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">Release Time</label>
          <input className="input" type="time" value={form.release_time} onChange={(e) => set('release_time', e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">Timezone</label>
          <input className="input" value={form.timezone} onChange={(e) => set('timezone', e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">Build Number</label>
          <input className="input" placeholder="e.g. 2024.1.42" value={form.build_number} onChange={(e) => set('build_number', e.target.value)} />
        </div>
      </div>

      <div className="input-row">
        <div className="field">
          <label className="field__label">Author *</label>
          <input className="input" placeholder="Author name" value={form.author} onChange={(e) => set('author', e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">Environment</label>
          <select className="select" value={form.environment} onChange={(e) => set('environment', e.target.value)}>
            {changelogService.ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field__label">Related Issue</label>
          <input className="input" placeholder="e.g. #123" value={form.related_issue} onChange={(e) => set('related_issue', e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">Git Commit Hash</label>
          <input className="input" placeholder="e.g. a1b2c3d" value={form.git_commit_hash} onChange={(e) => set('git_commit_hash', e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label className="field__label">Summary</label>
        <input className="input" placeholder="Brief summary of this release" value={form.summary} onChange={(e) => set('summary', e.target.value)} />
      </div>

      <div className="field">
        <label className="field__label">Description</label>
        <textarea className="textarea" placeholder="Detailed release notes..." value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} />
      </div>
    </Modal>
  );
}

/* ── EntryForm Modal ──────────────────────────────────────── */
function EntryForm({ open, release, entry, onClose, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setForm({
        type: entry.type || 'Improvement',
        category: entry.category || 'Improvement',
        title: entry.title || '',
        description: entry.description || '',
        author: entry.author || '',
        related_issue: entry.related_issue || '',
      });
    } else {
      setForm({
        type: 'Improvement',
        category: 'Improvement',
        title: '',
        description: '',
        author: '',
        related_issue: '',
      });
    }
  }, [entry, open]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (entry) {
        await changelogService.updateEntry(entry.id, form);
      } else {
        await changelogService.createEntry({ ...form, release_id: release.id });
      }
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const entries = release?.entries || [];

  const handleDelete = async (eid) => {
    await changelogService.deleteEntry(eid);
    onSave();
  };

  return (
    <Modal open={open} title={entry ? 'Edit Change Entry' : `Add Change Entry — ${release?.version || ''}`} onClose={onClose} size="lg"
      footer={<div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={onClose}>Done</Button><Button onClick={handleSave} loading={saving}>{entry ? 'Update' : 'Add Entry'}</Button></div>}
    >
      {!entry && (
        <div className="cl-entry-list" style={{ marginBottom: 16 }}>
          <label className="field__label">Existing Entries ({entries.length})</label>
          {entries.length === 0 ? <p className="muted">No entries yet.</p> : (
            <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: 8 }}>
              {entries.map((e) => (
                <div key={e.id} className="list-row" style={{ cursor: 'default' }} onClick={() => {}}>
                  <div style={{ flex: 1 }}>
                    <Badge tone={CATEGORY_BADGE_TONES[e.category] || 'grey'}>{e.category}</Badge>
                    <span style={{ marginLeft: 8 }}>{e.title}</span>
                  </div>
                  <div className="row-actions">
                    <button className="iconbtn" onClick={() => { setForm({ type: e.type, category: e.category, title: e.title, description: e.description, author: e.author, related_issue: e.related_issue }); }}><Icon name="edit" size={14} /></button>
                    <button className="iconbtn iconbtn--danger" onClick={() => handleDelete(e.id)}><Icon name="trash" size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="input-row">
        <div className="field">
          <label className="field__label">Category</label>
          <select className="select" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {changelogService.CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field__label">Type</label>
          <select className="select" value={form.type} onChange={(e) => set('type', e.target.value)}>
            {changelogService.CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field__label">Title *</label>
        <input className="input" placeholder="Change title" value={form.title} onChange={(e) => set('title', e.target.value)} />
      </div>

      <div className="field">
        <label className="field__label">Description</label>
        <textarea className="textarea" placeholder="Detailed description of the change..." value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
      </div>

      <div className="input-row">
        <div className="field">
          <label className="field__label">Author</label>
          <input className="input" placeholder="Author name" value={form.author} onChange={(e) => set('author', e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">Related Issue</label>
          <input className="input" placeholder="e.g. #123" value={form.related_issue} onChange={(e) => set('related_issue', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

/* ── Main Changelog Page ──────────────────────────────────── */
export default function Changelog() {
  const toast = useToast();
  const [tab, setTab] = useState('list');
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({});
  const [releaseFormOpen, setReleaseFormOpen] = useState(false);
  const [editRelease, setEditRelease] = useState(null);
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [entryRelease, setEntryRelease] = useState(null);
  const [editEntry, setEditEntry] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        changelogService.listReleases(),
        changelogService.getStats(),
      ]);
      setReleases(r || []);
      setStats(s);
    } catch (err) {
      toast.error('Failed to load changelog data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredReleases = useMemo(() => {
    let list = releases;
    if (filters.query) {
      const q = filters.query.toLowerCase();
      list = list.filter(r =>
        (r.version && r.version.toLowerCase().includes(q)) ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.author && r.author.toLowerCase().includes(q)) ||
        (r.entries && r.entries.some(e =>
          (e.title && e.title.toLowerCase().includes(q)) ||
          (e.description && e.description.toLowerCase().includes(q))
        ))
      );
    }
    if (filters.releaseType) list = list.filter(r => r.release_type === filters.releaseType);
    if (filters.status) list = list.filter(r => r.status === filters.status);
    if (filters.environment) list = list.filter(r => r.environment === filters.environment);
    if (filters.category) {
      list = list.filter(r => r.entries && r.entries.some(e => e.category === filters.category));
    }
    return list;
  }, [releases, filters]);

  const handleCreateRelease = () => {
    setEditRelease(null);
    setReleaseFormOpen(true);
  };

  const handleEditRelease = (r) => {
    setEditRelease(r);
    setReleaseFormOpen(true);
  };

  const handleDeleteRelease = async (r) => {
    if (!confirm(`Delete release ${r.version}? This will also delete all entries.`)) return;
    await changelogService.deleteRelease(r.id);
    toast.success(`Release ${r.version} deleted`);
    loadData();
  };

  const handleManageEntries = (r) => {
    setEntryRelease(r);
    setEditEntry(null);
    setEntryFormOpen(true);
  };

  const handleExport = async (format) => {
    try {
      await changelogService.downloadExport(format);
      toast.success(`Changelog exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    }
  };

  const latestVersion = stats?.latestVersion || changelogService.getLatestVersion(releases);

  if (loading) return <div className="loading-block" style={{ marginTop: 40 }}><span className="spinner" /><span>Loading changelog…</span></div>;

  return (
    <div className="cl-page">
      <PageHeader icon="history" title="Changelog"
        subtitle={latestVersion ? `Current version: ${latestVersion} — ${releases.length} release${releases.length !== 1 ? 's' : ''} total` : 'Release history'}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="seg">
              <button className={`seg__btn ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}><Icon name="list" size={14} /> List</button>
              <button className={`seg__btn ${tab === 'timeline' ? 'active' : ''}`} onClick={() => setTab('timeline')}><Icon name="clock" size={14} /> Timeline</button>
              <button className={`seg__btn ${tab === 'compare' ? 'active' : ''}`} onClick={() => setTab('compare')}><Icon name="move" size={14} /> Compare</button>
            </div>
            <Button icon="download" onClick={() => handleExport('json')}>JSON</Button>
            <Button icon="download" onClick={() => handleExport('csv')}>CSV</Button>
            <Button icon="download" onClick={() => handleExport('markdown')}>MD</Button>
            <Button icon="plus" onClick={handleCreateRelease}>New Release</Button>
          </div>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="stat-grid">
          <StatCard icon="history" value={stats.totalReleases} label="Total Releases" />
          <StatCard icon="badge" value={stats.latestVersion || '—'} label="Latest Version" />
          <StatCard icon="arrow" value={stats.majorReleases} label="Major" />
          <StatCard icon="chevron" value={stats.minorReleases} label="Minor" />
          <StatCard icon="check" value={stats.patchReleases} label="Patches" />
          <StatCard icon="alert" value={stats.hotfixes} label="Hotfixes" />
          <StatCard icon="star" value={stats.totalFeatures} label="Features" />
          <StatCard icon="shield" value={stats.totalBugFixes} label="Bug Fixes" />
          <StatCard icon="scan" value={stats.totalImprovements} label="Improvements" />
          <StatCard icon="alert" value={stats.totalBreakingChanges} label="Breaking" />
        </div>
      )}

      {/* Filters */}
      {tab === 'list' && <FilterBar filters={filters} onChange={setFilters} />}

      {/* Content */}
      {tab === 'list' && (
        <>
          {filteredReleases.length === 0 ? (
            <EmptyState icon="history" title={releases.length === 0 ? 'No releases yet' : 'No matching releases'}
              hint={releases.length === 0 ? 'Create your first changelog release to start tracking changes.' : 'Try adjusting your filters.'}
              action={releases.length === 0 ? <Button icon="plus" onClick={handleCreateRelease}>Create Release</Button> : null}
            />
          ) : (
            <div className="cl-release-list">
              {filteredReleases.map((r, i) => (
                <ReleaseCard key={r.id} release={r} defaultOpen={i === 0}
                  onEdit={handleEditRelease} onDelete={handleDeleteRelease} onManageEntries={handleManageEntries}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'timeline' && <TimelineView releases={filteredReleases} />}
      {tab === 'compare' && <CompareView releases={releases} />}

      {/* Modals */}
      <ReleaseForm open={releaseFormOpen} release={editRelease} onClose={() => { setReleaseFormOpen(false); setEditRelease(null); }} onSave={loadData} />
      <EntryForm open={entryFormOpen} release={entryRelease} entry={editEntry} onClose={() => { setEntryFormOpen(false); setEntryRelease(null); setEditEntry(null); }} onSave={loadData} />
    </div>
  );
}
