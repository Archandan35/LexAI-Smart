import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/hooks/useDashboard.js';
import Icon from '@/components/Icon.jsx';
import Card from '@/components/Card.jsx';
import Badge from '@/components/Badge.jsx';
import Spinner from '@/components/Spinner.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import { formatDate, fromNow } from '@/utils/format.js';
import { DRAFT_TYPE_MAP } from '@/constants/draftTypes.js';

const STAT_META = [
  { key: 'activeCases', label: 'Active Cases', icon: 'vault' },
  { key: 'drafts', label: 'Drafts', icon: 'pen' },
  { key: 'documents', label: 'Documents', icon: 'file' },
  { key: 'hearings', label: 'Upcoming Hearings', icon: 'calendar' },
];

export default function Dashboard() {
  const { data, loading } = useDashboard();
  const nav = useNavigate();

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (!data) return <EmptyState title="Could not load dashboard." />;

  const { stats, activeCases, recentDrafts, recentDocuments, upcomingHearings, recentCitations } = data;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header__text">
          <h1>Welcome back, Advocate</h1>
          <p>Your litigation cockpit — cases, drafts, hearings and verified authorities at a glance.</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--ghost" onClick={() => nav('/cases')}><Icon name="vault" size={16} /> Case Vault</button>
          <button className="btn btn--primary" onClick={() => nav('/drafting')}><Icon name="plus" size={16} /> New Draft</button>
        </div>
      </div>

      <div className="stat-grid">
        {STAT_META.map((s) => (
          <div className="stat-card" key={s.key}>
            <div className="stat-card__icon"><Icon name={s.icon} size={20} /></div>
            <div className="stat-card__value">{stats[s.key] ?? 0}</div>
            <div className="stat-card__label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card title="Upcoming Hearings" sub="Next dates across all matters">
            {upcomingHearings.length === 0 ? (
              <EmptyState icon="calendar" title="No upcoming hearings." />
            ) : upcomingHearings.map((h) => (
              <div className="list-row" key={h.id} onClick={() => nav('/cause-list')}>
                <div className="list-row__icon"><Icon name="calendar" size={17} /></div>
                <div style={{ flex: 1 }}>
                  <div className="list-row__title">{h.purpose || 'Hearing'}</div>
                  <div className="list-row__meta">{formatDate(h.date)}</div>
                </div>
                <Badge>{h.status}</Badge>
              </div>
            ))}
          </Card>

          <Card title="Recent Citations" sub="Verified authorities">
            {recentCitations.length === 0 ? (
              <EmptyState icon="search" title="Run a citation search." />
            ) : recentCitations.map((c) => (
              <div className="list-row" key={c.id} onClick={() => nav('/citations')}>
                <div className="list-row__icon"><Icon name="book" size={16} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="list-row__title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.citation}</div>
                  <div className="list-row__meta">{c.court}</div>
                </div>
                <Badge tone="green" dot>Verified</Badge>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card
            title="Active Cases"
            actions={<button className="btn btn--ghost btn--sm" onClick={() => nav('/cases')}>View all <Icon name="arrow" size={14} /></button>}
          >
            {activeCases.length === 0 ? <EmptyState icon="vault" title="No cases yet." /> : (
              <table className="table">
                <thead><tr><th>Case</th><th>Court</th><th>Stage</th><th>Next Date</th><th /></tr></thead>
                <tbody>
                  {activeCases.map((c) => (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/cases/${c.id}`)}>
                      <td>
                        <div style={{ fontWeight: 650 }}>{c.caseNumber}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{c.title}</div>
                      </td>
                      <td>{c.court}</td>
                      <td><Badge tone="navy">{c.stage}</Badge></td>
                      <td>{formatDate(c.nextHearing)}</td>
                      <td><Icon name="arrow" size={15} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <div className="grid-2">
            <Card title="Recent Drafts">
              {recentDrafts.length === 0 ? <EmptyState icon="pen" title="No drafts." /> : recentDrafts.map((d) => (
                <div className="list-row" key={d.id} onClick={() => nav('/drafting')}>
                  <div className="list-row__icon"><Icon name="doc" size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="list-row__title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</div>
                    <div className="list-row__meta">{DRAFT_TYPE_MAP[d.type]?.label || d.type} · {fromNow(d.updatedAt)}</div>
                  </div>
                </div>
              ))}
            </Card>
            <Card title="Recent Documents">
              {recentDocuments.length === 0 ? <EmptyState icon="file" title="No documents." /> : recentDocuments.map((d) => (
                <div className="list-row" key={d.id} onClick={() => nav('/documents')}>
                  <div className="list-row__icon"><Icon name="file" size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="list-row__title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                    <div className="list-row__meta">{d.folder} · {fromNow(d.uploadedAt)}</div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
