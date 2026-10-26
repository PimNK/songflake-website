// URL ⇄ state (CLAUDE.md §4.5). The hash holds what is worth sharing:
//   #/            record          #/list          list
//   #/song/<slug> card over the last view, optionally ?t=2:15
//   filters as a query only when they differ from the default.
// Opening a card or switching views pushes a history entry, so Back closes the card first;
// filter changes replace the current entry.
import { fromQuery, toQuery, type FilterSpace } from '../domain/filters';
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
  // No hash at all keeps the starting view (the list on narrow screens); `#/` is the record.
  if (!raw) return { view: null, slug: null, query };
  return { view: parts[0] === 'list' ? 'list' : 'record', slug: null, query };
}

export function stateToHash(s: AppState, space: FilterSpace): string {
  const q = new URLSearchParams(toQuery(s.filters, space));
  if (s.openSlug && s.cue !== null) q.set('t', formatTime(s.cue));
  const path = s.openSlug
    ? `/song/${encodeURIComponent(s.openSlug)}`
    : s.view === 'list'
      ? '/list'
      : '/';
  const search = q.toString().replace(/%2C/g, ',').replace(/%3A/g, ':');
  return `#${path}${search ? `?${search}` : ''}`;
}

/** Writes the state's hash unless it is already there; pushes a history entry or replaces. */
function writeHash(s: AppState, space: FilterSpace, push: boolean): void {
  const hash = stateToHash(s, space);
  if (hash === (location.hash || '#/')) return;
  if (push) history.pushState(null, '', hash);
  else history.replaceState(null, '', hash);
}

export interface Router {
  /** Moves to a view the screen has after it changed size; replaces the entry, never pushes. */
  refit(): void;
}

/**
 * Keeps the store and the URL in step. `known` tells whether a slug exists; `fitView` maps a
 * view to one the screen has (phones have the list only).
 */
export function startRouter(
  store: Store,
  space: FilterSpace,
  known: (slug: string) => boolean,
  fitView: (view: ViewName) => ViewName = (view) => view,
): Router {
  let reading = false;
  // True while the open card has its own history entry (opened in the app, not by a deep link):
  // closing it then goes back instead of adding an entry, so Back never reopens it.
  let cardEntry = false;

  const write = (push: boolean): void => writeHash(store.get(), space, push);

  const read = (): void => {
    const route = parseHash(location.hash);
    const filters = fromQuery(route.query, space);
    const t = route.query.get('t');
    reading = true;
    if (route.slug && !known(route.slug)) {
      store.set({ filters, openSlug: null, cue: null, notice: strings.card.notFound });
      write(false);
    } else {
      store.set({
        filters,
        view: fitView(route.view ?? store.get().view),
        openSlug: route.slug,
        cue: route.slug && t ? parseTime(t) : null,
        notice: null,
      });
    }
    if (!route.slug) cardEntry = false;
    reading = false;
    // A view the screen does not have (the record on a phone) is corrected in the URL too.
    if (route.view && fitView(route.view) !== route.view) write(false);
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
  // An empty hash becomes the starting view's own, so Back to it never keeps another view.
  if (!location.hash) history.replaceState(null, '', stateToHash(store.get(), space));

  // Re-reading the URL fits the view to the screen and replaces the entry, never pushes.
  return { refit: read };
}
