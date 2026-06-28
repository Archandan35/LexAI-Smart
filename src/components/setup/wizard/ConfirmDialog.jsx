import Button from '@/components/Button.jsx';

export default function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, variant, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal--confirm" onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <span className="modal__title">{title || 'Confirm'}</span>
          <button className="modal__close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal__body">
          <p className="modal__body-text">{message}</p>
        </div>
        <div className="modal__foot">
          <Button variant="ghost" onClick={onCancel}>{cancelLabel || 'Cancel'}</Button>
          <Button variant={variant || 'primary'} onClick={onConfirm}>{confirmLabel || 'Confirm'}</Button>
        </div>
      </div>
    </div>
  );
}
