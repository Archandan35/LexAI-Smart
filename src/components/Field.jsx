
export function Field({ label, children, hint }) {
  return (
    <div className="field">
      {label && <label className="field__label">{label}</label>}
      {children}
      {hint && <div className="field__hint">{hint}</div>}
    </div>
  );
}

export function Input({ className, ...props }) { return <input className={["input", className].filter(Boolean).join(" ")} {...props} />; }
export function Textarea({ className, ...props }) { return <textarea className={["textarea", className].filter(Boolean).join(" ")} {...props} />; }
export function Select({ children, className, options, ...props }) {
  return (
    <select className={["select", className].filter(Boolean).join(" ")} {...props}>
      {options
        ? options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        : children}
    </select>
  );
}

export default Field;
