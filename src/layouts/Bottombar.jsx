import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '@/components/Icon.jsx';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home', to: '/dashboard' },
  { key: 'matters', label: 'Matters', icon: 'briefcase-duo', to: '/cases' },
  { key: 'add', label: 'Add', icon: 'plus', to: '/cases/create', fab: true },
  { key: 'order-sheet', label: 'Order Sheet', icon: 'file', to: '/cases/order-sheet' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar', to: '/calendar' },
];

export default function Bottombar() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  const bar = (
    <div className="bottombar-wrap">
      <div className="bottombar">
        <svg className="bottombar__bg" viewBox="0 0 400 78" preserveAspectRatio="none">
          <path
            d="M10 0 H150 C165 0 170 6 175 14 C180 27 184 47 192 47 H208 C216 47 220 27 225 14 C230 6 235 0 250 0 H390 Q400 0 400 10 V78 H0 V10 Q0 0 10 0 Z"
            fill="currentColor"
          />
        </svg>
        <div className="bottombar__items">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === 'dashboard'
              ? pathname === '/dashboard' || pathname === '/'
              : item.to && pathname.startsWith(item.to);
            if (item.fab) {
              return (
                <button
                  key={item.key}
                  className="bottombar__item bottombar__item--fab"
                  onClick={() => nav(item.to)}
                  aria-label={item.label}
                >
                  <span className="bottombar__fab">
                    <Icon name={item.icon} size={24} />
                  </span>
                  <span className="bottombar__label">{item.label}</span>
                </button>
              );
            }
            return (
              <button
                key={item.key}
                className={`bottombar__item ${isActive ? 'is-active' : ''}`}
                onClick={() => item.to && nav(item.to)}
                aria-label={item.label}
              >
                <Icon name={item.icon} size={21} />
                <span className="bottombar__label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(bar, document.body);
}
