import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { judgmentsRepository } from '@/data-layer/repositories/judgmentsRepository.js';
import { useFormat } from '@/utils/format.js';
import AddJudgmentModal from './AddJudgmentModal.jsx';

const TABLE_HEADERS = [
  { key: 'checkbox', label: '' },
  { key: 'title', label: 'Judgment Title & Parties' },
  { key: 'citation', label: 'Citation', sortable: true },
  { key: 'court', label: 'Court / Bench' },
  { key: 'judges', label: 'Judge(s)' },
  { key: 'date', label: 'Judgment Date', sortable: true },
  { key: 'caseNumber', label: 'Case Number' },
  { key: 'status', label: 'Status' },
  { key: 'favourite', label: 'Favourite' },
  { key: 'updated', label: 'Last Updated' },
  { key: 'actions', label: 'Actions' },
];

const FILTER_DEFAULTS = {
  court: '',
  judge: '',
  type: '',
  matterType: '',
  act: '',
  year: '',
};

export default function JudgmentLibrary() {
  const navigate = useNavigate();
  const { formatDate } = useFormat();
  const [judgments, setJudgments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [favourites, setFavourites] = useState({});
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [showAddModal, setShowAddModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 991px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    handler(mql);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    judgmentsRepository.getAll()
      .then((data) => setJudgments(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const uniqueValues = useMemo(() => {
    const courts = new Set();
    const judges = new Set();
    const types = new Set();
    const years = new Set();
    judgments.forEach((j) => {
      if (j.court) courts.add(j.court);
      if (j.judge || j.bench) judges.add(j.judge || j.bench);
      if (j.type) types.add(j.type);
      if (j.date) {
        try { years.add(new Date(j.date).getFullYear()); } catch {}
      }
    });
    return {
      courts: Array.from(courts).sort(),
      judges: Array.from(judges).sort(),
      types: Array.from(types).sort(),
      years: Array.from(years).sort(),
    };
  }, [judgments]);

  const stats = useMemo(() => {
    const list = judgments;
    const total = list.length;
    const active = list.filter((j) => !j.archived).length;
    const archived = list.filter((j) => j.archived).length;
    const favourite = list.filter((j) => j.favourite || j.favorited).length;
    const recentlyAdded = list.filter((j) => {
      if (!j.createdAt && !j.date) return false;
      return Date.now() - new Date(j.createdAt || j.date) < 30 * 24 * 60 * 60 * 1000;
    }).length;
    const supreme = list.filter((j) => (j.court || '').toLowerCase().includes('supreme')).length;
    const highCourt = list.filter((j) => (j.court || '').toLowerCase().includes('high')).length;
    const tribunal = list.filter((j) => (j.court || '').toLowerCase().includes('tribunal')).length;
    return { total, active, archived, favourite, recentlyAdded, recentlyViewed: 89, supreme, highCourt, tribunal };
  }, [judgments]);

  const filtered = useMemo(() => {
    let rows = [...judgments];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((j) =>
        (j.caseName || j.title || '').toLowerCase().includes(q) ||
        (j.citation || '').toLowerCase().includes(q) ||
        (j.caseNumber || '').toLowerCase().includes(q) ||
        (j.court || '').toLowerCase().includes(q) ||
        (j.judge || j.bench || '').toLowerCase().includes(q) ||
        (j.keywords || []).join(' ').toLowerCase().includes(q)
      );
    }
    if (filters.court) rows = rows.filter((j) => (j.court || '') === filters.court);
    if (filters.judge) rows = rows.filter((j) => (j.judge || j.bench || '') === filters.judge);
    if (filters.type) rows = rows.filter((j) => (j.type || '') === filters.type);
    if (filters.year) {
      rows = rows.filter((j) => {
        try { return new Date(j.date).getFullYear() === Number(filters.year); } catch { return false; }
      });
    }
    return rows;
  }, [judgments, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const allSelected = paged.length > 0 && paged.every((j) => selected.includes(j.id));
  const toggleAll = () => setSelected(allSelected ? [] : paged.map((j) => j.id));
  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleFavourite = (id) => setFavourites((prev) => ({ ...prev, [id]: !prev[id] }));

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(FILTER_DEFAULTS);
    setSearch('');
    setPage(1);
  };

  const pageNumbers = useMemo(() => {
    const total = totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    if (safePage > 3) pages.push('...');
    const start = Math.max(2, safePage - 1);
    const end = Math.min(total - 1, safePage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (safePage < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }, [safePage, totalPages]);

  if (loading) {
    return (
      <div className="fade-in">
        <div className="loading-block"><span className="spinner" /> Loading judgments…</div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {!isMobile ? (
        <>
          <div className="bench-types__hero">
            <div className="bench-types__hero-icon"><Icon name="book" size={34} /></div>
            <div className="bench-types__hero-text">
              <h2>Case Precedents / Judgments</h2>
              <p>Browse, search, and manage archived judgments and case precedents.</p>
              <div className="bench-types__hero-accent" />
            </div>
            <Button icon="plus" style={{ marginLeft: 'auto' }} onClick={() => setShowAddModal(true)}>Add Judgment</Button>
            <Icon name="book" className="bench-types__hero-watermark bench-types__watermark-icon" />
          </div>

          <div className="jl-stats-row jl-stats-row--4">
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--purple"><Icon name="book" size={22} strokeWidth={2} /></div>
              <div>
                <div className="jl-stat-label">Total Judgments</div>
                <div className="jl-stat-value">{stats.total.toLocaleString()}</div>
                <div className="jl-stat-sub">All time</div>
              </div>
            </div>
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--green"><Icon name="check-circle" size={22} strokeWidth={2.2} /></div>
              <div>
                <div className="jl-stat-label">Active Judgments</div>
                <div className="jl-stat-value">{stats.active.toLocaleString()}</div>
                <div className="jl-stat-sub">{stats.total ? Math.round(stats.active / stats.total * 100) : 0}% of total</div>
              </div>
            </div>
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--orange"><Icon name="archive" size={22} strokeWidth={2} /></div>
              <div>
                <div className="jl-stat-label">Archived Judgments</div>
                <div className="jl-stat-value">{stats.archived.toLocaleString()}</div>
                <div className="jl-stat-sub">{stats.total ? Math.round(stats.archived / stats.total * 100) : 0}% of total</div>
              </div>
            </div>
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--pink"><Icon name="heart" size={22} fill /></div>
              <div>
                <div className="jl-stat-label">Favourite Judgments</div>
                <div className="jl-stat-value">{stats.favourite.toLocaleString()}</div>
                <div className="jl-stat-sub">{stats.total ? Math.round(stats.favourite / stats.total * 100) : 0}% of total</div>
              </div>
            </div>
          </div>

          <div className="jl-stats-row jl-stats-row--5">
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--blue"><Icon name="clock" size={20} strokeWidth={2} /></div>
              <div>
                <div className="jl-stat-label">Recently Added</div>
                <div className="jl-stat-value jl-stat-value--sm">{stats.recentlyAdded}</div>
                <div className="jl-stat-sub">This Month</div>
              </div>
            </div>
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--teal"><Icon name="eye" size={20} strokeWidth={2} /></div>
              <div>
                <div className="jl-stat-label">Recently Viewed</div>
                <div className="jl-stat-value jl-stat-value--sm">{stats.recentlyViewed}</div>
                <div className="jl-stat-sub">This Month</div>
              </div>
            </div>
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--deep-purple"><Icon name="building" size={20} strokeWidth={2} /></div>
              <div>
                <div className="jl-stat-label">Supreme Court</div>
                <div className="jl-stat-value jl-stat-value--sm">{stats.supreme.toLocaleString()}</div>
                <div className="jl-stat-sub">{stats.total ? Math.round(stats.supreme / stats.total * 100) : 0}%</div>
              </div>
            </div>
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--sky"><Icon name="building" size={20} strokeWidth={2} /></div>
              <div>
                <div className="jl-stat-label">High Court</div>
                <div className="jl-stat-value jl-stat-value--sm">{stats.highCourt.toLocaleString()}</div>
                <div className="jl-stat-sub">{stats.total ? Math.round(stats.highCourt / stats.total * 100) : 0}%</div>
              </div>
            </div>
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--gold"><Icon name="scales" size={20} strokeWidth={2} /></div>
              <div>
                <div className="jl-stat-label">Tribunal Judgments</div>
                <div className="jl-stat-value jl-stat-value--sm">{stats.tribunal.toLocaleString()}</div>
                <div className="jl-stat-sub">{stats.total ? Math.round(stats.tribunal / stats.total * 100) : 0}%</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="bench-types__hero" style={{ margin: '0 0 20px' }}>
            <div className="bench-types__hero-icon"><Icon name="book" size={34} /></div>
            <div className="bench-types__hero-text">
              <h2>Case Precedents</h2>
              <p>Browse, search, and manage archived judgments.</p>
              <div className="bench-types__hero-accent" />
              <Button icon="plus">Add Judgment</Button>
            </div>
            <Icon name="book" className="bench-types__hero-watermark bench-types__watermark-icon" />
          </div>

          <div className="bench-types__stat-cards bench-types__mobile-only" style={{ margin: '0 0 18px' }}>
            <div className="bench-types__stat-card bench-types__stat-card--total">
              <div className="bench-types__stat-card-row1">
                <div className="bench-types__stat-card-icon"><Icon name="book" size={18} /></div>
                <span className="bench-types__stat-card-num">{stats.total.toLocaleString()}</span>
              </div>
              <div className="bench-types__stat-card-label">TOTAL</div>
            </div>
            <div className="bench-types__stat-card bench-types__stat-card--active">
              <div className="bench-types__stat-card-row1">
                <div className="bench-types__stat-card-icon"><Icon name="check-circle" size={18} /></div>
                <span className="bench-types__stat-card-num">{stats.active.toLocaleString()}</span>
              </div>
              <div className="bench-types__stat-card-label">ACTIVE</div>
            </div>
            <div className="bench-types__stat-card bench-types__stat-card--inactive">
              <div className="bench-types__stat-card-row1">
                <div className="bench-types__stat-card-icon"><Icon name="heart" size={18} /></div>
                <span className="bench-types__stat-card-num">{stats.favourite.toLocaleString()}</span>
              </div>
              <div className="bench-types__stat-card-label">FAVOURITES</div>
            </div>
          </div>
        </>
      )}

      <div className="jl-toolbar">
        <div className="jl-search-box">
          <Icon name="search" size={15} />
          <input
            placeholder="Search by title, citation, case number, party, judge, court, act, section, keyword..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Button icon="plus">Add Judgment</Button>
        <Button variant="ghost" icon="download">Import</Button>
        <Button variant="ghost" icon="upload">Export</Button>
        <Button variant="ghost" icon="more-horizontal">More</Button>
      </div>

      <div className="jl-filter-row">
        <select className="jl-filter-select jl-filter-select--native" value={filters.court} onChange={(e) => setFilter('court', e.target.value)}>
          <option value="">All Courts</option>
          {uniqueValues.courts.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="jl-filter-select jl-filter-select--native" value={filters.judge} onChange={(e) => setFilter('judge', e.target.value)}>
          <option value="">All Judges</option>
          {uniqueValues.judges.map((j) => <option key={j} value={j}>{j}</option>)}
        </select>
        <select className="jl-filter-select jl-filter-select--native" value={filters.type} onChange={(e) => setFilter('type', e.target.value)}>
          <option value="">All Types</option>
          {uniqueValues.types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="jl-filter-select">
          <span className="jl-filter-select__label">Matter Type</span>
          <span className="jl-filter-select__value">All Matter Types</span>
        </div>
        <div className="jl-filter-select">
          <span className="jl-filter-select__label">Act</span>
          <span className="jl-filter-select__value">All Acts</span>
        </div>
        <select className="jl-filter-select jl-filter-select--native" value={filters.year} onChange={(e) => setFilter('year', e.target.value)}>
          <option value="">All Years</option>
          {uniqueValues.years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <Button variant="ghost" icon="filter">More Filters</Button>
        <Button variant="ghost" onClick={clearFilters}>Clear</Button>
      </div>

      <Card bodyClass="card__body--flush">
        <div className="table-scroll">
          <table className="table">
            <thead className="jl-thead">
              <tr>
                {TABLE_HEADERS.map((h) => (
                  <th key={h.key} className={h.sortable ? 'th--sortable' : ''}>
                    {h.key === 'checkbox' ? (
                      <input type="checkbox" checked={allSelected && paged.length > 0} onChange={toggleAll} disabled={paged.length === 0} />
                    ) : (
                      h.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_HEADERS.length} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-faint)' }}>
                    <Icon name="book" size={24} />
                    <p style={{ marginTop: 8 }}>No judgments found.</p>
                  </td>
                </tr>
              ) : (
                paged.map((j) => {
                  const isFav = favourites[j.id] ?? j.favourite ?? j.favorited ?? false;
                  return (
                    <tr key={j.id}>
                      <td><input type="checkbox" checked={selected.includes(j.id)} onChange={() => toggleOne(j.id)} /></td>
                      <td>
                        <div className="jl-case-title">{j.caseName || j.title || j.citation || 'Untitled'}</div>
                        {j.title !== j.caseName && j.caseName && <div className="jl-case-sub">{j.title}</div>}
                        {!j.caseName && j.parties && <div className="jl-case-sub">{j.parties}</div>}
                      </td>
                      <td className="jl-cell-muted">{j.citation || '—'}</td>
                      <td className="jl-cell-strong">
                        {j.court || '—'}
                        {j.bench ? <><br />{j.bench}</> : null}
                      </td>
                      <td className="jl-cell-strong">{j.judge || j.bench || '—'}</td>
                      <td className="jl-cell-muted">{j.date ? formatDate(j.date) : '—'}</td>
                      <td className="jl-cell-muted">{j.caseNumber || '—'}</td>
                      <td>
                        <span className={`jl-status-pill ${j.archived ? 'jl-status--archived' : 'jl-status--active'}`}>
                          {j.archived ? 'Archived' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <button className={`jl-heart-btn ${isFav ? 'jl-heart-btn--filled' : ''}`} onClick={() => toggleFavourite(j.id)}>
                          <Icon name="heart" size={15} fill={isFav} />
                        </button>
                      </td>
                      <td className="jl-cell-muted">{j.updatedAt || j.createdAt || j.date ? formatDate(j.updatedAt || j.createdAt || j.date) : '—'}</td>
                      <td>
                        <div className="jl-actions">
                          <button title="View" onClick={() => navigate(`/research/judgment-library/${j.id}`)}><Icon name="eye" size={15} /></button>
                          <button title="Edit"><Icon name="pen" size={15} /></button>
                          <button title="Copy"><Icon name="copy" size={15} /></button>
                          <button title="More"><Icon name="more-vertical" size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="jl-pagination-row">
          <div className="jl-showing-text">
            {filtered.length === 0
              ? 'No judgments to show'
              : `Showing ${(safePage - 1) * perPage + 1} to ${Math.min(safePage * perPage, filtered.length)} of ${filtered.length} judgments`
            }
          </div>
          <div className="jl-pagination">
            <button className="jl-page-btn jl-page-btn--nav" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹</button>
            {pageNumbers.map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="jl-page-btn jl-page-btn--nav">…</span>
              ) : (
                <button key={p} className={`jl-page-btn ${safePage === p ? 'jl-page-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              )
            )}
            <button className="jl-page-btn jl-page-btn--nav" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>›</button>
            <span className="jl-per-page">10 / page</span>
          </div>
        </div>
      </Card>

      <nav className="bench-types__bottom-nav bench-types__mobile-only">
        <button className="bench-types__nav-tab bench-types__nav-tab--active">
          <Icon name="home" size={20} />
          <span>Dashboard</span>
        </button>
        <button className="bench-types__nav-tab">
          <Icon name="briefcase" size={20} />
          <span>Matters</span>
        </button>
        <button className="bench-types__nav-fab">
          <Icon name="plus" size={24} />
        </button>
        <button className="bench-types__nav-tab">
          <Icon name="file" size={20} />
          <span>Order Sheet</span>
        </button>
        <button className="bench-types__nav-tab">
          <Icon name="calendar" size={20} />
          <span>Calendar</span>
        </button>
      </nav>
      <AddJudgmentModal open={showAddModal} onClose={() => setShowAddModal(false)} onSaved={() => judgmentsRepository.getAll().then((d) => setJudgments(d || [])).catch(() => {})} />
    </div>
  );
}
