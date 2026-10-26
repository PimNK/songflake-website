// The tile grid and its empty state (CLAUDE.md §4.4); each tile's snowflake turns on its own
// axis, and the playing track's pulses. No filtering logic — a match function comes from the
// caller.
import type { Content } from '../content/load';
import type { Song } from '../content/parse';
import { flakeOf, tileFlake } from '../domain/snowflake';
import { paintSnowflake } from '../render/snowflake';
import { strings } from '../strings';
import { bandRing, esc, turnStyle } from './html';

export interface ListView {
  update(match: (song: Song) => boolean): void;
  setPlaying(slug: string | null): void;
}

const TILE_RADIUS = 40;

function tile(song: Song, content: Content): HTMLButtonElement {
  const { taxonomy } = content;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tile';
  b.dataset.slug = song.slug;
  const flake = flakeOf(song, taxonomy);
  const canvas = document.createElement('canvas');
  canvas.className = 'turn';
  canvas.style.cssText = turnStyle(song);
  // The flake box is as wide as the largest tile snowflake at most and scales with the tile.
  const { R, full, share } = tileFlake(song.complexityTotal, TILE_RADIUS);
  paintSnowflake(canvas, flake.params, flake.colours, R);
  canvas.style.width = `${share * 100}%`;
  canvas.style.height = 'auto';
  const year = song.years.ready !== undefined ? String(song.years.ready) : strings.list.inProgress;
  const dots = song.accents
    .map((id) => {
      const a = taxonomy.accents.find((x) => x.id === id);
      return a ? `<i style="background:${esc(a.colour)}" title="${esc(a.name)}"></i>` : '';
    })
    .join('');
  const box = document.createElement('span');
  box.className = 'flake';
  box.style.maxWidth = `${full}px`;
  box.append(canvas);
  b.append(box);
  b.insertAdjacentHTML(
    'beforeend',
    `<b>${esc(song.title)}</b><small>${esc(strings.list.year(song.style, year))}</small>
     <span class="dots">${dots}${song.band !== null ? bandRing(11, strings.list.band) : ''}</span>`,
  );
  return b;
}

export function mountList(
  el: HTMLElement,
  content: Content,
  onOpen: (slug: string) => void,
): ListView {
  el.innerHTML = `<div class="gallery"></div><p class="lead empty" hidden>${strings.list.empty}</p>`;
  const gallery = el.querySelector<HTMLElement>('.gallery')!;
  const empty = el.querySelector<HTMLElement>('.empty')!;
  const tiles = content.songs.map((s) => tile(s, content));
  gallery.append(...tiles);
  gallery.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('.tile');
    if (t?.dataset.slug) onOpen(t.dataset.slug);
  });
  return {
    update(match) {
      let shown = 0;
      content.songs.forEach((s, i) => {
        const on = match(s);
        tiles[i]!.hidden = !on;
        if (on) shown++;
      });
      empty.hidden = shown > 0;
    },
    setPlaying(slug) {
      for (const t of tiles) t.classList.toggle('playing', t.dataset.slug === slug);
    },
  };
}
