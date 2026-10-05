// URL ⇄ state (CLAUDE.md §4.5). The hash holds what is worth sharing:
//   #/            record          #/list          list
//   #/song/<slug> card over the last view, optionally ?t=2:15
//   filters as a query only when they differ from the default.
// Opening a card or switching views pushes a history entry, so Back closes the card first;
// filter changes replace the current entry.
import type { Taxonomy } from '../content/taxonomy';
import { fromQuery, toQuery } from '../domain/filters';
import { formatTime, parseTime } from '../domain/pins';
import { strings } from '../strings';
import type { AppState, Store, ViewName } from './state';

interface Route {
  view: ViewName | null;
  slug: string | null;
  query: URLSearchParams;
}

/** A malformed escape in a shared link falls back to the raw text (→ "Track not found"). */
function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

export type HistoryAction = 'push' | 'replace' | 'back';

/**
 * How a state change touches history. Opening a card or switching views pushes; closing a card
 * that has its own entry goes back (so Back never reopens it); everything else replaces.
 */
export function historyAction(
  prev: Pick<AppState, 'view' | 'openSlug'>,
  next: Pick<AppState, 'view' | 'openSlug'>,
  cardEntry: boolean,
): HistoryAction {
  if (prev.openSlug && !next.openSlug && cardEntry) return 'back';
  if (!prev.openSlug && next.openSlug) return 'push';
  return next.view !== prev.view ? 'push' : 'replace';
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const cut = raw.indexOf('?');
  const path = cut < 0 ? raw : raw.slice(0, cut);
  const search = cut < 0 ? '' : raw.slice(cut + 1);
  const parts = path.split('/').filter(Boolean);
  const query = new URLSearchParams(search);
  if (parts[0] === 'song' && parts[1]) return { view: null, slug: safeDecode(parts[1]), query };
  return { view: parts[0] === 'list' ? 'list' : 'record', slug: null, query };
}

export function stateToHash(s: AppState, taxonomy: Taxonomy): string {
  const q = new URLSearchParams(toQuery(s.filters, taxonomy));
  if (s.openSlug && s.cue !== null) q.set('t', formatTime(s.cue));
  const path = s.openSlug
    ? `/song/${encodeURIComponent(s.openSlug)}`
    : s.view === 'list'
      ? '/list'
      : '/';
  const search = q.toString().replace(/%2C/g, ',').replace(/%3A/g, ':');
  return `#${path}${search ? `?${search}` : ''}`;
}

/** Keeps the store and the URL in step. `known` tells whether a slug exists. */
export function startRouter(
  store: Store,
  taxonomy: Taxonomy,
  known: (slug: string) => boolean,
): void {
  let reading = false;
  // True while the open card has its own history entry (opened in the app, not by a deep link):
  // closing it then goes back instead of adding an entry, so Back never reopens it.
  let cardEntry = false;

  const write = (push: boolean): void => {
    const hash = stateToHash(store.get(), taxonomy);
    if (hash === (location.hash || '#/')) return;
    if (push) history.pushState(null, '', hash);
    else history.replaceState(null, '', hash);
  };

  const read = (): void => {
    const route = parseHash(location.hash);
    const filters = fromQuery(route.query, taxonomy);
    const t = route.query.get('t');
    reading = true;
    if (route.slug && !known(route.slug)) {
      store.set({ filters, openSlug: null, cue: null, notice: strings.card.notFound });
      write(false);
    } else {
      store.set({
        filters,
        view: route.view ?? store.get().view,
        openSlug: route.slug,
        cue: route.slug && t ? parseTime(t) : null,
        notice: null,
      });
    }
    if (!route.slug) cardEntry = false;
    reading = false;
  };

  store.subscribe((s, prev) => {
    if (reading) return;
    const action = historyAction(prev, s, cardEntry);
    if (action === 'back') {
      cardEntry = false;
      history.back();
      return;
    }
    if (!prev.openSlug && s.openSlug) cardEntry = true;
    write(action === 'push');
  });
  window.addEventListener('popstate', read);
  read();
}
