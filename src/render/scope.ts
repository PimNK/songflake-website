// The progress line as an oscilloscope trace (CLAUDE.md §4.6): a graticule, a trace that is alive
// up to the playhead and flat after it, and a bright dot at the playhead. The swing follows the
// volume. Drawing only: the caller passes the state and the light.
import type { Light } from '../domain/backlight';

type Ctx = CanvasRenderingContext2D;

export interface ScopeState {
  /** Playhead, 0–1. */
  at: number;
  /** How alive the trace is, 0–1: eased towards 1 while playing, ~0.28 paused, 0 unloaded. */
  amp: number;
  /** Playback volume, 0–1. */
  volume: number;
  /** Seconds, for the trace's motion (0 under reduced motion). */
  time: number;
  /** A track is loaded: the playhead dot shows. */
  loaded: boolean;
}

const rgba = (rgb: readonly number[], a: number): string => `rgba(${rgb.join(',')},${a})`;

export function drawScope(ctx: Ctx, W: number, H: number, s: ScopeState, light: Light): void {
  const { sheen, glow } = light.colours;
  const mid = H / 2 + 1;
  ctx.clearRect(0, 0, W, H);
  // the graticule: dotted columns and a tick scale along the middle
  ctx.fillStyle = rgba(sheen, 0.16);
  for (let x = 0; x <= W; x += W / 20)
    for (let y = 3; y < H; y += 8) ctx.fillRect(Math.round(x), y, 1, 1);
  for (let x = 0; x <= W; x += W / 100) ctx.fillRect(Math.round(x), mid - 1, 1, 3);
  const X = s.at * W;
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(sheen, 0.38);
  ctx.beginPath();
  ctx.moveTo(X, mid);
  ctx.lineTo(W, mid);
  ctx.stroke();
  ctx.save();
  ctx.shadowColor = rgba(glow, 0.95);
  ctx.shadowBlur = 7 * light.lum;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = light.colours.hot;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const t = s.time;
  const swing = s.amp * (0.2 + 0.8 * s.volume) * H * 0.4;
  let y = mid;
  for (let x = 0; x <= X; x += 1.5) {
    const env = Math.min(1, x / 14) * (0.55 + 0.45 * Math.sin(x * 0.021 - t * 1.1));
    y =
      mid + swing * env * (Math.sin(x * 0.19 + t * 7) * 0.6 + Math.sin(x * 0.077 - t * 3.2) * 0.4);
    if (x) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  if (s.loaded) {
    ctx.beginPath();
    ctx.arc(X, X > 1 ? y : mid, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff3dc';
    ctx.shadowBlur = 12;
    ctx.fill();
  }
  ctx.restore();
}
