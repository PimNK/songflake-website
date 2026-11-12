// Small HTML helpers. Song titles, stories and taxonomy names are the author's text: anything
// interpolated into innerHTML goes through esc() and is never read as markup.
import type { Song } from '../content/parse';
import { turnTiming } from '../domain/snowflake';
import { strings } from '../strings';

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const esc = (text: string): string => text.replace(/[&<>"']/g, (c) => ENTITIES[c]!);

const PATHS = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
  prev: 'M18 6l-8.5 6L18 18zM6 6h2v12H6z',
  next: 'M6 6l8.5 6L6 18zM16 6h2v12h-2z',
};

/** The transport keys' glyphs: play, pause, previous, next. */
export const icon = (name: keyof typeof PATHS): string =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${PATHS[name]}"/></svg>`;

/** The close key's ✕. */
export const CLOSE_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

/**
 * The intro (strings.hero.intro) as markup: a blank line starts a paragraph, a line opening with
 * «_» is a list line, other lines break.
 */
export function introHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((block) => {
      let html = '';
      let list: string[] = [];
      const flush = (): void => {
        if (list.length) html += `<ul>${list.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
        list = [];
      };
      const lines: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('_')) {
          if (lines.length) html += `<p>${lines.map(esc).join('<br>')}</p>`;
          lines.length = 0;
          list.push(line.slice(1));
        } else {
          flush();
          lines.push(line);
        }
      }
      flush();
      if (lines.length) html += `<p>${lines.map(esc).join('<br>')}</p>`;
      return html;
    })
    .join('');
}

/** Inline style for a `.turn` element: the snowflake's own slow turn, as on the record. */
export function turnStyle(song: Pick<Song, 'slug' | 'complexity'>): string {
  const { period, delay } = turnTiming(song);
  return `animation-duration:${period.toFixed(2)}s;animation-delay:${delay.toFixed(2)}s`;
}

/**
 * An ⓘ that explains a block on hover or focus; `bubble` is trusted markup from strings.ts. `end`
 * opens the bubble leftwards, for an ⓘ near the right edge.
 */
export const info = (bubble: string, end = false): string =>
  `<span class="qi${end ? ' end' : ''}" tabindex="0" aria-label="${strings.aboutBlock}">i<span class="bubble" role="tooltip">${bubble}</span></span>`;
