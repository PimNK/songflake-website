// Escaping for text interpolated into innerHTML. Song titles, stories and taxonomy names are the
// author's text and must never be read as markup.
const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const esc = (text: string): string => text.replace(/[&<>"']/g, (c) => ENTITIES[c]!);
