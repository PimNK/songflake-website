// Filter state, matching, counts and the URL query form (CLAUDE.md §4.2, §4.5). Pure.
import type { Song } from '../content/parse';
import type { Taxonomy } from '../content/taxonomy';

export const COMPLEXITY_MIN = 5;
export const COMPLEXITY_MAX = 15;

export interface FilterState {
  styles: ReadonlySet<string>;
  accents: ReadonlySet<string>;
  min: number;
  max: number;
  band: boolean;
  solo: boolean;
  ready: boolean;
  inProgress: boolean;
}

export function defaultFilters(taxonomy: Taxonomy): FilterState {
  return {
    styles: new Set(taxonomy.styles),
    accents: new Set(taxonomy.accents.map((a) => a.id)),
    min: COMPLEXITY_MIN,
    max: COMPLEXITY_MAX,
    band: true,
    solo: true,
    ready: true,
    inProgress: true,
  };
}

export function matches(song: Song, f: FilterState): boolean {
  return (
    f.styles.has(song.style) &&
    song.complexityTotal >= f.min &&
    song.complexityTotal <= f.max &&
    song.accents.some((a) => f.accents.has(a)) &&
    (song.band !== null ? f.band : f.solo) &&
    (song.status === 'ready' ? f.ready : f.inProgress)
  );
}

export const countMatching = (songs: readonly Song[], f: FilterState): number =>
  songs.reduce((n, s) => n + (matches(s, f) ? 1 : 0), 0);

/** Moves one end of the complexity range; the other follows so min never exceeds max. */
export function setRange(f: FilterState, end: 'min' | 'max', value: number): FilterState {
  const v = Math.min(COMPLEXITY_MAX, Math.max(COMPLEXITY_MIN, Math.round(value)));
  return end === 'min'
    ? { ...f, min: v, max: Math.max(f.max, v) }
    : { ...f, max: v, min: Math.min(f.min, v) };
}

export function toggle(set: ReadonlySet<string>, id: string, on: boolean): Set<string> {
  const next = new Set(set);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

export interface FilterCounts {
  styles: Record<string, number>;
  accents: Record<string, number>;
  band: number;
  solo: number;
  ready: number;
  inProgress: number;
}

/** How many songs carry each option, over the whole collection. Zero counts are kept. */
export function countOptions(songs: readonly Song[], taxonomy: Taxonomy): FilterCounts {
  const styles = Object.fromEntries(taxonomy.styles.map((s) => [s, 0]));
  const accents = Object.fromEntries(taxonomy.accents.map((a) => [a.id, 0]));
  const counts: FilterCounts = { styles, accents, band: 0, solo: 0, ready: 0, inProgress: 0 };
  for (const s of songs) {
    if (s.style in styles) styles[s.style]!++;
    for (const a of s.accents) if (a in accents) accents[a]!++;
    if (s.band !== null) counts.band++;
    else counts.solo++;
    if (s.status === 'ready') counts.ready++;
    else counts.inProgress++;
  }
  return counts;
}

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean =>
  a.size === b.size && [...a].every((x) => b.has(x));

export function isDefault(f: FilterState, taxonomy: Taxonomy): boolean {
  return Object.keys(toQuery(f, taxonomy)).length === 0;
}

const pair = (a: boolean, b: boolean, names: [string, string]): string | null =>
  a && b ? null : a ? names[0] : b ? names[1] : 'none';

/** Only what differs from the default, e.g. `{ style: 'Progressive,Ambient', min: '9' }`. */
export function toQuery(f: FilterState, taxonomy: Taxonomy): Record<string, string> {
  const d = defaultFilters(taxonomy);
  const q: Record<string, string> = {};
  if (!sameSet(f.styles, d.styles))
    q.style = taxonomy.styles.filter((s) => f.styles.has(s)).join(',');
  if (!sameSet(f.accents, d.accents)) {
    q.listen = taxonomy.accents
      .filter((a) => f.accents.has(a.id))
      .map((a) => a.id)
      .join(',');
  }
  if (f.min !== d.min) q.min = String(f.min);
  if (f.max !== d.max) q.max = String(f.max);
  const band = pair(f.band, f.solo, ['band', 'solo']);
  if (band) q.band = band;
  const status = pair(f.ready, f.inProgress, ['ready', 'in-progress']);
  if (status) q.status = status;
  return q;
}

/** Reads a query back; unknown names and values are ignored, so old links never break. */
export function fromQuery(q: URLSearchParams, taxonomy: Taxonomy): FilterState {
  let f = defaultFilters(taxonomy);
  // An empty list means "none checked"; a list with only unknown names keeps the default.
  const list = (key: string, known: string[]): Set<string> | null => {
    const raw = q.get(key);
    if (raw === null) return null;
    const items = raw.split(',').filter(Boolean);
    const kept = items.filter((x) => known.includes(x));
    return items.length && !kept.length ? null : new Set(kept);
  };
  const styles = list('style', taxonomy.styles);
  const accents = list(
    'listen',
    taxonomy.accents.map((a) => a.id),
  );
  if (styles) f = { ...f, styles };
  if (accents) f = { ...f, accents };
  const num = (key: string): number | null => {
    const raw = q.get(key);
    const n = Number(raw);
    return raw && Number.isFinite(n) ? n : null;
  };
  const max = num('max');
  const min = num('min');
  if (max !== null) f = setRange(f, 'max', max);
  if (min !== null) f = setRange(f, 'min', min);
  const band = q.get('band');
  if (band === 'band' || band === 'solo' || band === 'none') {
    f = { ...f, band: band === 'band', solo: band === 'solo' };
  }
  const status = q.get('status');
  if (status === 'ready' || status === 'in-progress' || status === 'none') {
    f = { ...f, ready: status === 'ready', inProgress: status === 'in-progress' };
  }
  return f;
}

/**
 * The next or previous song for the card's ← / →, walking the filtered order (wrapping).
 * When the open song is itself filtered out, the full order is walked instead.
 */
export function neighbour(
  songs: readonly Song[],
  f: FilterState,
  slug: string,
  direction: -1 | 1,
): string | null {
  const filtered = songs.filter((s) => matches(s, f));
  const list = filtered.some((s) => s.slug === slug) ? filtered : songs;
  const i = list.findIndex((s) => s.slug === slug);
  if (i < 0 || !list.length) return null;
  return list[(i + direction + list.length) % list.length]!.slug;
}
