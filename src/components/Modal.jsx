import { useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default memo(function Modal({ open, title, subtitle, onClose, children, footer, size, className = '', disableBackdrop, disableEscape }) {
  const previousFocus = useRef(null);
  const overlayRef = useRef(null);

  const trapFocus = useCallback((e) => {
    if (e.key !== 'Tab') return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    const focusable = overlay.querySelectorAll(FOCUSABLE_SELECTOR);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement;
      requestAnimationFrame(() => {
        const overlay = overlayRef.current;
        if (!overlay) return;
        const focusable = overlay.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          overlay.focus();
        }
      });
    }
    return () => {
      previousFocus.current?.focus?.();
      previousFocus.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener('keydown', trapFocus);
    return () => window.removeEventListener('keydown', trapFocus);
  }, [open, trapFocus]);

  useEffect(() => {
    if (!open) return undefined;
    if (disableEscape) return undefined;
    const h = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose, disableEscape]);

  if (!open) return null;
  const el = (
    <div ref={overlayRef} className="modal-overlay" tabIndex={-1} role="dialog" aria-modal="true" aria-label={title || undefined} onMouseDown={disableBackdrop ? undefined : (e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size === 'lg' ? 'modal--lg' : ''} ${className}`}>
        {title ? (
          <header className="modal__head">
            <div>
              <span className="modal__title">{title}</span>
              {subtitle && <p className="em-modal-subtitle">{subtitle}</p>}
            </div>
            <button className="modal__close" onClick={onClose} aria-label="Close"><Icon name="close" size={16} /></button>
          </header>
        ) : null}
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>
  );
  return createPortal(el, document.body);
});
