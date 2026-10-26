// Small HTML helpers. Song titles, stories and taxonomy names are the author's text: anything
// interpolated into innerHTML goes through esc() and is never read as markup.
import type { Song } from '../content/parse';
import { turnTiming } from '../domain/snowflake';

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const esc = (text: string): string => text.replace(/[&<>"']/g, (c) => ENTITIES[c]!);

/** The dashed ring used for "recorded with a band" — the same mark as the snowflake's halo. */
export const bandRing = (size: number, label = ''): string =>
  `<svg width="${size}" height="${size}" viewBox="0 0 16 16" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'}><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.3 2.3"/></svg>`;

/** «Skip to previous» (a bar and a triangle); `.nav.next` mirrors it for «next». */
export const SKIP_ICON =
  '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15 3.5v11L6.5 9z" fill="currentColor"/></svg>';

/** Inline style for a `.turn` element: the snowflake's own slow turn, as on the record. */
export function turnStyle(song: Pick<Song, 'slug' | 'complexity'>): string {
  const { period, delay } = turnTiming(song);
  return `animation-duration:${period.toFixed(2)}s;animation-delay:${delay.toFixed(2)}s`;
}
