// Level bars on a canvas (the progress line of the random player and of the card): DPR sizing,
// the loaded track's levels (asked of playback, cached there per song), a frame loop while
// playing so the playhead glides, and a redraw when the backlight changes. Drawing is
// render/levels.ts.
import type { Song } from '../content/parse';
import { drawLevels } from '../render/levels';
import { devicePixelRatioCapped } from '../render/snowflake';
import { light, onLight } from './backlight';
import type { Playback } from './playback';

export interface LevelsInput {
  /** Playhead, 0–1. */
  at(): number;
  playing(): boolean;
  /** The track whose levels are shown; null for none. */
  song(): Song | null;
  /** Whether that track is loaded: the played part and the playhead show. */
  loaded(): boolean;
}

export interface Levels {
  /** Something changed (play, pause, seek, another track): redraw. */
  wake(): void;
  dispose(): void;
}

export function mountLevels(
  canvas: HTMLCanvasElement,
  playback: Playback,
  input: LevelsInput,
): Levels {
  const ctx = canvas.getContext('2d')!;
  let size = { w: 0, h: 0 };
  let raf = 0;
  let shown: Song | null = null;
  let levels: readonly number[] = [];

  /** Asks for a new track's levels; they arrive later and redraw the line. */
  const follow = (song: Song | null): void => {
    if (song === shown) return;
    shown = song;
    levels = [];
    if (!song?.audioSrc) return;
    void playback.levels(song).then((l) => {
      if (shown !== song) return;
      levels = l;
      wake();
    });
  };

  const frame = (): void => {
    raf = 0;
    if (!size.w) return;
    follow(input.song());
    const dpr = canvas.width / size.w;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLevels(ctx, size.w, size.h, { at: input.at(), levels, loaded: input.loaded() }, light());
    if (input.playing()) raf = requestAnimationFrame(frame);
  };
  function wake(): void {
    if (!raf) raf = requestAnimationFrame(frame);
  }
  const resize = new ResizeObserver(([entry]) => {
    const box = entry!.contentRect;
    size = { w: box.width, h: box.height };
    const dpr = devicePixelRatioCapped();
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    wake();
  });
  resize.observe(canvas);
  const off = onLight(wake);
  return {
    wake,
    dispose() {
      cancelAnimationFrame(raf);
      resize.disconnect();
      off();
    },
  };
}
