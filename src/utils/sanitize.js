const SAFE_TAGS = /<\/?(b|i|em|strong|u|br|p|ul|ol|li|a|blockquote|pre|code|span|div|h[1-6])(\s[^>]*)?>/gi;
const TAG_STRIP = /<[^>]*>/g;

export function stripTags(str) {
  if (typeof str !== 'string') return '';
  return str.replace(TAG_STRIP, '');
}

export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

export function sanitizeHtml(str) {
  if (typeof str !== 'string') return '';
  let s = str.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  s = s.replace(/on\w+\s*=\s*"[^"]*"/gi, '');
  s = s.replace(/on\w+\s*=\s*'[^']*'/gi, '');
  s = s.replace(/on\w+\s*=\s*[^\s>]+/gi, '');
  s = s.replace(/javascript\s*:/gi, '');
  s = s.replace(/<[^>]*>/g, (tag) => {
    if (SAFE_TAGS.test(tag)) return tag;
    const match = tag.match(/<\/?(\w+)/);
    if (match && ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'meta', 'link'].includes(match[1].toLowerCase())) {
      return '';
    }
    const safeAttrs = tag.replace(/\s+(style|class|id|href|target|rel|title|dir|lang)\s*=\s*"[^"]*"/gi, (m) => m);
    const stripped = safeAttrs.replace(/<(\/)?(\w+)(\s[^>]*)?>/g, (m, close, tagName) => {
      const name = tagName.toLowerCase();
      if (['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'ul', 'ol', 'li', 'a', 'blockquote', 'pre', 'code', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr'].includes(name)) {
        return m;
      }
      return '';
    });
    return stripped || '';
  });
  return s;
}

export function safeHtml(str) {
  return { __html: sanitizeHtml(str) };
}

export default { stripTags, escapeHtml, sanitizeHtml, safeHtml };
