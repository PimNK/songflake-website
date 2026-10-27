// Draws the vinyl record (CLAUDE.md §5.3; mockup `drawRecord`/`render`). No layout maths —
// positions and transforms come from domain/record-layout.ts via the caller. The disc has no
// style sectors: it is one surface, with a neutral glow at the rim.
import {
  R_DISC,
  R_GROOVE_IN,
  R_GROOVE_OUT,
  R_LABEL,
  yearRadius,
  type Transform,
  type YearRange,
} from '../domain/record-layout';

type Ctx = CanvasRenderingContext2D;

export const BODY = '"Golos Text", system-ui, sans-serif';
export const DISPLAY = 'Unbounded, "Arial Black", sans-serif';
const GROOVES = 110;

/** The rim band: a soft ice glow all round, fading out on both sides, no hard edge. */
function rimBand(ctx: Ctx, t: Transform): void {
  const [r0, r1] = [R_DISC * 0.93 * t.scale, R_DISC * 1.02 * t.scale];
  ctx.beginPath();
  ctx.arc(t.cx, t.cy, r1, 0, Math.PI * 2);
  ctx.arc(t.cx, t.cy, r0, 0, Math.PI * 2, true);
  const g = ctx.createRadialGradient(t.cx, t.cy, r0, t.cx, t.cy, r1);
  g.addColorStop(0, 'rgba(166,220,255,0)');
  g.addColorStop(0.6, 'rgba(166,220,255,.16)');
  g.addColorStop(1, 'rgba(166,220,255,0)');
  ctx.fillStyle = g;
  ctx.fill();
}

function circle(ctx: Ctx, t: Transform, r: number): void {
  ctx.beginPath();
  ctx.arc(t.cx, t.cy, r * t.scale, 0, Math.PI * 2);
}

/** Concentric grooves. */
function drawGrooves(ctx: Ctx, t: Transform): void {
  for (let i = 0; i <= GROOVES; i++) {
    circle(ctx, t, R_GROOVE_IN + ((R_GROOVE_OUT - R_GROOVE_IN) * i) / GROOVES);
    ctx.strokeStyle = `rgba(225,232,255,${i % 4 === 0 ? 0.05 : 0.022})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
}

/** Body, grooves, rim glow, fixed sheen and run-out. */
export function drawDisc(ctx: Ctx, t: Transform): void {
  const S = t.scale;
  circle(ctx, t, R_DISC);
  // The body fades into the page at the edge: no outline that would cut through the titles.
  const body = ctx.createRadialGradient(t.cx, t.cy, R_LABEL * S, t.cx, t.cy, R_DISC * S);
  body.addColorStop(0, '#0d0f17');
  body.addColorStop(0.9, 'rgba(8,9,14,.96)');
  body.addColorStop(1, 'rgba(8,9,14,0)');
  ctx.fillStyle = body;
  ctx.fill();
  drawGrooves(ctx, t);
  rimBand(ctx, t);
  // Sheen: a fixed light source — two soft wedges that do not rotate with the disc.
  const sheen = ctx.createConicGradient(-Math.PI / 4, t.cx, t.cy);
  for (const [o, a] of [
    [0, 0],
    [0.07, 0.075],
    [0.14, 0],
    [0.5, 0],
    [0.57, 0.06],
    [0.64, 0],
    [1, 0],
  ]) {
    sheen.addColorStop(o!, `rgba(255,255,255,${a})`);
  }
  ctx.beginPath();
  ctx.arc(t.cx, t.cy, R_GROOVE_OUT * S, 0, Math.PI * 2);
  ctx.arc(t.cx, t.cy, R_LABEL * S, 0, Math.PI * 2, true);
  ctx.fillStyle = sheen;
  ctx.fill();
  circle(ctx, t, R_GROOVE_IN);
  ctx.strokeStyle = 'rgba(225,232,255,.08)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function letterSpacing(ctx: Ctx, value: string): void {
  if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = value;
}

/**
 * Year rings, kept quiet — the snowflakes are the point — with small labels on a soft chip,
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
): void {
  const dx = width / 2 - t.cx;
  const dy = height / 2 - t.cy;
  const angle = Math.hypot(dx, dy) > 40 ? Math.atan2(dy, dx) : -Math.PI / 2;
  const [lc, ls] = [Math.cos(angle), Math.sin(angle)];
  ctx.textAlign = 'center';
  ctx.font = `400 9.5px ${BODY}`;
  for (const y of years) {
    const r = yearRadius(y, range) * t.scale;
    ctx.beginPath();
    ctx.arc(t.cx, t.cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(190,205,255,.09)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const lx = t.cx + lc * r;
    const ly = t.cy + ls * r;
    if (lx < -20 || lx > width + 20 || ly < 14 || ly > height - 6) continue;
    const label = String(y);
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(8,9,14,.5)';
    ctx.fillRect(lx - tw / 2 - 3, ly - 7, tw + 6, 13);
    ctx.fillStyle = 'rgba(190,205,240,.45)';
    ctx.fillText(label, lx, ly + 3.5);
  }
}
