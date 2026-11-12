// The random-track player in the page's controls (CLAUDE.md §4.6), a console with a display:
// the caption (it plays a random track; then now playing / paused) and the time, the title of
// what is playing (it opens its card; a caption or title too long for its line runs as a ticker),
// the playing track's snowflake in the display's phosphor (it opens the card too), and the
// progress line as an oscilloscope trace that seeks (click, drag, keys). Under the display:
// previous · play / pause · next and, on wide screens, the volume fader.
// Picks come from domain/shuffle.ts (a shuffle bag).
import type { Song } from '../content/parse';
import type { Taxonomy } from '../content/taxonomy';
import { formatTime } from '../domain/pins';
import { ShuffleHistory } from '../domain/shuffle';
import { flakeOf } from '../domain/snowflake';
import { paintSnowflake } from '../render/snowflake';
import { strings } from '../strings';
import { light, onLight } from './backlight';
import { icon, turnStyle } from './html';
import type { Playback } from './playback';
import { mountScope, type Scope } from './scope';
import { wireSeek } from './seek';
import { refitOnResize, setRun } from './ticker';
import { volumeFader } from './volume';

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
  <div class="rp-vfd">
    <div class="vfd rp-scr">
      <div class="vfd-top"><small class="rp-cap"></small><small class="rp-time"></small></div>
      <button type="button" class="rp-title" disabled></button>
      <button type="button" class="rp-flake" tabindex="-1" aria-hidden="true"><canvas class="turn"></canvas></button>
    </div>
    <div class="vfd rp-line">
      <span class="pline rp-bar" role="slider" aria-label="${p.seek}" aria-valuemin="0"><canvas></canvas></span>
    </div>
  </div>
  <div class="rp-keys">
    <button type="button" class="btn k" data-go="back" aria-label="${r.prev}">${icon('prev')}</button>
    <button type="button" class="btn play rp-play">${icon('play')}${icon('pause')}</button>
    <button type="button" class="btn k" data-go="next" aria-label="${r.next}">${icon('next')}</button>
  </div>`;

/** Radius of the player's snowflake; the canvas is scaled to its slot by CSS. */
const FLAKE_RADIUS = 19;

const fraction = (playback: Playback): number => {
  const d = playback.audio.duration || 0;
  return playback.song && d ? playback.audio.currentTime / d : 0;
};

/** Shows what the player is doing: the key, the caption, the title, the time and the slider. */
function render(el: HTMLElement, playback: Playback, canStart: boolean): void {
  const q = <T extends HTMLElement>(s: string): T => el.querySelector<T>(s)!;
  const song = playback.song;
  const playing = playback.isPlaying();
  const play = q<HTMLButtonElement>('.rp-play');
  play.toggleAttribute('data-on', playing);
  play.setAttribute('aria-label', playing ? p.pause : song ? p.play : r.play);
  play.disabled = !song && !canStart;
  setRun(q('.rp-cap'), song ? (playing ? r.nowPlaying : r.paused) : r.idle);
  const title = q<HTMLButtonElement>('.rp-title');
  title.disabled = !song;
  // Nothing loaded: an empty display line, and the next title is fitted afresh.
  if (!song && title.dataset.text !== undefined) {
    delete title.dataset.text;
    title.replaceChildren();
    title.removeAttribute('aria-label');
  }
  if (song && title.dataset.text !== song.title) {
    title.setAttribute('aria-label', r.openCard(song.title));
    setRun(title, song.title);
  }
  const d = playback.audio.duration || 0;
  const t = song ? playback.audio.currentTime : 0;
  const time = song ? `${formatTime(t)} / ${d ? formatTime(d) : '–:––'}` : '';
  const bar = q('.rp-bar');
  // Nothing loaded: the line is not a control yet.
  bar.tabIndex = song ? 0 : -1;
  bar.setAttribute('aria-disabled', String(!song));
  bar.setAttribute('aria-valuemax', String(Math.round(d)));
  bar.setAttribute('aria-valuenow', String(Math.round(t)));
  bar.setAttribute('aria-valuetext', time);
  q('.rp-time').textContent = time;
}

/** The line seeks the loaded track: click or drag, ← / →, Home / End. */
function wireLine(el: HTMLElement, playback: Playback): void {
  const duration = (): number => playback.audio.duration || 0;
  wireSeek(
    el.querySelector<HTMLElement>('.rp-bar')!,
    (f) => {
      if (playback.song && duration()) playback.seek(playback.song, f * duration());
    },
    (delta) => {
      const song = playback.song;
      if (song)
        playback.seek(song, Math.min(duration(), Math.max(0, playback.position(song) + delta)));
    },
  );
}

/** Paints the playing track's snowflake in the display's phosphor; the slot keeps its size. */
function paintFlake(button: HTMLElement, song: Song | null, taxonomy: Taxonomy): void {
  button.classList.toggle('empty', !song);
  if (!song) return;
  const canvas = button.querySelector('canvas')!;
  const { params } = flakeOf(song, taxonomy);
  const { amber, hot, sheen } = light().colours;
  paintSnowflake(canvas, params, [amber], FLAKE_RADIUS, {
    core: hot,
    ring: `rgba(${sheen.join(',')},.55)`,
    glow: 1.6,
    width: 1.5,
  });
  canvas.style.cssText += turnStyle(song);
}

/** ▶ / ❚❚ plays a random track, or toggles the loaded one; ⏭ and ⏮ go forward and back. */
function wireKeys(el: HTMLElement, playback: Playback, next: () => void, back: () => void): void {
  el.querySelector('.rp-play')!.addEventListener('click', () => {
    // Resuming here makes the run a random one, whoever started the track.
    if (!playback.song) return next();
    playback.mode = 'shuffle';
    playback.toggle(playback.song);
  });
  el.querySelector('[data-go="next"]')!.addEventListener('click', next);
  el.querySelector('[data-go="back"]')!.addEventListener('click', back);
}

/** The progress line's oscilloscope trace. */
const lineScope = (el: HTMLElement, playback: Playback): Scope =>
  mountScope(el.querySelector<HTMLCanvasElement>('.rp-bar canvas')!, {
    at: () => fraction(playback),
    playing: () => playback.isPlaying(),
    loaded: () => playback.song !== null,
    volume: () => playback.volume,
  });

export function mountRandomPlayer(
  el: HTMLElement,
  playback: Playback,
  taxonomy: Taxonomy,
  h: RandomPlayerHooks,
): RandomPlayer {
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', r.label);
  el.innerHTML = TEMPLATE;
  el.querySelector('.rp-keys')!.append(volumeFader(playback));
  const history = new ShuffleHistory();
  const start = (song: Song | null | undefined): void => {
    if (song) playback.playFromStart(song, 'shuffle');
  };
  const forward = (): Song | null => {
    const slug = history.next(h.pool(), Math.random);
    return slug ? (h.song(slug) ?? null) : null;
  };

  wireKeys(
    el,
    playback,
    () => start(forward()),
    () => {
      const slug = history.back();
      if (slug) start(h.song(slug));
      else if (playback.song) playback.seek(playback.song, 0, playback.isPlaying());
    },
  );
  const flake = el.querySelector<HTMLElement>('.rp-flake')!;
  for (const b of [flake, el.querySelector('.rp-title')!]) {
    b.addEventListener('click', () => playback.song && h.open(playback.song.slug));
  }
  wireLine(el, playback);
  for (const line of el.querySelectorAll<HTMLElement>('.rp-cap, .rp-title')) refitOnResize(line);
  const scope = lineScope(el, playback);
  let painted: Song | null | undefined;
  onLight(() => paintFlake(flake, playback.song, taxonomy));
  const update = (): void => {
    // A track started from a card joins the history (and the bag), so ⏮ can return to it.
    if (playback.song && playback.isPlaying()) history.push(playback.song.slug);
    if (playback.song !== painted) paintFlake(flake, (painted = playback.song), taxonomy);
    render(el, playback, h.pool().length > 0);
    scope.wake();
  };
  playback.subscribe(update);
  update();

  return { next: forward };
}
