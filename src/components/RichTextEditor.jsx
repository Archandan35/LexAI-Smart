import React, { useRef, useEffect } from 'react';

// RichTextEditor — lightweight contentEditable editor using the built-in
// document.execCommand formatting (bold/italic/underline/lists). No external
// editor dependency. Emits plain text via onChange for portable storage/export.
const TOOLS = [
  { cmd: 'bold', label: 'B', style: { fontWeight: 800 } },
  { cmd: 'italic', label: 'I', style: { fontStyle: 'italic' } },
  { cmd: 'underline', label: 'U', style: { textDecoration: 'underline' } },
  { cmd: 'insertUnorderedList', label: '••' },
  { cmd: 'insertOrderedList', label: '1.' },
  { cmd: 'justifyLeft', label: '⯇' },
  { cmd: 'justifyCenter', label: '☰' },
];

export default function RichTextEditor({ value, onChange }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value || '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const exec = (cmd) => {
    document.execCommand(cmd, false, null);
    ref.current?.focus();
    onChange?.(ref.current.innerText);
  };

  return (
    <div>
      <div className="editor-toolbar">
        {TOOLS.map((t) => (
          <button key={t.cmd} type="button" onMouseDown={(e) => { e.preventDefault(); exec(t.cmd); }} style={t.style} title={t.cmd}>
            {t.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        className="editor-surface"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange?.(e.currentTarget.innerText)}
      />
    </div>
  );
}
