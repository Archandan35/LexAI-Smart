import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';
import { hearingsRepository } from '@/data-layer/repositories/hearingsRepository.js';
import { reminderService } from '@/services/reminderService.js';
import { formatDate } from '@/utils/format.js';

const TABS = ['calendar', 'tasks'];

export default function Calendar() {
  const [tab, setTab] = useState('calendar');
  const [events, setEvents] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      hearingsRepository.getAll().catch(() => []),
      reminderService.list().catch(() => []),
    ]).then(([hearings, r]) => {
      const h = (Array.isArray(hearings) ? hearings : []).map((h) => ({ ...h, eventType: 'hearing', title: h.title || h.caseName || 'Hearing' }));
      setEvents(h);
      setReminders(Array.isArray(r) ? r : []);
    }).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.date) >= now);
  const allItems = [...events, ...reminders.map((r) => ({ ...r, eventType: 'reminder' }))];

  const reminderStats = {
    pending: reminders.filter((r) => !r.done).length,
    overdue: reminders.filter((r) => !r.done && new Date(r.date) < now).length,
    completedToday: reminders.filter((r) => r.done && new Date(r.updatedAt || r.updated_at || now).toDateString() === now.toDateString()).length,
    active: reminders.filter((r) => !r.done).length,
  };

  return (
    <div className="fade-in">
      <PageHeader icon="calendar" title="Calendar & Tasks" subtitle="Manage court dates, hearings, events, and tasks." />

      <div className="seg mb-18">
        {TABS.map((t) => (
          <button key={t} className={`seg__btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            <Icon name={t === 'calendar' ? 'calendar' : 'check'} size={14} /> {t === 'calendar' ? 'Calendar' : 'Tasks'}
          </button>
        ))}
      </div>

      {tab === 'calendar' ? (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-card__icon"><Icon name="mic" size={20} /></div>
              <div className="stat-card__value">{events.length}</div>
              <div className="stat-card__label">Hearings</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon"><Icon name="clock" size={20} /></div>
              <div className="stat-card__value">{upcoming.length}</div>
              <div className="stat-card__label">Upcoming Events</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon"><Icon name="bell" size={20} /></div>
              <div className="stat-card__value">{reminderStats.pending}</div>
              <div className="stat-card__label">Pending Tasks</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon"><Icon name="grid" size={20} /></div>
              <div className="stat-card__value">{allItems.length}</div>
              <div className="stat-card__label">Total Items</div>
            </div>
          </div>

          <Card title="Upcoming Events">
            {loading ? (
              <div className="empty"><span className="spinner" /></div>
            ) : allItems.length === 0 ? (
              <div className="empty">
                <Icon name="calendar" size={48} />
                <h3>No upcoming events scheduled.</h3>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr><th>Type</th><th>Title</th><th>Date</th><th>Case</th></tr>
                  </thead>
                  <tbody>
                    {[...allItems].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 20).map((e) => (
                      <tr key={e.id}>
                        <td><span className={`badge ${e.eventType === 'hearing' ? 'badge--navy' : e.done ? 'badge--green' : new Date(e.date) < now ? 'badge--red' : 'badge--amber'}`}>{e.eventType === 'hearing' ? 'Hearing' : e.done ? 'Done' : new Date(e.date) < now ? 'Overdue' : 'Task'}</span></td>
                        <td>{e.title}</td>
                        <td>{formatDate(e.date)}</td>
                        <td>{e.caseId || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-card__icon"><Icon name="check" size={20} /></div>
              <div className="stat-card__value">{reminderStats.pending}</div>
              <div className="stat-card__label">Pending Tasks</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon"><Icon name="alert" size={20} /></div>
              <div className="stat-card__value">{reminderStats.overdue}</div>
              <div className="stat-card__label">Overdue</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon"><Icon name="grid" size={20} /></div>
              <div className="stat-card__value">{reminderStats.completedToday}</div>
              <div className="stat-card__label">Completed Today</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon"><Icon name="bell" size={20} /></div>
              <div className="stat-card__value">{reminderStats.active}</div>
              <div className="stat-card__label">Reminders Active</div>
            </div>
          </div>

          <Card title="My Tasks">
            {loading ? (
              <div className="empty"><span className="spinner" /></div>
            ) : reminders.length === 0 ? (
              <div className="empty">
                <Icon name="check" size={48} />
                <h3>No pending tasks.</h3>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr><th>Status</th><th>Title</th><th>Date</th><th>Type</th></tr>
                  </thead>
                  <tbody>
                    {[...reminders].sort((a, b) => new Date(a.date) - new Date(b.date)).map((r) => (
                      <tr key={r.id}>
                        <td>
                          {r.done ? (
                            <span className="badge badge--green">Done</span>
                          ) : new Date(r.date) < now ? (
                            <span className="badge badge--red">Overdue</span>
                          ) : (
                            <span className="badge badge--amber">Pending</span>
                          )}
                        </td>
                        <td>{r.title}</td>
                        <td>{formatDate(r.date)}</td>
                        <td>{r.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

