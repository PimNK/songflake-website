// The card's player (CLAUDE.md §4.6): round play/pause in the lead colour, m:ss / m:ss,
// the waveform seek bar with pin markers, the active-pin note and the pin list.
// The <audio> element lives in views/playback.ts; time maths lives in domain/pins.ts.
import type { Song } from '../content/parse';
import { activePin, formatTime, type Pin } from '../domain/pins';
import { barCount, resample } from '../domain/waveform';
import { devicePixelRatioCapped } from '../render/snowflake';
import { strings } from '../strings';
import { esc } from './html';
import type { Playback, Recording } from './playback';
import { renderMarkers } from './pin-markers';

export interface PlayerHooks {
  /** Shareable URL of the card cued at a moment. */
  linkFor(slug: string, seconds: number): string;
  /** Development warning, e.g. a pin past the end of the recording. */
  warn(message: string): void;
}

const p = strings.player;
const SEEK_STEP = 5;
const PLAYED_REST = 'rgba(232,238,255,.22)';

function template(song: Song, colour: string): string {
  const list = song.pins
    .map(
      (
        pin,
        i,
      ) => `<li><button type="button" class="pin-seek" data-i="${i}"><b>${formatTime(pin.at)}</b><span>${esc(pin.text)}</span></button>
        <button type="button" class="pin-copy btn" data-i="${i}">${p.copyLink}</button></li>`,
    )
    .join('');
  return `
    <div class="player">
      <button class="play" type="button" style="background:${esc(colour)}"></button>
      <div class="pmain">
        <div class="ptop"><span><b data-now>0:00</b> / <span data-dur>–:––</span></span></div>
        <div class="wave-wrap">
          <div class="wave" role="slider" tabindex="0" aria-label="${p.seek}" aria-valuemin="0"><canvas></canvas></div>
          <div class="pins-layer"></div>
        </div>
        <div class="pnote" aria-live="polite"></div>
      </div>
    </div>
    ${song.pins.length ? `<ol class="pins" aria-label="${p.pins}">${list}</ol>` : ''}`;
}

/** Mounts the player for one song into the card's slot; returns a cleanup function. */
export function mountPlayer(
  slot: HTMLElement,
  song: Song,
  cue: number | null,
  colour: string,
  playback: Playback,
  hooks: PlayerHooks,
): () => void {
  const player = new CardPlayer(slot, song, colour, playback, hooks);
  // A cue moves a track that is not playing; it never jumps one that is.
  if (cue !== null && !playback.isPlaying(song)) playback.seek(song, cue);
  return () => player.dispose();
}

class CardPlayer {
  private rec: Recording | null = null;
  private raf = 0;
  private alive = true;
  private unsubscribe: () => void;
  private resize: ResizeObserver;
  /** Wave size in CSS px, from the ResizeObserver (no layout reads per frame). */
  private size = { width: 0, height: 0 };
  /** Last values written to the DOM, so unchanged ones are not rewritten every frame. */
  private shown: Record<string, string> = {};

  constructor(
    private slot: HTMLElement,
    private song: Song,
    private colour: string,
    private playback: Playback,
    private hooks: PlayerHooks,
  ) {
    slot.innerHTML = template(song, colour);
    this.wire();
    this.unsubscribe = playback.subscribe(() => this.update());
    this.resize = new ResizeObserver(([entry]) => {
      const box = entry!.contentRect;
      this.size = { width: box.width, height: box.height };
      sizeCanvas(this.q('canvas'), this.size);
      this.draw();
      this.markers();
    });
    this.resize.observe(this.q('.wave'));
    void playback.recording(song).then((r) => {
      if (!this.alive) return;
      this.rec = r;
      warnPastEnd(song, r.duration, hooks);
      this.hidePastEnd(r.duration);
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
  }

  private q<T extends HTMLElement>(selector: string): T {
    return this.slot.querySelector<T>(selector)!;
  }

  private duration(): number {
    const live = this.playback.isCurrent(this.song) ? this.playback.audio.duration || 0 : 0;
    return this.rec?.duration || live;
  }

  private draw(): void {
    const d = this.duration();
    const progress = d ? this.playback.position(this.song) / d : 0;
    drawWave(this.q('canvas'), this.size, this.rec, progress, this.colour);
  }

  private markers(): void {
    renderMarkers(this.q('.pins-layer'), this.song.pins, this.duration(), (pin) =>
      this.playback.seek(this.song, pin.at, true),
    );
  }

  /** A pin past the end of the recording is skipped (and warned about in development). */
  private hidePastEnd(duration: number): void {
    if (!(duration > 0)) return;
    this.slot.querySelectorAll<HTMLElement>('.pins li').forEach((li, i) => {
      li.hidden = this.song.pins[i]!.at > duration;
    });
  }

  private update(): void {
    const t = this.playback.position(this.song);
    const d = this.duration();
    const playing = this.playback.isPlaying(this.song);
    const pin = activePin(this.song.pins, t);
    this.write('[data-now]', 'text', formatTime(t));
    if (d) this.write('[data-dur]', 'text', formatTime(d));
    this.write('.play', 'text', playing ? '❚❚' : '▶');
    this.write('.play', 'aria-label', playing ? p.pause : p.play);
    this.write('.wave', 'aria-valuemax', String(Math.round(d)));
    this.write('.wave', 'aria-valuenow', String(Math.round(t)));
    this.write('.wave', 'aria-valuetext', `${formatTime(t)} / ${formatTime(d)}`);
    // The note is a live region: rewrite it only when the active pin changes.
    this.write('.pnote', 'html', pin ? `<b>${formatTime(pin.at)}</b>${esc(pin.text)}` : '');
    this.draw();
    // timeupdate is coarse: animate the bar smoothly while playing
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
    this.q('.play').addEventListener('click', () => playback.toggle(song));
    wireSeek(
      this.q('.wave'),
      (fraction) => this.duration() && playback.seek(song, fraction * this.duration()),
      (delta) =>
        playback.seek(
          song,
          Math.min(this.duration(), Math.max(0, playback.position(song) + delta)),
        ),
    );
    this.slot
      .querySelectorAll<HTMLButtonElement>('.pin-seek')
      .forEach((b) =>
        b.addEventListener('click', () => playback.seek(song, song.pins[+b.dataset.i!]!.at, true)),
      );
    this.slot
      .querySelectorAll<HTMLButtonElement>('.pin-copy')
      .forEach((b) =>
        b.addEventListener('click', () =>
          copyLink(b, this.hooks.linkFor(song.slug, song.pins[+b.dataset.i!]!.at)),
        ),
      );
  }
}

function wireSeek(
  wave: HTMLElement,
  toFraction: (f: number) => void,
  by: (delta: number) => void,
): void {
  const at = (e: PointerEvent): void => {
    const r = wave.getBoundingClientRect();
    toFraction(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  };
  wave.addEventListener('pointerdown', (e) => {
    wave.setPointerCapture(e.pointerId);
    at(e);
  });
  wave.addEventListener('pointermove', (e) => {
    if (wave.hasPointerCapture(e.pointerId)) at(e);
  });
  wave.addEventListener('keydown', (e) => {
    const step: Record<string, number> = {
      ArrowRight: SEEK_STEP,
      ArrowLeft: -SEEK_STEP,
      Home: -Infinity,
      End: Infinity,
    };
    if (e.target !== wave || !(e.key in step)) return;
    e.preventDefault();
    by(step[e.key]!);
  });
}

type Size = { width: number; height: number };

/** Allocates the canvas backing store; only on resize. */
function sizeCanvas(canvas: HTMLCanvasElement, box: Size): void {
  const dpr = devicePixelRatioCapped();
  canvas.width = Math.round(box.width * dpr);
  canvas.height = Math.round(box.height * dpr);
}

function drawWave(
  canvas: HTMLCanvasElement,
  box: Size,
  rec: Recording | null,
  progress: number,
  colour: string,
): void {
  if (!box.width) return;
  const dpr = canvas.width / box.width;
  const g = canvas.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, box.width, box.height);
  if (!rec?.peaks) {
    // Plain progress bar when the waveform could not be decoded.
    const y = box.height / 2 - 2;
    g.fillStyle = PLAYED_REST;
    g.fillRect(0, y, box.width, 4);
    g.fillStyle = colour;
    g.fillRect(0, y, box.width * progress, 4);
    return;
  }
  const bars = resample(rec.peaks, barCount(box.width));
  const bw = box.width / bars.length;
  bars.forEach((v, i) => {
    const h = Math.max(2, v * box.height * 0.95);
    g.fillStyle = (i + 0.5) / bars.length <= progress ? colour : PLAYED_REST;
    g.fillRect(i * bw + 0.5, (box.height - h) / 2, Math.max(1, bw - 1.5), h);
  });
}

function warnPastEnd(song: Song, duration: number, hooks: PlayerHooks): void {
  if (!(duration > 0)) return;
  song.pins
    .filter((pin: Pin) => pin.at > duration)
    .forEach((pin) => hooks.warn(p.pastEnd(song.slug, formatTime(pin.at))));
}

function copyLink(button: HTMLButtonElement, url: string): void {
  void navigator.clipboard?.writeText(url).then(() => {
    button.textContent = p.copied;
    setTimeout(() => (button.textContent = p.copyLink), 1600);
  });
}
