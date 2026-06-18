import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_GROUPS } from '@/routes/navigation.js';
import { config } from '@/config/config.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import Icon from '@/components/Icon.jsx';

export default function Sidebar({ collapsed, mobileOpen }) {
  const { canViewModule } = useAuth();

  // Hide items the user can't view; hide groups that end up empty.
  const groups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.module || canViewModule(i.module)) }))
    .filter((g) => g.items.length > 0);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar__brand">
        <div className="sidebar__logo">⚖</div>
        <div>
          <div className="sidebar__title">Lex<span>AI</span></div>
          <div className="sidebar__sub">Litigation Assistant</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {groups.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-group__label">{group.label}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                title={item.label}
              >
                <span className="nav-item__icon"><Icon name={item.icon} size={18} /></span>
                <span className="nav-item__label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="provider-chip" title="Active providers (configurable via .env)">
          <Icon name="bolt" size={14} />
          <span>AI <b>{config.providers.ai}</b> · DB <b>{config.providers.database}</b></span>
        </div>
      </div>
    </aside>
  );
}
