import { memo } from 'react';
import { DateInput } from '@/components/DateInput.jsx';

export const Field = memo(function Field({ label, children, hint, htmlFor, required }) {
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  return (
    <div className="field">
      {label && <label className="field__label" htmlFor={htmlFor}>{label}</label>}
      {typeof children === 'object' && children !== null && !Array.isArray(children)
        ? <ChildrenWithAria cloned={children} hintId={hintId} required={required} />
        : children}
      {hint && <div className="field__hint" id={hintId}>{hint}</div>}
    </div>
  );
});

function ChildrenWithAria({ cloned, hintId, required }) {
  if (!cloned) return cloned;
  const extra = {};
  if (hintId) extra['aria-describedby'] = hintId;
  if (required) extra['aria-required'] = 'true';
  if (Object.keys(extra).length === 0) return cloned;
  return <>{Object.assign({}, cloned, { props: { ...cloned.props, ...extra } })}</>;
}

export const Input = memo(function Input({ className, ...props }) {
  if (props.type === "date") return <DateInput className={className} {...props} />;
  return <input className={["input", className].filter(Boolean).join(" ")} {...props} />;
});

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
