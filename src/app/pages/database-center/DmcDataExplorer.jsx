import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { databaseAdminService } from '@/services/databaseAdminService.js';
import { documentLogic } from '@/logic/documentLogic.js';
import { fileLogic } from '@/logic/fileLogic.js';
import { caseService } from '@/services/caseService.js';
import { bytes, useFormat } from '@/utils/format.js';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import Modal from '@/components/Modal.jsx';

const COLLECTIONS = databaseAdminService.knownCollections();
const STAT_VARIANTS = ['indigo', 'green', 'amber', 'blue'];
const COLL_VARIANTS = ['indigo', 'green', 'amber', 'blue', 'purple', 'cyan'];
const COLL_ICONS = ['layers', 'folder', 'file-text', 'edit', 'folder-plus', 'calendar'];
const PER_PAGE_OPTIONS = [10, 25, 50, 100];

function getFieldValue(r, f) {
  if (f.includes('.')) return f.split('.').reduce((o, k) => o?.[k], r);
  return r[f];
}

export default function DmcDataExplorer() {
  const { formatDate } = useFormat();
  const navigate = useNavigate();
  const [collection, setCollection] = useState('documents');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [counts, setCounts] = useState({});
  const [showCollectionGrid, setShowCollectionGrid] = useState(false);
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    databaseAdminService.counts().then(setCounts).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      if (collection === 'documents') setRows(await documentLogic.getAll().then((r) => r?.ok ? r.value : []).catch(() => []));
      else if (collection === 'cases') setRows(await caseService.listCases().catch(() => []));
      else setRows([]);
    } catch { setRows([]); }
    setLoading(false);
  };

  useEffect(() => { load(); setPage(1); setSelectedIds(new Set()); setPreviewDoc(null); setDetailItem(null); }, [collection]);

  const fields = useMemo(() => {
    if (collection === 'documents') return ['name', 'folder', 'mime', 'size', 'createdAt'];
    if (collection === 'cases') return ['caseNumber', 'case_type', 'case_year', 'status', 'createdAt'];
    return ['id', 'name'];
  }, [collection]);

  const filtered = useMemo(() => {
    let data = rows;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((r) =>
        fields.some((f) => {
          const v = getFieldValue(r, f);
          return v != null && String(v).toLowerCase().includes(q);
        })
      );
    }
    if (sortField) {
      data = [...data].sort((a, b) => {
        let va = getFieldValue(a, sortField);
        let vb = getFieldValue(b, sortField);
        if (va == null) va = '';
        if (vb == null) vb = '';
        if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return data;
  }, [rows, search, sortField, sortDir, fields]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const handleSort = (f) => {
    if (sortField === f) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortField(''); setSortDir('asc'); }
    } else { setSortField(f); setSortDir('asc'); }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paged.length && paged.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(paged.map((r) => r.id)));
  };

  const renderCell = (r, f) => {
    const v = getFieldValue(r, f);
    if (f === 'size') return bytes(v || 0);
    if (f === 'createdAt') return formatDate(v || r.uploaded_at || r.created_at);
    if (f === 'name' && collection === 'documents') {
      return <a href="#" onClick={(e) => { e.preventDefault(); setPreviewDoc(r); }} className="dmc-explorer-link">{v || r.title}</a>;
    }
    if (f === 'caseNumber') {
      return <span className="font-mono fs-12">{v || '\u2014'}</span>;
    }
    if (f === 'status') {
      const status = (v || '').toLowerCase();
      const color = status === 'active' || status === 'open' ? 'green' : status === 'closed' || status === 'resolved' ? 'navy' : 'amber';
      return <span className={`dmc-badge dmc-badge--${color}`}>{v || '\u2014'}</span>;
    }
    return v ?? '\u2014';
  };

  const totalCount = Object.values(counts).reduce((a, b) => a + (b || 0), 0);

  const statCards = [
    { label: 'Collections', value: COLLECTIONS.length, sub: 'Available schemas', variant: 'indigo', icon: 'layers' },
    { label: 'Total Records', value: totalCount, sub: 'Across all collections', variant: 'green', icon: 'database' },
    { label: 'Provider', value: databaseAdminService.providerName(), sub: 'Schema v' + databaseAdminService.schemaVersion(), variant: 'amber', icon: 'server' },
    { label: 'Loaded', value: rows.length, sub: 'In ' + collection, variant: 'blue', icon: 'filter' },
  ];

  const renderPagination = () => {
    if (filtered.length === 0) return null;
    const start = (safePage - 1) * perPage + 1;
    const end = Math.min(safePage * perPage, filtered.length);
    const maxVisible = 5;
    const pages = [];
    let startPage = Math.max(1, safePage - Math.floor(maxVisible / 2));
    let endPage = startPage + maxVisible - 1;
    if (endPage > totalPages) { endPage = totalPages; startPage = Math.max(1, endPage - maxVisible + 1); }
    for (let i = startPage; i <= endPage; i++) pages.push(i);

    return (
      <div className="dmc-db-pagination">
        <div className="dmc-db-pagination__info">Showing {start}\u2013{end} of {filtered.length} records</div>
        <div className="dmc-db-pagination__controls">
          <button className="dmc-db-pagination__btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}><Icon name="chevronLeft" size={14} /></button>
          {startPage > 1 && <span className="text-faint px-4 fs-12">\u2026</span>}
          {pages.map((p) => (
            <button key={p} className={`dmc-db-pagination__btn${safePage === p ? ' dmc-db-pagination__btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
          ))}
          {endPage < totalPages && <span className="text-faint px-4 fs-12">\u2026</span>}
          <button className="dmc-db-pagination__btn" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}><Icon name="chevron" size={14} /></button>
        </div>
        <div className="dmc-db-perpage">
          <span>Rows:</span>
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
            {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
    );
  };

  const renderDetailModal = () => {
    if (!detailItem) return null;
    const isDoc = collection === 'documents';
    const pairs = isDoc ? [
      ['ID', detailItem.id],
      ['Name', detailItem.name || detailItem.title],
      ['Folder', detailItem.folder],
      ['MIME Type', detailItem.mime],
      ['Size', bytes(detailItem.size || 0)],
      ['Uploaded', formatDate(detailItem.uploaded_at || detailItem.uploadedAt)],
      ['Storage Ref', detailItem.ref],
      ['Sync Status', detailItem.syncStatus],
    ] : [
      ['ID', detailItem.id],
      ['Case Number', detailItem.caseNumber],
      ['Type', detailItem.case_type],
      ['Year', detailItem.case_year],
      ['Court', detailItem.court],
      ['Judge', detailItem.judge],
      ['Status', detailItem.status],
      ['Filed', detailItem.filed_at ? formatDate(detailItem.filed_at) : '\u2014'],
    ];

    return (
      <Modal open={true} title={detailItem.name || detailItem.title || detailItem.caseNumber || 'Record Details'} onClose={() => setDetailItem(null)} size="lg">
        <div className="dmc-detail-grid">
          {pairs.map(([label, value]) => (
            <div key={label} className="dmc-detail-row">
              <span className="dmc-detail-label">{label}</span>
              <span className="dmc-detail-value">{value ?? '\u2014'}</span>
            </div>
          ))}
        </div>
        {isDoc && detailItem.ref && (
          <div className="mt-16">
            <Button variant="outline" size="sm" onClick={() => Promise.resolve(fileLogic.getUrl(detailItem.ref)).then((url) => url && window.open(url, '_blank'))}>
              <Icon name="eye" size={14} /> View File
            </Button>
          </div>
        )}
      </Modal>
    );
  };

  const allSelected = paged.length > 0 && selectedIds.size === paged.length;

  return (
    <>
      <div className="dmc-db-hero">
        <div className="dmc-db-hero__icon"><Icon name="layers" size={36} /></div>
        <div className="dmc-db-hero__text">
          <div className="dmc-db-hero__accent" />
          <h2>Data Explorer</h2>
          <p>Browse, search, and inspect every collection in your database. View records, preview documents, and monitor data at a glance.</p>
          <div className="dmc-db-hero__actions">
            <Button variant="primary" size="sm" onClick={() => navigate('/admin/database-center/import')}>
              <Icon name="download" size={14} /> Import Data
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/database-center/export')}>
              <Icon name="upload" size={14} /> Export Data
            </Button>
          </div>
        </div>
        <div className="dmc-db-hero__watermark"><Icon name="layers" size={96} /></div>
      </div>

      <div className="dmc-db-stats-row">
        {statCards.map((c, i) => (
          <div key={c.label} className="dmc-db-statcard">
            <div className={`dmc-db-statcard__icon dmc-db-statcard__icon--${STAT_VARIANTS[i]}`}>
              <Icon name={c.icon} size={18} />
            </div>
            <div className="dmc-db-statcard__body">
              <div className="dmc-db-statcard__label">{c.label}</div>
              <div className="dmc-db-statcard__value">{c.value}</div>
              <div className="dmc-db-statcard__sub">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dmc-db-section">
        <div className="dmc-db-section__head">
          <div className="dmc-db-section__title"><Icon name="layers" size={18} /> Collection Browser</div>
          <div className="flex-row items-center gap-10">
            <span className="dmc-db-section__badge">{filtered.length} / {totalCount} records</span>
            <button
              onClick={() => setShowCollectionGrid(!showCollectionGrid)}
              className="bg-none border-0 cursor-pointer p-4 flex-row"
              style={{ color: showCollectionGrid ? 'var(--brand)' : 'var(--text-soft)' }}
              title="Toggle collection overview"
            ><Icon name="grid" size={16} /></button>
          </div>
        </div>

        {showCollectionGrid && (
          <div className="dmc-db-section__body border-b">
            <div className="dmc-db-stats-row mb-0">
              {COLLECTIONS.map((c, i) => (
                <div
                  key={c}
                  className="dmc-db-statcard"
                  style={{ cursor: 'pointer', flex: '1 1 calc(16.66% - 12px)', minWidth: 130, border: collection === c ? '2px solid var(--brand)' : '1px solid var(--border)' }}
                  onClick={() => { setCollection(c); setShowCollectionGrid(false); }}
                >
                  <div className={`dmc-db-statcard__icon dmc-db-statcard__icon--${COLL_VARIANTS[i % COLL_VARIANTS.length]}`}>
                    <Icon name={COLL_ICONS[i % COLL_ICONS.length]} size={16} />
                  </div>
                  <div className="dmc-db-statcard__body">
                    <div className="dmc-db-statcard__label" style={{ fontSize: 8.5 }}>{c}</div>
                    <div className="dmc-db-statcard__value fs-16">{counts[c] ?? '\u2014'}</div>
                    <div className="dmc-db-statcard__sub">records</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="dmc-db-section__body">
          <div className="dmc-db-toolbar">
            <div className="dmc-db-toolbar__left">
              <div className="flex-row gap-4 flex-wrap">
                {COLLECTIONS.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    className={`dmc-db-chip${collection === c ? ' dmc-db-chip--active' : ''}`}
                    onClick={() => { setCollection(c); setPreviewDoc(null); }}
                  >{c}</button>
                ))}
                {COLLECTIONS.length > 6 && (
                  <select className="dmc-db-select" value={collection} onChange={(e) => { setCollection(e.target.value); setPreviewDoc(null); }}>
                    {COLLECTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div className="dmc-db-search">
                <Icon name="search" size={14} />
                <input placeholder="Search\u2026" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
            </div>
            <div className="dmc-db-toolbar__right">
              {selectedIds.size > 0 && (
                <span className="fs-12 text-brand fw-600">{selectedIds.size} selected</span>
              )}
              <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
                <Icon name="refresh" size={14} /> {loading ? 'Loading\u2026' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>

        {previewDoc && (
          <div className="dmc-preview-panel">
            <div className="dmc-preview-panel__header">
              <div className="dmc-preview-panel__title">
                <div className="dmc-preview-panel__icon"><Icon name="file-text" size={16} /></div>
                {previewDoc.name || previewDoc.title}
              </div>
              <button className="dmc-preview-panel__close" onClick={() => setPreviewDoc(null)} title="Close preview"><Icon name="close" size={16} /></button>
            </div>
            <div className="dmc-preview-panel__body">
              <div className="dmc-preview-grid">
                {[
                  ['ID', previewDoc.id],
                  ['Folder', previewDoc.folder],
                  ['Size', bytes(previewDoc.size || 0)],
                  ['Type', previewDoc.mime],
                  ['Uploaded', formatDate(previewDoc.uploaded_at || previewDoc.uploadedAt)],
                  ['Sync', previewDoc.syncStatus],
                ].map(([label, value]) => (
                  <div key={label} className="flex-row justify-between py-6 border-b">
                    <span className="text-faint">{label}</span>
                    <span>{value ?? '\u2014'}</span>
                  </div>
                ))}
              </div>
              {previewDoc.ref && (
                <div className="dmc-preview-panel__actions">
                  <Button variant="outline" size="sm" onClick={() => Promise.resolve(fileLogic.getUrl(previewDoc.ref)).then((url) => url && window.open(url, '_blank'))}>
                    <Icon name="eye" size={14} /> View File
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="dmc-empty"><div className="dmc-empty__title py-24">Loading records\u2026</div></div>
        ) : filtered.length === 0 ? (
          <div className="dmc-empty">
            <div className="dmc-empty__icon"><Icon name="layers" size={32} /></div>
            <div className="dmc-empty__title">No records found</div>
            <div className="dmc-empty__hint">Try a different collection or search term.</div>
          </div>
        ) : (
          <>
            <div className="dmc-db-table-wrap">
              <table className="dmc-db-table">
                <thead>
                  <tr>
                    <th className="dmc-db-table__checkbox">
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                    </th>
                    {fields.map((f) => (
                      <th
                        key={f}
                        className={`th--sortable${sortField === f ? sortDir === 'asc' ? ' th--sort-asc' : ' th--sort-desc' : ''}`}
                        onClick={() => handleSort(f)}
                      >
                        {f.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        <span className="dmc-db-table__sort-arrow">
                          {sortField === f ? (
                            sortDir === 'asc' ? '\u25B2' : '\u25BC'
                          ) : '\u25B2\u25BC'}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => (
                    <tr
                      key={r.id}
                      className={`dmc-db-table__row--clickable${selectedIds.has(r.id) ? ' dmc-db-table__row--selected' : ''}`}
                      onClick={(e) => {
                        if (e.target.type === 'checkbox') return;
                        setDetailItem(r);
                      }}
                    >
                      <td className="dmc-db-table__checkbox" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} />
                      </td>
                      {fields.map((f) => <td key={f}>{renderCell(r, f)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </>
        )}
      </div>

      {renderDetailModal()}
    </>
  );
}
