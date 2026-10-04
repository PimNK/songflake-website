import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/views/markdown';

describe('story Markdown', () => {
  it('renders Markdown', () => {
    expect(renderMarkdown('**Bold** and *it*')).toBe(
      '<p><strong>Bold</strong> and <em>it</em></p>\n',
    );
  });
  it('shows raw HTML as text', () => {
    const html = renderMarkdown('Hi <script>alert(1)</script> <b>x</b>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<b>');
  });
  it('keeps safe links only', () => {
    expect(renderMarkdown('[a](https://x.org)')).toContain('<a href="https://x.org"');
    const bad = renderMarkdown('[a](javascript:alert(1))');
    expect(bad).not.toContain('href');
    expect(bad).toContain('a');
  });
  it('keeps the author text, e.g. Cyrillic and a lone ")"', () => {
    expect(renderMarkdown('На луну. So we tried )')).toContain('На луну. So we tried )');
  });
});
