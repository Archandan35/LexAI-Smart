
// Toggle — accessible on/off switch reusing design-system colours.
export default function Toggle({ checked, onChange, disabled, label, size = 'md' }) {
  return (
    <label className={`toggle ${checked ? 'toggle--on' : ''} ${disabled ? 'toggle--disabled' : ''} toggle--${size}`}>
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="toggle__track"><span className="toggle__thumb" /></span>
      {label && <span className="toggle__label">{label}</span>}
    </label>
  );
}
