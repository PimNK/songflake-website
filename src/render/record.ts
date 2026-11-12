// Draws the vinyl record (CLAUDE.md §5.3). No layout maths — positions and transforms come from
// domain/record-layout.ts via the caller. The disc has no edge: it is a darker patch of the night
// sky, with stars that turn with it, a lamp under the label and grooves lit by the backlight that
// thin out into the dark. Colours come from the backlight (domain/backlight.ts).
import type { Light } from '../domain/backlight';
import { R_LABEL, yearRadius, type Transform, type YearRange } from '../domain/record-layout';
import { rng } from '../domain/seed';

type Ctx = CanvasRenderingContext2D;

export const MONO = '"Martian Mono", ui-monospace, monospace';
export const DISPLAY = 'Geologica, system-ui, sans-serif';

/** The body fades out by this radius (world units). */
const R_BODY = 1180;
/** The grooves: from just outside the label to past the last year, thinning out from R_FADE. */
const GROOVE_IN = 214;
const GROOVE_OUT = 1150;
const GROOVE_STEP = 7.6;
const R_FADE = 880;
/** The cream of the grooves where the backlight does not reach them. */
const DIM = '255,236,210';
/** The cold window's light on the far side. */
const WINDOW = '150,190,255';

const rgba = (rgb: readonly number[] | string, a: number): string =>
  `rgba(${typeof rgb === 'string' ? rgb : rgb.join(',')},${a})`;

interface Star {
  x: number;
  y: number;
  /** Magnitude 0–1. */
  m: number;
  /** Twinkle phase. */
  tw: number;
  warm: boolean;
}

/** The sky: seeded dust round the record, in world units; it turns with the disc. */
const STARS: Star[] = (() => {
  const rand = rng(0.2026);
  return Array.from({ length: 620 }, () => {
    const r = 240 + Math.sqrt(rand()) * 2300;
    const a = rand() * Math.PI * 2;
    return {
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      m: rand(),
      tw: rand() * Math.PI * 2,
      warm: rand() < 0.3,
    };
  });
})();

function disc(ctx: Ctx, t: Transform, r: number): void {
  ctx.beginPath();
  ctx.arc(t.cx, t.cy, r * t.scale, 0, Math.PI * 2);
}

/** Stars inside the stage, turned with the disc; they twinkle with `time` (s). */
function drawStars(ctx: Ctx, t: Transform, width: number, height: number, time: number): void {
  const s = t.scale;
  for (const st of STARS) {
    const x = t.cx + (st.x * t.cos - st.y * t.sin) * s;
    const y = t.cy + (st.x * t.sin + st.y * t.cos) * s;
    if (x < 0 || y < 0 || x > width || y > height) continue;
    const a = (0.1 + 0.5 * st.m * st.m) * (0.75 + 0.25 * Math.sin(time * 0.7 + st.tw));
    ctx.fillStyle = st.warm ? `rgba(255,214,160,${a})` : `rgba(206,224,255,${a})`;
    const z = st.m > 0.9 ? 1.7 : 1.1;
    ctx.fillRect(x - z / 2, y - z / 2, z, z);
  }
}

/** Grooves lit warm from the console's side and cold from the window; fixed, they do not turn. */
function drawGrooves(ctx: Ctx, t: Transform, light: Light): void {
  const sheen = ctx.createConicGradient(Math.PI - 0.55, t.cx, t.cy);
  const lit = Math.min(0.7, 0.04 + 0.32 * light.lum);
  for (const [o, rgb, a] of [
    [0, DIM, 0.032],
    [0.085, light.colours.sheen, lit],
    [0.17, DIM, 0.032],
    [0.52, DIM, 0.032],
    [0.6, WINDOW, 0.2],
    [0.68, DIM, 0.032],
    [1, DIM, 0.032],
  ] as const) {
    sheen.addColorStop(o, rgba(rgb, a));
  }
  ctx.strokeStyle = sheen;
  ctx.lineWidth = 1;
  for (let r = GROOVE_IN, i = 0; r <= GROOVE_OUT; r += GROOVE_STEP, i++) {
    const fade =
      r < R_FADE ? 1 : Math.max(0, 1 - (r - R_FADE) / (GROOVE_OUT - R_FADE + 0.1)) ** 1.6;
    ctx.globalAlpha = (0.45 + (0.55 * ((i * 7) % 5)) / 4) * fade;
    disc(ctx, t, r);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** The night behind and on the record: body, the label's lamp, stars, grooves. */
export function drawDisc(
  ctx: Ctx,
  t: Transform,
  light: Light,
  width: number,
  height: number,
  time: number,
): void {
  const S = t.scale;
  const body = ctx.createRadialGradient(t.cx, t.cy, 0, t.cx, t.cy, R_BODY * S);
  body.addColorStop(0, 'rgba(0,0,0,.96)');
  body.addColorStop(0.7, 'rgba(0,0,0,.85)');
  body.addColorStop(1, 'rgba(0,0,0,0)');
  disc(ctx, t, R_BODY);
  ctx.fillStyle = body;
  ctx.fill();
  const lamp = ctx.createRadialGradient(t.cx, t.cy, 150 * S, t.cx, t.cy, 640 * S);
  lamp.addColorStop(0, rgba(light.colours.glow, Math.min(0.5, 0.2 * light.lum)));
  lamp.addColorStop(1, rgba(light.colours.glow, 0));
  disc(ctx, t, 640);
  ctx.fillStyle = lamp;
  ctx.fill();
  drawStars(ctx, t, width, height, time);
  drawGrooves(ctx, t, light);
  // the run-out: the grooves end in black round the label
  const run = ctx.createRadialGradient(t.cx, t.cy, R_LABEL * S, t.cx, t.cy, (R_LABEL + 30) * S);
  run.addColorStop(0, 'rgba(3,2,2,1)');
  run.addColorStop(1, 'rgba(3,2,2,0)');
  disc(ctx, t, R_LABEL + 30);
  ctx.fillStyle = run;
  ctx.fill();
}

export function letterSpacing(ctx: Ctx, value: string): void {
  if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = value;
}

/**
 * Year rings, kept quiet — the snowflakes are the point — with small labels on a dark chip,
 * placed along the line from the disc centre towards the middle of the viewport so they stay
 * visible when zoomed in.
 */
export function drawYearRings(
  ctx: Ctx,
  t: Transform,
  width: number,
  height: number,
  years: readonly number[],
  range: YearRange,
  light: Light,
): void {
  const dx = width / 2 - t.cx;
  const dy = height / 2 - t.cy;
  const angle = Math.hypot(dx, dy) > 40 ? Math.atan2(dy, dx) : -Math.PI / 2;
  const [lc, ls] = [Math.cos(angle), Math.sin(angle)];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 9px ${MONO}`;
  for (const y of years) {
    const r = yearRadius(y, range) * t.scale;
    ctx.beginPath();
    ctx.arc(t.cx, t.cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(light.colours.sheen, 0.12);
    ctx.lineWidth = 1;
    ctx.stroke();
    const lx = t.cx + lc * r;
    const ly = t.cy + ls * r;
    if (lx < -20 || lx > width + 20 || ly < 14 || ly > height - 6) continue;
    const label = String(y);
    const tw = ctx.measureText(label).width + 10;
    ctx.fillStyle = 'rgba(8,6,5,.9)';
    ctx.fillRect(lx - tw / 2, ly - 8, tw, 16);
    ctx.fillStyle = rgba(light.colours.sheen, 0.72);
    ctx.fillText(label, lx, ly + 0.5);
  }
  ctx.textBaseline = 'alphabetic';
}
