import { useRef } from 'react';
import Icon from '@/components/Icon.jsx';
import { useFormat, formatDate } from '@/utils/format.js';
import { DateEngine } from '@/core/DateEngine.js';

export function DateField({ value, onChange, placeholder, className, type, ...rest }) {
  useFormat();
  const ref = useRef(null);
  const iso = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
  const display = iso ? formatDate(iso) : '';

  const openPicker = () => {
    const el = ref.current;
    if (!el || rest.disabled) return;
    try {
      if (typeof el.showPicker === 'function') {
        el.showPicker();
        return;
      }
    } catch {
      // showPicker can throw if not user-activated; fall back to focus
    }
    el.focus();
  };

  return (
    <div
      className={['datefield', className].filter(Boolean).join(' ')}
      onClick={openPicker}
    >
      <input
        type="text"
        className="input datefield__display"
        readOnly
        tabIndex={-1}
        value={display}
        placeholder={placeholder || DateEngine.getDatePlaceholder()}
        disabled={rest.disabled}
      />
      <Icon name="calendar" size={15} className="datefield__icon" />
      <input
        {...rest}
        ref={ref}
        type="date"
        className="datefield__native"
        value={iso}
        onChange={onChange}
      />
    </div>
  );
}

export default DateField;
