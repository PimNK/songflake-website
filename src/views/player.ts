// The card's player (CLAUDE.md §4.6), the console's display, wider: the caption (playing /
// paused / press play; on narrow cards playing / paused) and m:ss / m:ss at the top, the
// oscilloscope line with pin markers that seeks (on narrow cards the time follows the line), and
// the note of the active pin under it (pins have no list of their own: a marker shows its text on
// hover and once reached). The note's box holds hidden copies of every pin note, so on narrow
// cards it is as high as the song's longest one; wide cards keep three lines. The round play /
// pause key goes between the card's skip keys.
// The <audio> element lives in views/playback.ts; time maths lives in domain/pins.ts.
import type { Song } from '../content/parse';
import { activePin, formatTime, type Pin } from '../domain/pins';
import { strings } from '../strings';
import { esc, icon } from './html';
import type { Playback } from './playback';
import { NARROW, renderMarkers } from './pin-markers';
import { mountScope, type Scope } from './scope';
import { wireSeek } from './seek';
import type { PlayerSlots } from './track-card';

export interface PlayerHooks {
  /** Development warning, e.g. a pin past the end of the recording. */
  warn(message: string): void;
}

const p = strings.player;
const r = strings.random;

/** The note under the line says what to listen for; the marker's popover has the time. */
const noteHtml = (pin: Pin): string => esc(pin.text);

const template = (song: Song): string => `
  <div class="vfd-top"><span class="pstate"></span><span class="ptime"></span></div>
  <div class="wline">
    <div class="wave-wrap">
      <div class="wave" role="slider" tabindex="0" aria-label="${p.seek}" aria-valuemin="0"><canvas></canvas></div>
      <div class="pins-layer"></div>
    </div>
    <span class="wtime"></span>
  </div>
  <div class="pnote${song.pins.length ? '' : ' none'}">
    ${song.pins.map((pin) => `<span class="ghost" aria-hidden="true">${noteHtml(pin)}</span>`).join('')}
    <span class="now" aria-live="polite"></span>
  </div>`;

/** A card with no recording: the same rows as the player's, so the card keeps its shape. */
export const emptyPlayer = (): string => `
  <div class="vfd-top"><span class="pstate no-audio">${p.noAudio}</span></div>
  <div class="wline"><div class="wave-wrap"><div class="wave off"></div></div></div>
  <div class="pnote none"></div>`;

/** Mounts the player for one song into the card's slot; returns a cleanup function. */
export function mountPlayer(
  slots: PlayerSlots,
  song: Song,
  cue: number | null,
  playback: Playback,
  hooks: PlayerHooks,
): () => void {
  const player = new CardPlayer(slots, song, playback, hooks);
  // A cue moves a track that is not playing; it never jumps one that is.
  if (cue !== null && !playback.isPlaying(song)) playback.seek(song, cue);
  return () => player.dispose();
}

class CardPlayer {
  private slot: HTMLElement;
  private play: HTMLButtonElement;
  private known = 0;
  private raf = 0;
  private alive = true;
  private unsubscribe: () => void;
  private resize: ResizeObserver;
  private scope: Scope;
  /** Last values written to the DOM, so unchanged ones are not rewritten every frame. */
  private shown: Record<string, string> = {};

  constructor(
    slots: PlayerSlots,
    private song: Song,
    private playback: Playback,
    hooks: PlayerHooks,
  ) {
    this.slot = slots.body;
    this.slot.innerHTML = template(song);
    this.play = document.createElement('button');
    this.play.type = 'button';
    this.play.className = 'btn play';
    this.play.innerHTML = icon('play') + icon('pause');
    slots.play.replaceChildren(this.play);
    this.wire();
    this.unsubscribe = playback.subscribe(() => this.update());
    this.scope = mountScope(this.q('canvas'), {
      at: () => this.progress(),
      playing: () => playback.isPlaying(song),
      loaded: () => playback.isCurrent(song),
      volume: () => playback.volume,
    });
    // The markers are laid out by pixel distance: again when the line changes width.
    this.resize = new ResizeObserver(() => this.markers());
    this.resize.observe(this.q('.wave'));
    void playback.duration(song).then((d) => {
      if (!this.alive) return;
      this.known = d;
      warnPastEnd(song, d, hooks);
      this.markers();
      this.update();
    });
    this.update();
  }

  dispose(): void {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.unsubscribe();
    this.resize.disconnect();
    this.scope.dispose();
  }

  private q<T extends HTMLElement>(selector: string): T {
    return this.slot.querySelector<T>(selector)!;
  }

  private duration(): number {
    const live = this.playback.isCurrent(this.song) ? this.playback.audio.duration || 0 : 0;
    return this.known || live;
  }

  private progress(): number {
    const d = this.duration();
    return d ? Math.min(1, this.playback.position(this.song) / d) : 0;
  }

  private markers(): void {
    renderMarkers(this.q('.pins-layer'), this.song.pins, this.duration(), (pin) =>
      this.playback.seek(this.song, pin.at, true),
    );
  }

  private update(): void {
    const t = this.playback.position(this.song);
    const d = this.duration();
    const playing = this.playback.isPlaying(this.song);
    const pin = activePin(this.song.pins, t);
    const current = this.playback.isCurrent(this.song);
    // Narrow cards have no «press play»: the key says it.
    const caption = playing ? r.nowPlaying : current || NARROW.matches ? r.paused : p.ready;
    this.write('.pstate', 'text', caption);
    const time = `${formatTime(t)} / ${d ? formatTime(d) : '–:––'}`;
    this.write('.ptime', 'text', time);
    this.write('.wtime', 'text', time);
    if (this.play.dataset.playing !== String(playing)) {
      this.play.dataset.playing = String(playing);
      this.play.toggleAttribute('data-on', playing);
      this.play.setAttribute('aria-label', playing ? p.pause : p.play);
    }
    this.write('.wave', 'aria-valuemax', String(Math.round(d)));
    this.write('.wave', 'aria-valuenow', String(Math.round(t)));
    this.write('.wave', 'aria-valuetext', `${formatTime(t)} / ${formatTime(d)}`);
    // The note is a live region: rewrite it only when the active pin changes.
    this.write('.pnote .now', 'html', pin ? noteHtml(pin) : '');
    for (const m of this.slot.querySelectorAll<HTMLElement>('.pin')) {
      m.classList.toggle('past', current && Number(m.dataset.at) <= t);
    }
    this.scope.wake();
    // timeupdate is coarse: follow the time and the pins every frame while playing
    if (playing && !this.raf) {
      this.raf = requestAnimationFrame(() => {
        this.raf = 0;
        if (this.alive && this.playback.isPlaying(this.song)) this.update();
      });
    }
  }

  private write(selector: string, what: string, value: string): void {
    const key = `${selector}|${what}`;
    if (this.shown[key] === value) return;
    this.shown[key] = value;
    const el = this.q(selector);
    if (what === 'text') el.textContent = value;
    else if (what === 'html') el.innerHTML = value;
    else el.setAttribute(what, value);
  }

  private wire(): void {
    const { song, playback } = this;
    this.play.addEventListener('click', () => playback.toggle(song));
    wireSeek(
      this.q('.wave'),
      (fraction) => this.duration() && playback.seek(song, fraction * this.duration()),
      (delta) =>
        playback.seek(
          song,
          Math.min(this.duration(), Math.max(0, playback.position(song) + delta)),
        ),
    );
  }
}

function warnPastEnd(song: Song, duration: number, hooks: PlayerHooks): void {
  if (!(duration > 0)) return;
  song.pins
    .filter((pin: Pin) => pin.at > duration)
    .forEach((pin) => hooks.warn(p.pastEnd(song.slug, formatTime(pin.at))));
}
