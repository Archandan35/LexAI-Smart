import { useState, Fragment } from 'react';
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
  const subId = `sub-${item.label?.replace(/\s+/g, '-').toLowerCase()}`;

  const visible = item.children.filter((c) => !c.module || canViewModule(c.module));
  if (visible.length === 0) return null;

  return (
    <div className="nav-submenu">
      <button
        className="nav-submenu__toggle"
        onClick={() => setOpen((o) => !o)}
        title={item.label}
        aria-expanded={open}
        aria-controls={subId}
      >
        <span className="nav-item__icon"><Icon name={item.icon} size={18} /></span>
        <span className="nav-item__label">{item.label}</span>
        <span className={`nav-submenu__arrow ${open ? 'open' : ''}`}>
          <Icon name="chevronDown" size={14} />
        </span>
      </button>
      {open && (
        <div className="nav-submenu__items" id={subId}>
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

// Pair each heading with the group that immediately follows it so the heading
// can be hidden when its group has no visible items.
function buildSections() {
  const sections = [];
  for (let i = 0; i < NAV_GROUPS.length; i += 1) {
    const entry = NAV_GROUPS[i];
    if (entry.type === 'heading') {
      const next = NAV_GROUPS[i + 1];
      if (next && next.type !== 'heading') {
        sections.push({ heading: entry.label, group: next });
        i += 1; // consume the group we just paired
      }
      // A heading without a following group is dropped entirely.
    } else {
      sections.push({ heading: null, group: entry });
    }
  }
  return sections;
}

export default function Sidebar({ collapsed, mobileOpen }) {
  const { canViewModule } = useAuth();
  const { settings } = useSettings();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`} aria-label="Main navigation">
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.siteTitle} className="sidebar__logo-img" />
          ) : (
            <Icon name="bolt" size={22} />
          )}
        </div>
        <div>
          <div className="sidebar__title">{settings.siteTitle}</div>
          <div className="sidebar__sub">{settings.tagline}</div>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Sidebar menu">
        {buildSections().map((section, i) => {
          const { heading, group } = section;
          if (!group) return null;

          const visibleItems = (group.items || []).filter((item) => {
            if (item.children) {
              return item.children.some((c) => !c.module || canViewModule(c.module));
            }
            return !item.module || canViewModule(item.module);
          });

          // Empty groups (and their parent heading) must never be rendered.
          if (visibleItems.length === 0) return null;

          return (
            <Fragment key={i}>
              {heading && <div className="nav-heading">{heading}</div>}
              <div className="nav-group">
                {group.label && <div className="nav-group__label">{group.label}</div>}
                {visibleItems.map((item, j) => (
                  <SidebarItem key={j} item={item} collapsed={collapsed} />
                ))}
              </div>
            </Fragment>
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

