// Bootstrap: load content, wire views to state. No logic of any kind.
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/filters.css';
import '../styles/record.css';
import '../styles/list.css';
import '../styles/card.css';
import '../styles/card-body.css';
import '../styles/player.css';
import '../styles/random-player.css';
import '../styles/hints.css';
import '../styles/overlay.css';
import { loadContent } from '../content/load';
import type { Song } from '../content/parse';
import { countMatching, defaultFilters, matches, playableNeighbour } from '../domain/filters';
import { yearRange } from '../domain/record-layout';
import { showContentOverlay } from '../views/content-overlay';
import { mountFilterPanel } from '../views/filter-panel';
import { mountList } from '../views/list';
import { onViewTab, placeDials, renderPage, showView } from '../views/page';
import { mountRecord } from '../views/record';
import { mountTrackCard } from '../views/track-card';
import { mountRandomPlayer } from '../views/random-player';
import { startHints } from '../views/hints';
import { mountAbout } from '../views/about';
import { Playback } from '../views/playback';
import { mountPlayer } from '../views/player';
import { mountDials, startBacklight } from '../views/backlight';
import { restoreVolume } from '../views/volume';
import { startRouter } from './router';
import { Store, type ViewName } from './state';

const content = loadContent();
if (import.meta.env.DEV) showContentOverlay(content.errors, content.warnings);
const { songs, taxonomy } = content;
const years = yearRange(songs);
const space = { taxonomy, years };

// Phones and tablets open on the list; wide screens on the record. Phones have the list only.
const narrow = window.matchMedia('(max-width: 1099.98px)').matches;
// Must match the phone breakpoint in styles/layout.css, which hides the Record / List switch.
const PHONE = window.matchMedia('(max-width: 599.98px)');
const fitView = (view: ViewName): ViewName => (PHONE.matches ? 'list' : view);
const store = new Store({
  view: narrow ? 'list' : 'record',
  filters: defaultFilters(space),
  openSlug: null,
  cue: null,
  notice: null,
});
const open = (slug: string): void => store.set({ openSlug: slug, cue: null, notice: null });

startBacklight();
const slots = renderPage(document.querySelector<HTMLElement>('#app')!);
const record = mountRecord(slots.stage, content, open);
const list = mountList(slots.listView, content, open);
const panel = mountFilterPanel(
  slots.filters,
  slots.filterToggle,
  content,
  space,
  () => store.get().filters,
  (filters) => store.set({ filters }),
);
placeDials(slots, mountDials());
const playback = new Playback();
restoreVolume(playback);
const bySlug = (slug: string | null): Song | undefined => songs.find((x) => x.slug === slug);
const playable = songs.filter((x) => !!x.audioSrc);
const random = mountRandomPlayer(slots.player, playback, taxonomy, {
  // Playable tracks that match the filters; all playable ones when none match.
  pool: () => {
    const on = playable.filter((x) => matches(x, store.get().filters, years));
    return (on.length ? on : playable).map((x) => x.slug);
  },
  song: bySlug,
  open,
});
/** The previous / next track with a recording in the card's order (filtered, wrapping). */
const playableStep = (slug: string, direction: -1 | 1): Song | null =>
  bySlug(
    playableNeighbour(songs, store.get().filters, years, slug, direction, (x) => !!x.audioSrc),
  ) ?? null;
playback.autoAdvance(
  (ended, mode) => (mode === 'shuffle' ? random.next() : playableStep(ended.slug, 1)),
  (from, to) => {
    if (store.get().openSlug === from.slug) store.set({ openSlug: to.slug, cue: null });
  },
);
const card = mountTrackCard(content, playback, {
  close: () => store.set({ openSlug: null, cue: null }),
  // As on the player's keys: the previous / next track starts playing, and the card follows it.
  step: (direction) => {
    const at = store.get().openSlug;
    const to = at ? playableStep(at, direction) : null;
    if (!to) return;
    playback.play(to, 'order');
    store.set({ openSlug: to.slug, cue: null });
  },
  player: (slot, song, cue) =>
    mountPlayer(slot, song, cue, playback, {
      warn: (message) => {
        if (import.meta.env.DEV) showContentOverlay([], [message]);
      },
    }),
});
onViewTab(slots, (view) => store.set({ view, notice: null }));
mountAbout(slots.aboutButton, () => startHints(slots, true));

store.subscribe((s, prev) => {
  if (s.openSlug !== prev.openSlug || s.cue !== prev.cue) {
    const song = songs.find((x) => x.slug === s.openSlug);
    if (song) card.show(song, s.cue);
    else card.hide();
  }
  const match = (song: Song): boolean => matches(song, s.filters, years);
  record.setMatch(match);
  record.setActive(s.view === 'record');
  list.update(match);
  panel.update(s.filters, countMatching(songs, s.filters, years));
  showView(slots, s.view, s.notice);
});
// The current track's snowflake pulses on the record and in the list, also while paused; the
// console's power lamp is lit while something plays.
let pulsing: string | null = null;
playback.subscribe(() => {
  slots.page.classList.toggle('playing', playback.isPlaying());
  const slug = playback.song?.slug ?? null;
  if (slug === pulsing) return;
  pulsing = slug;
  record.setPlaying(slug);
  list.setPlaying(slug);
});
const router = startRouter(store, space, (slug) => songs.some((x) => x.slug === slug), fitView);
PHONE.addEventListener('change', () => router.refit());
if (!store.get().openSlug) startHints(slots);
