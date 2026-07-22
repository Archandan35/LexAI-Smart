import { useState, useMemo, useCallback, useRef, useLayoutEffect, memo } from 'react';
import Icon from './Icon.jsx';
import EmptyState from './EmptyState.jsx';

function useTableKeyboardNav(rowCount, onRowActivate) {
  const [focusIdx, setFocusIdx] = useState(-1);
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx((i) => Math.min(i + 1, rowCount - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (focusIdx >= 0) onRowActivate?.(focusIdx); }
  }, [rowCount, focusIdx, onRowActivate]);
  return { focusIdx, setFocusIdx, handleKeyDown };
}

const ROW_HEIGHT = 48;
const OVERSCAN = 10;

const DataTable = memo(function DataTable({
  columns, rows, rowKey = (r) => r.id,
  searchable = true, searchKeys, searchPlaceholder = 'Search…',
  pageSize = 10, selectable = false, selected = [], onSelectedChange,
  toolbar, emptyTitle = 'Nothing here yet.', emptyIcon = 'file',
  initialSort, maxRows = 200, virtualized = false,
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(initialSort || null);
  const [page, setPage] = useState(1);
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  const keys = useMemo(() => searchKeys || columns.map((c) => c.key), [searchKeys, columns]);

  const filtered = useMemo(() => {
    let out = rows;
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((r) => keys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
    }
    if (sort) {
      out = [...out].sort((a, b) => {
        const av = a[sort.key]; const bv = b[sort.key];
        if (av == null) return 1; if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return sort.dir === 'asc' ? av - bv : bv - av;
        return sort.dir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return out;
  }, [rows, query, sort, keys]);

  const limited = virtualized ? filtered.slice(0, maxRows) : filtered;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(limited.length / pageSize)), [limited.length, pageSize]);
  const safePage = useMemo(() => Math.min(page, totalPages), [page, totalPages]);

  const pageRows = useMemo(() => {
    if (virtualized) {
      if (!scrollRef.current) {
        return limited.slice(0, pageSize === 0 ? limited.length : pageSize);
      }
      const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
      const endIdx = Math.min(limited.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);
      return limited.slice(startIdx, endIdx);
    }
    return limited.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [limited, safePage, pageSize, virtualized, scrollTop, viewportHeight]);

  const virtualOffset = useMemo(() => {
    if (!virtualized) return 0;
    return Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN) * ROW_HEIGHT;
  }, [virtualized, scrollTop]);

  const virtualPaddingTop = useMemo(() => {
    if (!virtualized) return 0;
    return Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN) * ROW_HEIGHT;
  }, [virtualized, scrollTop]);

  const virtualPaddingBottom = useMemo(() => {
    if (!virtualized) return 0;
    const totalHeight = limited.length * ROW_HEIGHT;
    const renderedHeight = pageRows.length * ROW_HEIGHT;
    return Math.max(0, totalHeight - virtualOffset - renderedHeight);
  }, [virtualized, limited.length, pageRows.length, virtualOffset]);

  const toggleSort = useCallback((key) => {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }, []);

  const allOnPageSelected = useMemo(
    () => pageRows.length > 0 && pageRows.every((r) => selected.includes(rowKey(r))),
    [pageRows, selected, rowKey]
  );

  const toggleAllOnPage = useCallback(() => {
    if (!onSelectedChange) return;
    const ids = pageRows.map(rowKey);
    onSelectedChange(allOnPageSelected ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
  }, [onSelectedChange, pageRows, rowKey, allOnPageSelected, selected]);

  const toggleRow = useCallback((id) => {
    if (!onSelectedChange) return;
    onSelectedChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }, [onSelectedChange, selected]);

  useLayoutEffect(() => {
    if (!virtualized || !scrollRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setViewportHeight(entry.contentRect.height);
    });
    ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, [virtualized]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const { focusIdx, setFocusIdx, handleKeyDown } = useTableKeyboardNav(
    pageRows.length,
    useCallback((i) => {
      const r = pageRows[i];
      if (r?.onClick) r.onClick(r);
    }, [pageRows])
  );

  return (
    <div className="datatable">
      {(searchable || toolbar) && (
        <div className="datatable__bar">
          {searchable && (
            <div className="datatable__search">
              <Icon name="search" size={15} />
              <input
                value={query}
                placeholder={searchPlaceholder}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
          )}
          <div className="datatable__spacer" />
          {toolbar}
        </div>
      )}

      <div
        className="table-scroll"
        ref={scrollRef}
        onScroll={virtualized ? handleScroll : undefined}
        style={virtualized ? { overflowY: 'auto', maxHeight: '70vh', position: 'relative' } : { contentVisibility: 'auto' }}
      >
        <table className="table" role="grid" onKeyDown={handleKeyDown}>
          <thead>
            <tr role="row">
              {selectable && (
<th className="th-checkbox">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} aria-label="Select page" />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={c.width ? { width: c.width } : undefined}
                  className={c.sortable ? 'th--sortable' : ''}
                  onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                  scope="col"
                  aria-sort={c.sortable && sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {c.sortable ? (
                    <button className="th__sort-btn" onClick={() => toggleSort(c.key)} aria-label={`Sort by ${c.label}`}>
                      {c.label}
                      {sort?.key === c.key && (
                        <span className="th__sort">{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>
                      )}
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {virtualized && virtualPaddingTop > 0 && (
              <tr style={{ height: virtualPaddingTop, pointerEvents: 'none' }} aria-hidden="true" />
            )}
            {pageRows.map((r, ri) => {
              const id = rowKey(r);
              return (
                <tr
                  key={id}
                  role="row"
                  tabIndex={0}
                  className={selected.includes(id) ? 'row--selected' : ''}
                  onClick={() => r.onClick?.(r)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); r.onClick?.(r); } }}
                  onFocus={() => setFocusIdx(ri)}
                  aria-selected={selected.includes(id) || undefined}
                >
                  {selectable && (
                    <td role="gridcell"><input type="checkbox" checked={selected.includes(id)} onChange={() => toggleRow(id)} aria-label="Select row" /></td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} role="gridcell" className={c.className}>{c.render ? c.render(r) : (r[c.key] ?? '—')}</td>
                  ))}
                </tr>
              );
            })}
            {virtualized && virtualPaddingBottom > 0 && (
              <tr style={{ height: virtualPaddingBottom, pointerEvents: 'none' }} aria-hidden="true" />
            )}
          </tbody>
        </table>
        {pageRows.length === 0 && <EmptyState icon={emptyIcon} title={emptyTitle} />}
      </div>

      {limited.length > pageSize && (
        <div className="pagination">
          <span className="pagination__info">
            {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, limited.length)} of {limited.length}
          </span>
          <div className="pagination__controls">
            <button className="btn btn--ghost btn--sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Prev</button>
            <span className="pagination__page">Page {safePage} / {totalPages}</span>
            <button className="btn btn--ghost btn--sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
});

export default DataTable;

