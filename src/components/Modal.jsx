import React, { useEffect } from 'react';
import Icon from './Icon.jsx';

export default function Modal({ open, title, subtitle, onClose, children, footer, size, className = '' }) {
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size === 'lg' ? 'modal--lg' : ''} ${className}`}>
        <header className="modal__head">
          <div>
            <span className="modal__title">{title}</span>
            {subtitle && <p className="em-modal-subtitle">{subtitle}</p>}
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close"><Icon name="close" size={16} /></button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}