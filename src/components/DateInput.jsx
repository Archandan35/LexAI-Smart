import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/Icon.jsx';
import { DateEngine } from '@/core/DateEngine.js';

function parseToISO(str) {
  if (!str) return '';
  const s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/.exec(s);
  if (m) {
    const [d, mo, y] = [m[1], m[2], m[3]];
    const dt = new Date(`${y}-${mo}-${d}T00:00:00.000Z`);
    return Number.isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
  }
  return '';
}

export function DateInput({ value, onChange, placeholder, className, disabled, required, name, autoFocus }) {
  const [text, setText] = useState('');
  const [useFallback, setUseFallback] = useState(false);
  const nativeRef = useRef(null);

  const toDisplay = (v) => v ? DateEngine.toDisplayDate(v) : '';

  useEffect(() => {
    setText(toDisplay(value));
  }, [value]);

  const openPicker = () => {
    if (disabled) return;
    const el = nativeRef.current;
    if (el && typeof el.showPicker === 'function' && !useFallback) {
      try { el.showPicker(); return; } catch { }
    }
    setUseFallback(true);
    setTimeout(() => {
      const el = document.querySelector('.dateinput__native');
      if (el) {
        el.focus();
        if (typeof el.showPicker === 'function') {
          try { el.showPicker(); } catch { }
        }
      }
    }, 0);
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    setText(raw);
    if (!raw) {
      onChange && onChange({ target: { value: '', name } });
      return;
    }
    const parsed = parseToISO(raw);
    if (parsed) {
      onChange && onChange({ target: { value: parsed, name } });
    }
  };

  const handleNativeChange = (e) => {
    const v = e.target.value;
    onChange && onChange({ target: { value: v, name } });
    setText(toDisplay(v));
    setUseFallback(false);
  };

  return (
    <div
      className={['dateinput', className].filter(Boolean).join(' ')}
      data-disabled={disabled || undefined}
    >
      <input
        type="text"
        className="dateinput__field"
        placeholder={placeholder || 'dd/mm/yyyy'}
        value={text}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        name={name}
        autoFocus={autoFocus}
        autoComplete="off"
      />
      <button
        type="button"
        className="dateinput__cal"
        title="Pick date"
        onClick={openPicker}
        tabIndex={-1}
        disabled={disabled}
      >
        <Icon name="calendar" size={14} />
      </button>
      <input
        ref={nativeRef}
        type="date"
        className={`dateinput__native${useFallback ? ' dateinput__native--visible' : ''}`}
        value={DateEngine.toInputDate(value)}
        onChange={handleNativeChange}
        tabIndex={-1}
      />
    </div>
  );
}

export default DateInput;
