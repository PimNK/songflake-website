// The random-track player in the page's controls (CLAUDE.md §4.6): previous · play / pause ·
// next, the playing track's snowflake (it opens the card), a caption that says it plays a random
// track (then the title of what is playing, which opens its card too; a caption or title too
// long for its line runs as a ticker) and a progress line with the time; the line seeks (click,
// drag, keys).
// Picks come from domain/shuffle.ts.
import type { Song } from '../content/parse';
import type { Taxonomy } from '../content/taxonomy';
import { formatTime } from '../domain/pins';
import { ShuffleHistory } from '../domain/shuffle';
import { flakeOf } from '../domain/snowflake';
import { paintSnowflake } from '../render/snowflake';
import { strings } from '../strings';
import { esc, SKIP_ICON, turnStyle } from './html';
import type { Playback } from './playback';
import { wireSeek } from './seek';

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
    <span class="rp-bar" role="slider" aria-label="${p.seek}" aria-valuemin="0"><i></i><b></b></span>
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
  setRun(q('.rp-cap'), song ? (playing ? r.nowPlaying : r.paused) : r.idle);
  const title = q('.rp-title');
  title.hidden = !song;
  // Nothing loaded: forget the title, so the next one is fitted afresh.
  if (!song) delete title.dataset.text;
  if (song && title.dataset.text !== song.title) {
    title.setAttribute('aria-label', r.openCard(song.title));
    setRun(title, song.title);
  }
  const d = playback.audio.duration || 0;
  const t = song ? playback.audio.currentTime : 0;
  const time = song ? `${formatTime(t)} / ${d ? formatTime(d) : '–:––'}` : '';
  const bar = q('.rp-bar');
  moveLine(el, playback);
  // Nothing loaded: the line is not a control yet.
  bar.tabIndex = song ? 0 : -1;
  bar.setAttribute('aria-disabled', String(!song));
  bar.setAttribute('aria-valuemax', String(Math.round(d)));
  bar.setAttribute('aria-valuenow', String(Math.round(t)));
  bar.setAttribute('aria-valuetext', time);
  q('.rp-time').textContent = time;
}

/** Ticker speed of a line too long for its width, in px per second. */
const RUN_SPEED = 40;

/** Puts new text on a ticker line (the caption or the title); unchanged text is left running. */
function setRun(line: HTMLElement, text: string): void {
  if (line.dataset.text === text) return;
  line.dataset.text = text;
  fitRun(line);
}

/**
 * Sets the line's text; when it does not fit, it runs as a ticker (a second, hidden copy closes
 * the loop). Called again when the line changes width.
 */
function fitRun(line: HTMLElement): void {
  const text = esc(line.dataset.text ?? '');
  line.innerHTML = `<span class="rp-run"><span>${text}</span></span>`;
  const run = line.firstElementChild as HTMLElement;
  const over = run.offsetWidth > line.clientWidth + 1;
  line.classList.toggle('run', over);
  if (!over) return;
  run.insertAdjacentHTML('beforeend', `<span aria-hidden="true">${text}</span>`);
  run.style.setProperty('--run', `${(run.offsetWidth / 2 / RUN_SPEED).toFixed(1)}s`);
}

/** Re-fits a ticker line when it changes width. */
function refitOnResize(line: HTMLElement): void {
  let width = 0;
  new ResizeObserver(([entry]) => {
    const w = Math.round(entry!.contentRect.width);
    if (w !== width && (width = w) && line.dataset.text) fitRun(line);
  }).observe(line);
}

/** The played part and the thumb only: cheap enough for every animation frame. */
function moveLine(el: HTMLElement, playback: Playback): void {
  const d = playback.audio.duration || 0;
  const t = playback.song ? playback.audio.currentTime : 0;
  el.querySelector<HTMLElement>('.rp-bar')!.style.setProperty('--at', `${d ? (t / d) * 100 : 0}%`);
}

/** The line seeks the loaded track: click or drag, ← / →, Home / End. */
function wireLine(el: HTMLElement, playback: Playback): void {
  const duration = (): number => playback.audio.duration || 0;
  wireSeek(
    el.querySelector<HTMLElement>('.rp-bar')!,
    (fraction) => {
      if (playback.song && duration()) playback.seek(playback.song, fraction * duration());
    },
    (delta) => {
      const song = playback.song;
      if (song)
        playback.seek(song, Math.min(duration(), Math.max(0, playback.position(song) + delta)));
    },
  );
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
  const flake = el.querySelector<HTMLElement>('.rp-flake')!;
  for (const b of [flake, el.querySelector('.rp-title')!]) {
    b.addEventListener('click', () => playback.song && h.open(playback.song.slug));
  }
  wireLine(el, playback);
  for (const line of el.querySelectorAll<HTMLElement>('.rp-cap, .rp-title')) refitOnResize(line);
  let painted: Song | null | undefined;
  let raf = 0;
  const update = (): void => {
    // A track started from a card joins the history, so ⏮ can return to it.
    if (playback.song && playback.isPlaying()) history.push(playback.song.slug);
    if (playback.song !== painted) paintFlake(flake, (painted = playback.song), taxonomy);
    render(el, playback, h.pool().length > 0);
    if (playback.isPlaying() && !raf) raf = requestAnimationFrame(glide);
  };
  // timeupdate is coarse: between its events only the line moves, every frame while playing;
  // the time text and the slider's values follow timeupdate.
  const glide = (): void => {
    moveLine(el, playback);
    raf = playback.isPlaying() ? requestAnimationFrame(glide) : 0;
  };
  playback.subscribe(update);
  update();

  return { next: forward };
}
