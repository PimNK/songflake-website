// The random-track player in the page's controls (CLAUDE.md §4.6): previous · play / pause ·
// next, the playing track's snowflake (it opens the card), a caption that says it plays a random
// track (then the title of what is playing, which opens its card too) and a thin progress line
// with the time. Picks come from domain/shuffle.ts.
import type { Song } from '../content/parse';
import type { Taxonomy } from '../content/taxonomy';
import { formatTime } from '../domain/pins';
import { ShuffleHistory } from '../domain/shuffle';
import { flakeOf } from '../domain/snowflake';
import { paintSnowflake } from '../render/snowflake';
import { strings } from '../strings';
import { esc, SKIP_ICON, turnStyle } from './html';
import type { Playback } from './playback';

export interface RandomPlayerHooks {
  /** Slugs the random player may pick now: playable and matching the filters. */
  pool(): string[];
  song(slug: string): Song | undefined;
  open(slug: string): void;
}

export interface RandomPlayer {
  /** Moves on to the next random track (auto-advance of a random run); null when none. */
  next(): Song | null;
}

const p = strings.player;
const r = strings.random;

const TEMPLATE = `
  <div class="rp-keys">
    <button type="button" class="nav" data-go="back" aria-label="${r.prev}">${SKIP_ICON}</button>
    <button type="button" class="play rp-play"></button>
    <button type="button" class="nav next" data-go="next" aria-label="${r.next}">${SKIP_ICON}</button>
  </div>
  <button type="button" class="rp-flake" tabindex="-1" aria-hidden="true"><canvas class="turn"></canvas></button>
  <div class="rp-text">
    <small class="rp-cap"></small>
    <button type="button" class="rp-title" hidden></button>
  </div>
  <div class="rp-line">
    <span class="rp-bar" aria-hidden="true"><i></i></span>
    <small class="rp-time"></small>
  </div>`;

/** Radius of the player's snowflake; the canvas is scaled down to its slot by CSS. */
const FLAKE_RADIUS = 24;

/** Shows what the player is doing: the glyph, the caption, the title and the progress line. */
function render(el: HTMLElement, playback: Playback, canStart: boolean): void {
  const q = <T extends HTMLElement>(s: string): T => el.querySelector<T>(s)!;
  const song = playback.song;
  const playing = playback.isPlaying();
  const play = q<HTMLButtonElement>('.rp-play');
  play.textContent = playing ? p.pauseGlyph : p.playGlyph;
  play.setAttribute('aria-label', playing ? p.pause : song ? p.play : r.play);
  play.disabled = !song && !canStart;
  q('.rp-cap').textContent = song ? (playing ? r.nowPlaying : r.paused) : r.idle;
  const title = q('.rp-title');
  title.hidden = !song;
  if (song) {
    title.innerHTML = esc(song.title);
    title.setAttribute('aria-label', r.openCard(song.title));
  }
  const d = playback.audio.duration || 0;
  const t = song ? playback.audio.currentTime : 0;
  q('.rp-bar i').style.width = `${d ? (t / d) * 100 : 0}%`;
  q('.rp-time').textContent = song ? `${formatTime(t)} / ${d ? formatTime(d) : '–:––'}` : '';
}

/** Paints the playing track's snowflake into the player's slot; the slot keeps its size. */
function paintFlake(button: HTMLElement, song: Song | null, taxonomy: Taxonomy): void {
  button.classList.toggle('empty', !song);
  if (!song) return;
  const canvas = button.querySelector('canvas')!;
  const flake = flakeOf(song, taxonomy);
  paintSnowflake(canvas, flake.params, flake.colours, FLAKE_RADIUS);
  canvas.style.cssText += turnStyle(song);
}

export function mountRandomPlayer(
  el: HTMLElement,
  playback: Playback,
  taxonomy: Taxonomy,
  h: RandomPlayerHooks,
): RandomPlayer {
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', r.label);
  el.innerHTML = TEMPLATE;
  const history = new ShuffleHistory();
  const start = (song: Song | null | undefined): void => {
    if (song) playback.play(song, 'shuffle');
  };
  const forward = (): Song | null => {
    const slug = history.next(h.pool(), Math.random);
    return slug ? (h.song(slug) ?? null) : null;
  };

  el.querySelector('.rp-play')!.addEventListener('click', () => {
    // Resuming here makes the run a random one, whoever started the track.
    if (playback.song) playback.mode = 'shuffle';
    if (playback.song) playback.toggle(playback.song);
    else start(forward());
  });
  el.querySelector('[data-go="next"]')!.addEventListener('click', () => start(forward()));
  el.querySelector('[data-go="back"]')!.addEventListener('click', () => {
    const slug = history.back();
    if (slug) start(h.song(slug));
    else if (playback.song) playback.seek(playback.song, 0, playback.isPlaying());
  });
  const openCard = (): void => {
    if (playback.song) h.open(playback.song.slug);
  };
  el.querySelector('.rp-title')!.addEventListener('click', openCard);
  const flake = el.querySelector<HTMLElement>('.rp-flake')!;
  flake.addEventListener('click', openCard);
  let painted: Song | null | undefined;
  const update = (): void => {
    // A track started from a card joins the history, so ⏮ can return to it.
    if (playback.song && playback.isPlaying()) history.push(playback.song.slug);
    if (playback.song !== painted) paintFlake(flake, (painted = playback.song), taxonomy);
    render(el, playback, h.pool().length > 0);
  };
  playback.subscribe(update);
  update();

  return { next: forward };
}
