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
import '../styles/overlay.css';
import { loadContent } from '../content/load';
import type { Song } from '../content/parse';
import { countMatching, defaultFilters, matches, neighbour } from '../domain/filters';
import { yearRange } from '../domain/record-layout';
import { showContentOverlay } from '../views/content-overlay';
import { mountFilterPanel } from '../views/filter-panel';
import { renderHowTo, renderLegend } from '../views/legend';
import { mountList } from '../views/list';
import { onViewTab, renderPage, showView } from '../views/page';
import { mountRecord } from '../views/record';
import { mountTrackCard } from '../views/track-card';
import { mountMiniPlayer } from '../views/mini-player';
import { Playback } from '../views/playback';
import { mountPlayer } from '../views/player';
import { leadColour } from '../views/card-body';
import { songHash, startRouter } from './router';
import { Store } from './state';

const content = loadContent();
if (import.meta.env.DEV) showContentOverlay(content.errors, content.warnings);
const { songs, taxonomy } = content;

const store = new Store({
  view: 'record',
  filters: defaultFilters(taxonomy),
  openSlug: null,
  cue: null,
  notice: null,
});
const open = (slug: string): void => store.set({ openSlug: slug, cue: null, notice: null });

const slots = renderPage(document.querySelector<HTMLElement>('#app')!, content);
const record = mountRecord(slots.stage, content, open);
const list = mountList(slots.listView, content, open);
const panel = mountFilterPanel(
  slots.filters,
  content,
  () => store.get().filters,
  (filters) => store.set({ filters }),
);
const playback = new Playback();
const mini = mountMiniPlayer(playback, open);
const card = mountTrackCard(content, {
  close: () => store.set({ openSlug: null, cue: null }),
  step: (direction) => {
    const s = store.get();
    const slug = s.openSlug && neighbour(songs, s.filters, s.openSlug, direction);
    if (slug) store.set({ openSlug: slug, cue: null });
  },
  player: (slot, song, cue) =>
    mountPlayer(slot, song, cue, leadColour(song, taxonomy), playback, {
      linkFor: (slug, at) =>
        `${location.origin}${location.pathname}${songHash(slug, at, taxonomy)}`,
      warn: (message) => {
        if (import.meta.env.DEV) showContentOverlay([], [message]);
      },
    }),
});
onViewTab(slots, (view) => store.set({ view, notice: null }));
renderLegend(slots.legend, taxonomy, yearRange(songs));
renderHowTo(slots.howTo, taxonomy);

store.subscribe((s, prev) => {
  if (s.openSlug !== prev.openSlug || s.cue !== prev.cue) {
    const song = songs.find((x) => x.slug === s.openSlug);
    if (song) card.show(song, s.cue);
    else card.hide();
    mini.setCardSlug(song ? song.slug : null);
  }
  const match = (song: Song): boolean => matches(song, s.filters);
  record.setMatch(match);
  record.setActive(s.view === 'record');
  list.update(match);
  panel.update(s.filters, countMatching(songs, s.filters));
  showView(slots, s.view, s.notice);
});
startRouter(store, taxonomy, (slug) => songs.some((x) => x.slug === slug));
