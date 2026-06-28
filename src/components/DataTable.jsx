import Icon from './Icon.jsx';
import EmptyState from './EmptyState.jsx';

// DataTable — reusable table with search, sort, pagination and optional row
// selection (checkboxes for bulk actions). Reuses the design-system `.table`.
// columns: [{ key, label, render?(row), sortable?, width?, className? }]
export default function DataTable({
  columns, rows, rowKey = (r) => r.id,
  searchable = true, searchKeys, searchPlaceholder = 'Search…',
  pageSize = 10, selectable = false, selected = [], onSelectedChange,
  toolbar, emptyTitle = 'Nothing here yet.', emptyIcon = 'file',
  initialSort,
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(initialSort || null); // { key, dir }
  const [page, setPage] = useState(1);

  const keys = searchKeys || columns.map((c) => c.key);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key) => {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.includes(rowKey(r)));
  const toggleAllOnPage = () => {
    if (!onSelectedChange) return;
    const ids = pageRows.map(rowKey);
    onSelectedChange(allOnPageSelected ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
  };
  const toggleRow = (id) => {
    if (!onSelectedChange) return;
    onSelectedChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

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

      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              {selectable && (
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} aria-label="Select page" />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={c.width ? { width: c.width } : undefined}
                  className={c.sortable ? 'th--sortable' : ''}
                  onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                >
                  {c.label}
                  {c.sortable && sort?.key === c.key && (
                    <span className="th__sort">{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const id = rowKey(r);
              return (
                <tr key={id} className={selected.includes(id) ? 'row--selected' : ''}>
                  {selectable && (
                    <td><input type="checkbox" checked={selected.includes(id)} onChange={() => toggleRow(id)} aria-label="Select row" /></td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={c.className}>{c.render ? c.render(r) : (r[c.key] ?? '—')}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {pageRows.length === 0 && <EmptyState icon={emptyIcon} title={emptyTitle} />}
      </div>

      {filtered.length > pageSize && (
        <div className="pagination">
          <span className="pagination__info">
            {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
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
}
