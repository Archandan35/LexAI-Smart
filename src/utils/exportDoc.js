// Dependency-free export helpers.
// - PDF: opens a print window (browser "Save as PDF"). Avoids bundling a PDF lib.
// - DOCX: emits a Word-compatible HTML document with the .doc extension, which
//   Word/LibreOffice open natively.
// Both are provider-agnostic and run entirely client-side.

// Render rich HTML as-is; wrap plain text so newlines survive.
function bodyHtml(content) {
  return /<[a-z][\s\S]*>/i.test(String(content || ''))
    ? content
    : `<pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;">${escapeHtml(content)}</pre>`;
}

export function exportPdf(title, content) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      body{font-family:'Times New Roman',Georgia,serif;line-height:1.7;padding:48px 60px;color:#1a2236;}
      h1{font-size:18px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
      table{border-collapse:collapse;}table td,table th{border:1px solid #888;padding:6px 10px;}
    </style></head><body>
    <h1>${escapeHtml(title)}</h1>${bodyHtml(content)}
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
  w.document.close();
}

export function exportDocx(title, content) {
  const html = `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
    <body style="font-family:'Times New Roman',Georgia,serif;font-size:12pt;line-height:1.6;">
    <h2 style="text-align:center;text-transform:uppercase;">${escapeHtml(title)}</h2>
    ${bodyHtml(content)}
    </body></html>`;
  const blob = new Blob([html], { type: 'application/msword' });
  triggerDownload(blob, `${safeName(title)}.doc`);
}

export function exportTxt(title, content) {
  // Strip HTML tags for a plain-text export (the editor emits HTML).
  const text = String(content || '').replace(/<br\s*\/?>(?=)/gi, '\n').replace(/<\/(p|div|h[1-6]|li)>/gi, '\n').replace(/<[^>]+>/g, '');
  triggerDownload(new Blob([text], { type: 'text/plain' }), `${safeName(title)}.txt`);
}

export function exportHtml(title, content) {
  const isHtml = /<[a-z][\s\S]*>/i.test(String(content || ''));
  const body = isHtml ? content : `<pre style="white-space:pre-wrap;font-family:Georgia,serif;">${escapeHtml(content)}</pre>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>body{font-family:'Times New Roman',Georgia,serif;line-height:1.7;padding:48px 60px;color:#1a2236;max-width:820px;margin:0 auto;}
    table{border-collapse:collapse;}table td,table th{border:1px solid #888;padding:6px 10px;}</style></head>
    <body>${body}</body></html>`;
  triggerDownload(new Blob([html], { type: 'text/html' }), `${safeName(title)}.html`);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
function safeName(s = 'document') {
  return s.replace(/[^a-z0-9]+/gi, '_').slice(0, 60);
}
