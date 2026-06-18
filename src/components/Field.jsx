import React from 'react';

export function Field({ label, children, hint }) {
  return (
    <div className="field">
      {label && <label className="field__label">{label}</label>}
      {children}
      {hint && <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

export function Input(props) { return <input className="input" {...props} />; }
export function Textarea(props) { return <textarea className="textarea" {...props} />; }
export function Select({ children, ...props }) { return <select className="select" {...props}>{children}</select>; }

export default Field;
