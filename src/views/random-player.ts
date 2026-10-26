// The random-track player in the page's controls (CLAUDE.md §4.6): previous · play / pause ·
// next, a caption that says it plays a random track (then the title of what is playing, which
// opens its card) and a thin progress line. Picks come from domain/shuffle.ts.
import type { Song } from '../content/parse';
import { ShuffleHistory } from '../domain/shuffle';
import { strings } from '../strings';
import { esc, SKIP_ICON } from './html';
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
  <div class="rp-text">
    <small class="rp-cap"></small>
    <button type="button" class="rp-title" hidden></button>
  </div>
  <div class="rp-line" aria-hidden="true"><i></i></div>`;

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
  const done = song && d ? playback.audio.currentTime / d : 0;
  q('.rp-line i').style.width = `${done * 100}%`;
}

export function mountRandomPlayer(
  el: HTMLElement,
  playback: Playback,
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
  el.querySelector('.rp-title')!.addEventListener(
    'click',
    () => playback.song && h.open(playback.song.slug),
  );
  const update = (): void => {
    // A track started from a card joins the history, so ⏮ can return to it.
    if (playback.song && playback.isPlaying()) history.push(playback.song.slug);
    render(el, playback, h.pool().length > 0);
  };
  playback.subscribe(update);
  update();

  return { next: forward };
}
