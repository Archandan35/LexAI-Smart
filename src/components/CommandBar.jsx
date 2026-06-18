import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch } from '@/hooks/useGlobalSearch.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { rbacLogic } from '@/logic/rbacLogic.js';
import Icon from './Icon.jsx';

// CommandBar — ⌘K / Ctrl-K palette. Searches data + offers quick navigation to
// any module the user may view.
export default function CommandBar({ open, onClose }) {
  const nav = useNavigate();
  const { perms } = useAuth();
  const { query, setQuery, results, loading, reset } = useGlobalSearch();
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const navItems = rbacLogic.visibleModules(perms).map((m) => ({
    id: `nav_${m.key}`, type: 'Go to', icon: m.icon, title: m.label, route: m.route, nav: true,
  }));

  const filteredNav = query.trim()
    ? navItems.filter((n) => n.title.toLowerCase().includes(query.toLowerCase()))
    : navItems;

  const items = query.trim().length >= 2 ? [...filteredNav, ...results] : navItems;

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); else reset(); }, [open, reset]);
  useEffect(() => { setActive(0); }, [query, open]);

  if (!open) return null;

  const go = (item) => { onClose?.(); nav(item.route); };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && items[active]) { e.preventDefault(); go(items[active]); }
    else if (e.key === 'Escape') onClose?.();
  };

  return (
    <div className="cmd-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="cmd" role="dialog" aria-label="Command bar">
        <div className="cmd__input">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            value={query}
            placeholder="Search cases, drafts, documents… or jump to a page"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
          />
          {loading && <span className="spinner" style={{ width: 15, height: 15 }} />}
          <kbd className="cmd__kbd">Esc</kbd>
        </div>
        <div className="cmd__results">
          {items.length === 0 && (
            <div className="cmd__empty">{query.trim().length >= 2 ? 'No matches.' : 'Type to search…'}</div>
          )}
          {items.map((item, i) => (
            <button
              key={item.id}
              className={`cmd__item ${i === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(item)}
            >
              <span className="cmd__icon"><Icon name={item.icon} size={16} /></span>
              <span className="cmd__text">
                <span className="cmd__title">{item.title}</span>
                {item.subtitle && <span className="cmd__sub">{item.subtitle}</span>}
              </span>
              <span className="cmd__type">{item.type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
