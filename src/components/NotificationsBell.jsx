import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications.js';
import Icon from './Icon.jsx';
import { useFormat } from '@/utils/format.js';

const TONE = { danger: 'red', warn: 'amber', info: 'navy' };

export default function NotificationsBell() {
  const { formatDate } = useFormat();
  const { items, unread, dismiss, dismissAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const open1 = (n) => { dismiss(n.id); setOpen(false); nav(n.route); };

  return (
    <div className="notif" ref={ref}>
      <button className="topbar__toggle" onClick={() => setOpen((o) => !o)} aria-label="Notifications" title="Notifications">
        <Icon name="bell" size={18} />
        {unread > 0 && <span className="notif__badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif__panel">
          <div className="notif__head">
            <span>Notifications</span>
            {items.length > 0 && <button className="notif__clear" onClick={dismissAll}>Mark all read</button>}
          </div>
          <div className="notif__list">
            {items.length === 0 && <div className="cmd__empty">You’re all caught up.</div>}
            {items.map((n) => (
              <button key={n.id} className={`notif__item ${n.read ? 'notif__item--read' : ''}`} onClick={() => open1(n)}>
                <span className={`notif__dot dot`} style={{ background: `var(--${TONE[n.level] === 'red' ? 'red' : TONE[n.level] === 'amber' ? 'amber' : 'navy-700'})` }} />
                <span className="notif__body">
                  <span className="notif__title">{n.message}</span>
                  <span className="notif__meta">{n.type} · {formatDate(n.date)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

