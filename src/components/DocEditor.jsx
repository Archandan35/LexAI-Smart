import { useState, useEffect, useRef } from 'react';
import Icon from './Icon.jsx';

// DocEditor — Word-grade contentEditable editor (dependency-free, execCommand).
// Emits HTML via onChange. Supports fonts, sizes, colours/highlight, formatting,
// alignment, indent, lists, tables, links, page breaks, page layout + legal
// placeholders. Read-only mode hides the toolbar and disables editing.
const FONTS = ['Times New Roman', 'Calibri', 'Arial', 'Georgia', 'Verdana', 'Courier New'];
const SIZES = [
  { label: '10', v: 2 }, { label: '12', v: 3 }, { label: '14', v: 4 },
  { label: '18', v: 5 }, { label: '24', v: 6 }, { label: '36', v: 7 },
];
const HILITES = ['#fff59d', '#a5d6a7', '#90caf9', '#f48fb1', '#ffcc80', 'transparent'];
const TEXT_COLOURS = ['#000000', '#dc2626', '#2563eb', '#16a34a', '#ca8a04', '#9333ea', '#ea580c', '#0891b2', '#78716c', '#ffffff'];

import { sanitizeHtml } from '@/utils/sanitize.js';
const looksLikeHtml = (s) => typeof s === 'string' && /<[a-z][\s\S]*>/i.test(s);
const escapeHtml = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

export default function DocEditor({
  value, onChange, readOnly = false, pageSize = 'a4', orientation = 'portrait', margin = 'normal', placeholders,
}) {
  const ref = useRef(null);
  const [, force] = useState(0);
  const [menu, setMenu] = useState(null);

  useEffect(() => {
    if (!menu) return undefined;
    const close = () => setMenu(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  useEffect(() => {
    if (!ref.current) return;
    const html = looksLikeHtml(value) ? value : escapeHtml(value);
    if (ref.current.innerHTML !== html) ref.current.innerHTML = sanitizeHtml(html) || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = () => onChange?.(ref.current?.innerHTML || '');
  const exec = (cmd, val = null) => {
    if (readOnly) return;
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(cmd, false, val);
    ref.current?.focus();
    emit();
  };
  const insertHTML = (html) => exec('insertHTML', html);

  const insertTable = () => {
    const rows = 3; const cols = 3;
    let t = '<table class="doc-table"><tbody>';
    for (let r = 0; r < rows; r += 1) { t += '<tr>'; for (let c = 0; c < cols; c += 1) t += '<td>&nbsp;</td>'; t += '</tr>'; }
    t += '</tbody></table><p><br></p>';
    insertHTML(t);
  };
  const insertLink = () => { const url = prompt('Link URL:'); if (url) exec('createLink', url); };
  const insertImage = () => { const url = prompt('Image URL:'); if (url) insertHTML(`<img src="${url}" style="max-width:100%"/>`); };
  const pageBreak = () => insertHTML('<div class="doc-pagebreak"></div><p><br></p>');
  const insertPlaceholder = (text) => insertHTML(text);

  const Btn = ({ cmd, val, icon, label, title }) => (
    <button type="button" title={title || cmd} onMouseDown={(e) => { e.preventDefault(); exec(cmd, val); }}>
      {icon ? <Icon name={icon} size={15} /> : label}
    </button>
  );

  return (
    <div className={`doceditor ${readOnly ? 'doceditor--ro' : ''}`}>
      {!readOnly && (
        <div className="doc-toolbar">
          <div className="doc-tb-group">
            <Btn cmd="undo" icon="refresh" title="Undo" />
            <button type="button" title="Copy" onMouseDown={(e) => { e.preventDefault(); exec('copy'); }}><Icon name="copy" size={15} /></button>
            <button type="button" title="Paste (plain)" onMouseDown={(e) => { e.preventDefault(); navigator.clipboard?.readText?.().then((t) => insertHTML(escapeHtml(t))); }}>PV</button>
          </div>
          <div className="doc-tb-group">
            <select title="Font" onChange={(e) => exec('fontName', e.target.value)} defaultValue="Times New Roman">
              {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <select title="Size" onChange={(e) => exec('fontSize', e.target.value)} defaultValue="3">
              {SIZES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
          </div>
          <div className="doc-tb-group">
            <Btn cmd="bold" label="B" title="Bold" />
            <Btn cmd="italic" label="I" title="Italic" />
            <Btn cmd="underline" label="U" title="Underline" />
            <Btn cmd="strikeThrough" label="S" title="Strikethrough" />
            <Btn cmd="superscript" label="x²" title="Superscript" />
            <Btn cmd="subscript" label="x₂" title="Subscript" />
          </div>
          <div className="doc-tb-group">
            <div className="doc-menu-wrap">
              <button
                type="button"
                className={`doc-menu-btn${menu === 'color' ? ' doc-menu-btn--open' : ''}`}
                title="Text colour"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setMenu(menu === 'color' ? null : 'color'); }}
              >
                <span className="doc-menu-btn__a">A</span>
                <span className="doc-menu-btn__caret">▾</span>
              </button>
              {menu === 'color' && (
                <div className="doc-colour-pop" onMouseDown={(e) => e.stopPropagation()}>
                  {TEXT_COLOURS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      className={`doc-colour-swatch${c === '#ffffff' ? ' doc-colour-swatch--bordered' : ''}`}
                      style={{ '--sw': c }}
                      onMouseDown={(e) => { e.preventDefault(); exec('foreColor', c); setMenu(null); }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="doc-menu-wrap">
              <button
                type="button"
                className={`doc-menu-btn${menu === 'hilite' ? ' doc-menu-btn--open' : ''}`}
                title="Highlight colour"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setMenu(menu === 'hilite' ? null : 'hilite'); }}
              >
                <span className="doc-menu-btn__hl">H</span>
                <span className="doc-menu-btn__caret">▾</span>
              </button>
              {menu === 'hilite' && (
                <div className="doc-colour-pop doc-colour-pop--hilite" onMouseDown={(e) => e.stopPropagation()}>
                  {HILITES.map((h) => (
                    <button
                      key={h}
                      type="button"
                      title={h === 'transparent' ? 'No highlight' : 'Highlight'}
                      className="doc-hilite"
                      style={{ '--sw': h === 'transparent' ? '#fff' : h }}
                      onMouseDown={(e) => { e.preventDefault(); exec('hiliteColor', h); setMenu(null); }}
                    >
                      {h === 'transparent' ? '×' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="doc-tb-group">
            <Btn cmd="justifyLeft" label="⯇" title="Align left" />
            <Btn cmd="justifyCenter" label="≡" title="Align center" />
            <Btn cmd="justifyRight" label="⯈" title="Align right" />
            <Btn cmd="justifyFull" label="☰" title="Justify" />
          </div>
          <div className="doc-tb-group">
            <Btn cmd="outdent" label="⇤" title="Decrease indent" />
            <Btn cmd="indent" label="⇥" title="Increase indent" />
            <Btn cmd="insertUnorderedList" label="•" title="Bullet list" />
            <Btn cmd="insertOrderedList" label="1." title="Numbered list" />
          </div>
          <div className="doc-tb-group">
            <button type="button" title="Insert table" onMouseDown={(e) => { e.preventDefault(); insertTable(); }}><Icon name="grid" size={15} /></button>
            <button type="button" title="Insert link" onMouseDown={(e) => { e.preventDefault(); insertLink(); }}><Icon name="link" size={15} /></button>
            <button type="button" title="Insert image" onMouseDown={(e) => { e.preventDefault(); insertImage(); }}><Icon name="file" size={15} /></button>
            <button type="button" title="Page break" onMouseDown={(e) => { e.preventDefault(); pageBreak(); }}>⤓</button>
            <Btn cmd="removeFormat" label="⌫" title="Clear formatting" />
          </div>
          {placeholders && (
            <div className="doc-tb-group">
              <select title="Insert case detail" defaultValue="" onChange={(e) => { if (e.target.value) insertPlaceholder(e.target.value); e.target.value = ''; }}>
                <option value="">Insert…</option>
                {placeholders.map((p) => <option key={p.label} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
      <div className="doc-canvas">
        <div
          ref={ref}
          className={`doc-page doc-page--${pageSize} doc-page--${orientation} doc-margin--${margin}`}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={() => { emit(); force((n) => n + 1); }}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData?.getData('text/plain');
            if (text) insertHTML(escapeHtml(text));
          }}
        />
      </div>
    </div>
  );
}

