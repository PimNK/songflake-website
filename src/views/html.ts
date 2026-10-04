// Small HTML helpers. Song titles, stories and taxonomy names are the author's text: anything
// interpolated into innerHTML goes through esc() and is never read as markup.
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
