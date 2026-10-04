// The story's Markdown → HTML, with raw HTML disabled: any HTML in the author's text is shown
// as text, and only http(s), mailto and relative links are kept.
import { Marked } from 'marked';
import { esc } from './html';

const SAFE_LINK = /^(https?:|mailto:|\/|#|\.)/i;

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    html({ text }) {
      return esc(text);
    },
    link({ href, title, tokens }) {
      const label = this.parser.parseInline(tokens);
      if (!SAFE_LINK.test(href)) return label;
      const t = title ? ` title="${esc(title)}"` : '';
      return `<a href="${esc(href)}"${t} rel="noopener noreferrer">${label}</a>`;
    },
    image({ text }) {
      return esc(text);
    },
  },
});

export const renderMarkdown = (text: string): string => marked.parse(text, { async: false });
