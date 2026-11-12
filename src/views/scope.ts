// An oscilloscope trace on a canvas (the progress line of the random player and of the card):
// DPR sizing, an animation loop that runs while the trace moves (playing, or easing to rest),
// and a redraw when the backlight changes. Drawing is render/scope.ts.
import { devicePixelRatioCapped } from '../render/snowflake';
import { atRest, easeAmp, scopeTarget } from '../domain/scope';
import { drawScope } from '../render/scope';
import { light, onLight } from './backlight';

export interface ScopeInput {
  /** Playhead, 0–1. */
  at(): number;
  playing(): boolean;
  loaded(): boolean;
  volume(): number;
}

export interface Scope {
  /** Something changed (play, pause, seek): redraw, and keep moving while it should. */
  wake(): void;
  dispose(): void;
}

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

export function mountScope(canvas: HTMLCanvasElement, input: ScopeInput): Scope {
  const ctx = canvas.getContext('2d')!;
  let size = { w: 0, h: 0 };
  let amp = 0;
  let raf = 0;
  const frame = (now: number): void => {
    raf = 0;
    if (!size.w) return;
    const target = scopeTarget(input.playing(), input.loaded());
    amp = REDUCED.matches ? target : easeAmp(amp, target);
    const dpr = canvas.width / size.w;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScope(
      ctx,
      size.w,
      size.h,
      {
        at: input.at(),
        amp,
        volume: input.volume(),
        time: REDUCED.matches ? 0 : now / 1000,
        loaded: input.loaded(),
      },
      light(),
    );
    // Keep moving while playing (a live trace) or while the swing still eases to rest.
    const moving = (input.playing() && !REDUCED.matches) || !atRest(amp, target);
    if (moving) raf = requestAnimationFrame(frame);
  };
  const wake = (): void => {
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const resize = new ResizeObserver(([entry]) => {
    const box = entry!.contentRect;
    size = { w: box.width, h: box.height };
    const dpr = devicePixelRatioCapped();
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    wake();
  });
  resize.observe(canvas.parentElement!);
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
