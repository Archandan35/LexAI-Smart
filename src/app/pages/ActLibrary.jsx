import { useState, useEffect } from 'react';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';
import { Select } from '@/components/Field.jsx';
import { actLogic } from '@/logic/actLogic.js';

export default function ActLibrary() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ totalActs: 0, totalSections: 0, totalAmendments: 0, lastUpdated: '—' });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [viewMode, setViewMode] = useState('list');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const load = () => {
    setLoading(true);
    Promise.all([actLogic.list(), actLogic.stats()]).then(([list, s]) => {
      setItems(Array.isArray(list) ? list : []);
      if (s && !s.error) setStats(s);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const types = [...new Set(items.map(i => i.act_type).filter(Boolean))];

  const filtered = items.filter(i => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType && i.act_type !== filterType) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'title') return a.title?.localeCompare?.(b.title) || 0;
    if (sortBy === 'type') return (a.act_type || '').localeCompare(b.act_type || '');
    if (sortBy === 'sections') return (b.sections_count || 0) - (a.sections_count || 0);
    if (sortBy === 'amendments') return (b.amendments_count || 0) - (a.amendments_count || 0);
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const activeActs = items.filter(i => (i.status || 'Active').toLowerCase() === 'active').length;
  const actsWithAmendments = items.filter(i => (i.amendments_count || 0) > 0).length;

  useEffect(() => { setPage(1); }, [search, filterType]);

  if (loading) return <div className="fade-in bench-types__loading"><div className="spinner" /></div>;

  const heroIcon = 'book';
  const heroWatermark = 'book';

  return (
    <div className="fade-in bench-types">
      <div className="bench-types__hero">
        <div className="bench-types__hero-icon"><Icon name={heroIcon} size={34} /></div>
        <div className="bench-types__hero-text">
          <h2>Acts Library</h2>
          <p>Browse and search legal acts, their sections, and amendments.</p>
          <div className="bench-types__hero-accent" />
        </div>
        <Icon name={heroWatermark} className="bench-types__hero-watermark bench-types__watermark-icon" />
      </div>

      {/* ── Desktop 6-stat row ── */}
      <div className="bench-types__stats-row">
        <div className="bench-types__statcard">
          <div className="bench-types__statcard-icon bench-types__statcard-icon--total"><Icon name="book" size={16} /></div>
          <div className="bench-types__statcard-body">
            <div className="bench-types__statcard-label">Total Acts</div>
            <div className="bench-types__statcard-value">{stats.totalActs}</div>
            <div className="bench-types__statcard-sub">All acts</div>
          </div>
        </div>
        <div className="bench-types__statcard">
          <div className="bench-types__statcard-icon bench-types__statcard-icon--active"><Icon name="file" size={16} /></div>
          <div className="bench-types__statcard-body">
            <div className="bench-types__statcard-label">Sections</div>
            <div className="bench-types__statcard-value">{stats.totalSections}</div>
            <div className="bench-types__statcard-sub">Total sections</div>
          </div>
        </div>
        <div className="bench-types__statcard">
          <div className="bench-types__statcard-icon bench-types__statcard-icon--inactive"><Icon name="layers" size={16} /></div>
          <div className="bench-types__statcard-body">
            <div className="bench-types__statcard-label">Amendments</div>
            <div className="bench-types__statcard-value bench-types__statcard-value--sm">{stats.totalAmendments}</div>
            <div className="bench-types__statcard-sub">Total amendments</div>
          </div>
        </div>
        <div className="bench-types__statcard">
          <div className="bench-types__statcard-icon bench-types__statcard-icon--most-used"><Icon name="check-circle" size={16} /></div>
          <div className="bench-types__statcard-body">
            <div className="bench-types__statcard-label">Active Acts</div>
            <div className="bench-types__statcard-value bench-types__statcard-value--sm">{activeActs}</div>
            <div className="bench-types__statcard-sub">Currently in force</div>
          </div>
        </div>
        <div className="bench-types__statcard">
          <div className="bench-types__statcard-icon bench-types__statcard-icon--created-month"><Icon name="calendar" size={16} /></div>
          <div className="bench-types__statcard-body">
            <div className="bench-types__statcard-label">With Amendments</div>
            <div className="bench-types__statcard-value bench-types__statcard-value--sm">{actsWithAmendments}</div>
            <div className="bench-types__statcard-sub">Acts amended</div>
          </div>
        </div>
        <div className="bench-types__statcard">
          <div className="bench-types__statcard-icon bench-types__statcard-icon--assignments"><Icon name="clock" size={16} /></div>
          <div className="bench-types__statcard-body">
            <div className="bench-types__statcard-label">Last Updated</div>
            <div className="bench-types__statcard-value bench-types__statcard-value--sm">{stats.lastUpdated !== '—' ? new Date(stats.lastUpdated).toLocaleDateString() : '—'}</div>
            <div className="bench-types__statcard-sub">Most recent update</div>
          </div>
        </div>
      </div>

      {/* ── Toolbar: search, filters, view toggle ── */}
      <Card bodyClass="card__body--flush" style={{ marginBottom: 16 }}>
        <div style={{ padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <div className="bench-types__search">
              <Icon name="search" size={18} />
              <input value={search} placeholder="Search acts by title..." autoComplete="off" onChange={e => setSearch(e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ width: 160 }}>
            <Select value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div style={{ width: 160 }}>
            <Select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="title">Sort: Title</option>
              <option value="type">Sort: Type</option>
              <option value="sections">Sort: Sections</option>
              <option value="amendments">Sort: Amendments</option>
            </Select>
          </div>
          <div className="bench-types__view-toggle">
            <button className={`bench-types__view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')} title="List view">
              <Icon name="list" size={16} />
            </button>
            <button className={`bench-types__view-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')} title="Grid view">
              <Icon name="grid" size={16} />
            </button>
          </div>
        </div>
      </Card>

      {/* ── Mobile stat cards ── */}
      <div className="bench-types__stat-cards bench-types__mobile-only">
        <div className="bench-types__stat-card bench-types__stat-card--total">
          <div className="bench-types__stat-card-row1">
            <div className="bench-types__stat-card-icon"><Icon name="book" size={18} /></div>
            <span className="bench-types__stat-card-num">{stats.totalActs}</span>
          </div>
          <div className="bench-types__stat-card-label">ACTS</div>
        </div>
        <div className="bench-types__stat-card bench-types__stat-card--active">
          <div className="bench-types__stat-card-row1">
            <div className="bench-types__stat-card-icon"><Icon name="file" size={18} /></div>
            <span className="bench-types__stat-card-num">{stats.totalSections}</span>
          </div>
          <div className="bench-types__stat-card-label">SECTIONS</div>
        </div>
        <div className="bench-types__stat-card bench-types__stat-card--inactive">
          <div className="bench-types__stat-card-row1">
            <div className="bench-types__stat-card-icon"><Icon name="layers" size={18} /></div>
            <span className="bench-types__stat-card-num">{stats.totalAmendments}</span>
          </div>
          <div className="bench-types__stat-card-label">AMENDMENTS</div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          <div className="bench-types__table-card">
            <table className="bench-types__table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>TITLE</th>
                  <th>TYPE</th>
                  <th>JURISDICTION</th>
                  <th>SECTIONS</th>
                  <th>AMENDMENTS</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td className="bench-types__empty" colSpan={6}>No acts found.</td></tr>
                ) : paged.map((item, idx) => (
                  <tr key={item.id}>
                    <td><span className="cmp-order-num">{(safePage - 1) * perPage + idx + 1}</span></td>
                    <td>
                      <div className="cmp-name-cell">
                        <span className="cmp-name-avatar"><Icon name="book" size={15} /></span>
                        <span className="cmp-cell-name">{item.title}</span>
                      </div>
                    </td>
                    <td>{item.act_type ? <span className="badge badge--info">{item.act_type}</span> : '—'}</td>
                    <td>{item.jurisdiction || '—'}</td>
                    <td>{item.sections_count || 0}</td>
                    <td>{item.amendments_count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bench-types__table-footer">
              <div>Showing {(safePage - 1) * perPage + 1} to {Math.min(safePage * perPage, filtered.length)} of {filtered.length} acts</div>
              <span className="bench-types__ft-perpage" onClick={() => setPerPage(perPage === 10 ? 20 : perPage === 20 ? 50 : 10)}>
                {perPage} / page <Icon name="chevronDown" size={13} />
              </span>
              {totalPages > 1 && (
                <div className="bench-types__pagination">
                  <button className="bench-types__page-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}><Icon name="chevronLeft" size={14} /></button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const start = Math.max(1, Math.min(safePage - Math.floor(5 / 2), totalPages - 4));
                    const p = start + i;
                    if (p > totalPages) return null;
                    return <button key={p} className={`bench-types__page-btn${safePage === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
                  })}
                  <button className="bench-types__page-btn" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}><Icon name="chevron" size={14} /></button>
                </div>
              )}
            </div>
          </div>

          <div className="bench-types__mobile-section-header bench-types__mobile-only">
            <span className="bench-types__mobile-section-title">All Acts</span>
            <span className="bench-types__mobile-section-count">{Math.min(perPage, filtered.length)} of {filtered.length}</span>
            <span className="bench-types__mobile-per-page" onClick={() => setPerPage(perPage === 10 ? 20 : perPage === 20 ? 50 : 10)}>{perPage} / page <Icon name="chevronDown" size={13} /></span>
          </div>
          <div className="bench-types__mobile-list bench-types__mobile-only">
            {paged.length === 0 ? (
              <div className="bench-types__empty">No acts found.</div>
            ) : paged.map((item, idx) => (
              <div key={item.id} className="bench-types__mobile-card">
                <div className="bench-types__mobile-card-row1">
                  <span className="bench-types__mobile-avatar"><Icon name="book" size={18} /></span>
                  <div className="bench-types__mobile-card-info">
                    <div className="bench-types__mobile-card-top">
                      <span className="bench-types__mobile-card-name">{item.title}</span>
                      {item.act_type && <span className="badge badge--info">{item.act_type}</span>}
                    </div>
                    <span className="bench-types__mobile-code">{item.jurisdiction || '—'} · {item.sections_count || 0} sections</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="bench-types__table-footer bench-types__desktop-only">
            <div>Showing {(safePage - 1) * perPage + 1} to {Math.min(safePage * perPage, filtered.length)} of {filtered.length} acts</div>
            <span className="bench-types__ft-perpage" onClick={() => setPerPage(perPage === 10 ? 20 : perPage === 20 ? 50 : 10)}>
              {perPage} / page <Icon name="chevronDown" size={13} />
            </span>
            {totalPages > 1 && (
              <div className="bench-types__pagination">
                <button className="bench-types__page-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}><Icon name="chevronLeft" size={14} /></button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(safePage - Math.floor(5 / 2), totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return <button key={p} className={`bench-types__page-btn${safePage === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
                })}
                <button className="bench-types__page-btn" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}><Icon name="chevron" size={14} /></button>
              </div>
            )}
          </div>
          <div className="bench-types__mobile-section-header bench-types__mobile-only">
            <span className="bench-types__mobile-section-title">All Acts</span>
            <span className="bench-types__mobile-section-count">{Math.min(perPage, filtered.length)} of {filtered.length}</span>
          </div>
          <div className="bench-types__grid">
            {paged.length === 0 ? (
              <div className="bench-types__empty" style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center' }}>No acts found.</div>
            ) : paged.map((item) => (
              <div key={item.id} className="bench-types__grid-card">
                <div className="bench-types__grid-card-header">
                  <div className="bench-types__grid-card-icon"><Icon name="book" size={22} /></div>
                  <div className="bench-types__grid-card-title">{item.title}</div>
                </div>
                <div className="bench-types__grid-card-body">
                  {item.act_type && <span className="badge badge--info">{item.act_type}</span>}
                  {item.jurisdiction && <span className="bench-types__grid-card-meta"><Icon name="map-pin" size={13} />{item.jurisdiction}</span>}
                  <div className="bench-types__grid-card-stats">
                    <div className="bench-types__grid-card-stat">
                      <span className="bench-types__grid-card-stat-value">{item.sections_count || 0}</span>
                      <span className="bench-types__grid-card-stat-label">Sections</span>
                    </div>
                    <div className="bench-types__grid-card-stat">
                      <span className="bench-types__grid-card-stat-value">{item.amendments_count || 0}</span>
                      <span className="bench-types__grid-card-stat-label">Amendments</span>
                    </div>
                  </div>
                </div>
                <div className="bench-types__grid-card-footer">
                  <span className="bench-types__mobile-code">{item.short_code || '—'}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bench-types__mobile-pagination bench-types__mobile-only">
            <div className="bench-types__mobile-pag-info">Showing {(safePage - 1) * perPage + 1} to {Math.min(safePage * perPage, filtered.length)} of {filtered.length}</div>
            {totalPages > 1 && (
              <div className="bench-types__pagination" style={{ justifyContent: 'center', marginTop: 12 }}>
                <button className="bench-types__page-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}><Icon name="chevronLeft" size={14} /></button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return <button key={p} className={`bench-types__page-btn${safePage === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
                })}
                <button className="bench-types__page-btn" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}><Icon name="chevron" size={14} /></button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

