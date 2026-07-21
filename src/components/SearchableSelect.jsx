import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function SearchableSelect({ value, onChange, options = [], placeholder = 'Select...', style }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const selectedLabel = useMemo(() => {
    const match = options.find((o) => o.value === value);
    return match ? match.label : '';
  }, [value, options]);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options]);

  useEffect(() => {
    if (!open) { setQuery(''); setFocusedIdx(-1); }
  }, [open]);

  useEffect(() => {
    function handle(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const updatePosition = useCallback(() => {
    if (!open || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const h = Math.min(filtered.length * 42 + 8, 220);
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= h + 8 ? rect.bottom : Math.max(4, rect.top - h - 4);
    setDropdownStyle({
      position: 'fixed',
      left: rect.left + 'px',
      top: top + 'px',
      minWidth: rect.width + 'px',
      zIndex: 9999,
    });
  }, [open, filtered.length]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [updatePosition]);

  const select = useCallback((opt) => {
    onChange({ target: { value: opt.value } });
    setOpen(false);
    inputRef.current?.blur();
  }, [onChange]);

  const handleKey = useCallback((e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && focusedIdx >= 0 && filtered[focusedIdx]) { e.preventDefault(); select(filtered[focusedIdx]); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  }, [filtered, focusedIdx, select]);

  return (
    <div ref={wrapperRef} style={style} className="searchable-select">
      <input
        ref={inputRef}
        className={`input${open ? '' : ' is-caret-hidden'}`}
        value={open ? query : selectedLabel}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setFocusedIdx(-1); }}
        onKeyDown={handleKey}
        readOnly={!open}
      />
      {open && createPortal(
        <div ref={dropdownRef} role="listbox" className="searchable-select__dropdown" style={dropdownStyle}>
          {filtered.length > 0 ? filtered.map((opt, i) => (
            <div
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`searchable-select__option${i === focusedIdx ? ' searchable-select__option--focused' : ''}${opt.value === value ? ' searchable-select__option--selected' : ''}`}
              onMouseDown={() => select(opt)}
              onMouseEnter={() => setFocusedIdx(i)}
            >
              {opt.label}
            </div>
          )) : (
            <div className="searchable-select__option searchable-select__option--empty">No results</div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

