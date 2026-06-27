import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_GROUPS } from '@/routes/navigation.js';
import { config } from '@/config/config.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useSettings } from '@/data-layer/SettingsContext.jsx';
import Icon from '@/components/Icon.jsx';

function SidebarItem({ item, collapsed }) {
  const { canViewModule } = useAuth();

  if (item.children) {
    return <SubmenuGroup item={item} collapsed={collapsed} canViewModule={canViewModule} />;
  }

  if (item.module && !canViewModule(item.module)) return null;

  return (
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
  );
}

function SubmenuGroup({ item, collapsed, canViewModule }) {
  const [open, setOpen] = useState(true);

  const visible = item.children.filter((c) => !c.module || canViewModule(c.module));
  if (visible.length === 0) return null;

  return (
    <div className="nav-submenu">
      <button className="nav-submenu__toggle" onClick={() => setOpen((o) => !o)} title={item.label}>
        <span className="nav-item__icon"><Icon name={item.icon} size={18} /></span>
        <span className="nav-item__label">{item.label}</span>
        <span className={`nav-submenu__arrow ${open ? 'open' : ''}`}>
          <Icon name="chevronDown" size={14} />
        </span>
      </button>
      {open && (
        <div className="nav-submenu__items">
          {visible.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              end={child.end}
              className={({ isActive }) => `nav-item nav-item--sub ${isActive ? 'active' : ''}`}
              title={child.label}
            >
              <span className="nav-item__label">{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ collapsed, mobileOpen }) {
  const { canViewModule } = useAuth();
  const { settings } = useSettings();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <Icon name="bolt" size={22} />
        </div>
        <div>
          <div className="sidebar__title">{settings.siteTitle}</div>
          <div className="sidebar__sub">{settings.tagline}</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV_GROUPS.map((entry, i) => {
          if (entry.type === 'heading') {
            return <div key={i} className="nav-heading">{entry.label}</div>;
          }

          const visibleItems = (entry.items || []).filter((item) => {
            if (item.children) {
              return item.children.some((c) => !c.module || canViewModule(c.module));
            }
            return !item.module || canViewModule(item.module);
          });
          if (visibleItems.length === 0) return null;

          return (
            <div className="nav-group" key={i}>
              {entry.label && <div className="nav-group__label">{entry.label}</div>}
              {visibleItems.map((item, j) => (
                <SidebarItem key={j} item={item} collapsed={collapsed} />
              ))}
            </div>
          );
        })}
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
