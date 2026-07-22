import { describe, it, expect } from 'vitest';
import { stripTags, escapeHtml, sanitizeHtml, safeHtml } from './sanitize.js';

describe('stripTags', () => {
  it('removes <script> tags', () => {
    expect(stripTags('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello');
  });

  it('removes all HTML tags', () => {
    expect(stripTags('<p>Hello <b>world</b></p>')).toBe('Hello world');
  });

  it('returns empty string for null', () => {
    expect(stripTags(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(stripTags(undefined)).toBe('');
  });

  it('returns empty string for non-string input', () => {
    expect(stripTags(42)).toBe('');
  });
});

describe('escapeHtml', () => {
  it('escapes &, <, >', () => {
    expect(escapeHtml('& < >')).toBe('&amp; &lt; &gt;');
  });

  it('escapes double and single quotes', () => {
    expect(escapeHtml('"hello" \'world\'')).toBe('&quot;hello&quot; &#039;world&#039;');
  });

  it('returns empty string for null', () => {
    expect(escapeHtml(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('sanitizeHtml', () => {
  it('removes script tags but keeps <b> tags', () => {
    const result = sanitizeHtml('<b>bold</b><script>evil()</script>');
    expect(result).toBe('<b>bold</b>');
  });

  it('removes onerror handlers', () => {
    const result = sanitizeHtml('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain('onerror');
  });

  it('removes javascript: URLs', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain('javascript');
  });

  it('removes style and iframe tags', () => {
    const result = sanitizeHtml('<style>body{color:red}</style><iframe src="evil"></iframe>');
    expect(result).not.toContain('<style>');
    expect(result).not.toContain('<iframe>');
  });

  it('returns empty string for null input', () => {
    expect(sanitizeHtml(null)).toBe('');
  });
});

describe('safeHtml', () => {
  it('returns object with __html property', () => {
    const result = safeHtml('<b>text</b>');
    expect(result).toHaveProperty('__html');
    expect(typeof result.__html).toBe('string');
  });

  it('removes dangerous content from __html', () => {
    const result = safeHtml('<script>evil()</script><b>safe</b>');
    expect(result.__html).not.toContain('script');
    expect(result.__html).toContain('<b>safe</b>');
  });
});
