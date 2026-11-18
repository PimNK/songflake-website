// The progress line as level bars (CLAUDE.md §4.6): one thin bar per few pixels, as tall as the
// recording is loud there, mirrored round the middle. Bars already played are lit in the hot
// colour with a glow, the rest dim; a hairline marks the playhead. Without levels (not loaded
// yet, or no track) the bars lie flat. Drawing only: the caller passes the state and the light.
import type { Light } from '../domain/backlight';
import { resample } from '../domain/levels';

type Ctx = CanvasRenderingContext2D;

export interface LevelsState {
  /** Playhead, 0–1. */
  at: number;
  /** Loudness along the recording, 0–1 each; empty when unknown. */
  levels: readonly number[];
  /** A track is loaded: the played part and the playhead show. */
  loaded: boolean;
}

const PITCH = 3;
const BAR = 2;
const FLAT = 0.06;

const rgba = (rgb: readonly number[], a: number): string => `rgba(${rgb.join(',')},${a})`;

export function drawLevels(ctx: Ctx, W: number, H: number, s: LevelsState, light: Light): void {
  const { sheen, glow, hot } = light.colours;
  ctx.clearRect(0, 0, W, H);
  const count = Math.max(1, Math.floor(W / PITCH));
  const bars = resample(s.levels, count);
  const mid = H / 2;
  const reach = H / 2 - 1;
  const X = s.loaded ? s.at * W : 0;
  for (let i = 0; i < count; i++) {
    const x = i * PITCH;
    const v = Math.max(FLAT, bars[i] ?? 0);
    const h = Math.max(1, v * reach);
    const played = x + BAR <= X;
    ctx.fillStyle = played ? hot : rgba(sheen, 0.32);
    ctx.shadowColor = played ? rgba(glow, 0.7) : 'transparent';
    ctx.shadowBlur = played ? 5 * light.lum : 0;
    ctx.fillRect(x, mid - h, BAR, h * 2);
  }
  if (s.loaded) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff3dc';
    ctx.fillRect(Math.min(W - 1, Math.round(X)), 0, 1, H);
  }
}
