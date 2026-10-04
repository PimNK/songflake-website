// Draws the vinyl record (CLAUDE.md §5.3; mockup `drawRecord`/`render`). No layout maths —
// positions, sectors and transforms come from domain/record-layout.ts via the caller.
import type { Taxonomy } from '../content/taxonomy';
import { rgba } from '../domain/colour';
import {
  LABEL_DISTANCE,
  R_DISC,
  R_GROOVE_IN,
  R_GROOVE_OUT,
  R_LABEL,
  R_MAX,
  toScreen,
  wind,
  yearRadius,
  type Sector,
  type Transform,
  type YearRange,
} from '../domain/record-layout';
import { strings } from '../strings';

type Ctx = CanvasRenderingContext2D;

export const MONO = '"JetBrains Mono", ui-monospace, monospace';
export const DISPLAY = 'Unbounded, "Arial Black", sans-serif';
const GROOVES = 110;

function spiralPath(ctx: Ctx, t: Transform, u: number, r0: number, r1: number, steps = 24): void {
  for (let n = 0; n <= steps; n++) {
    const [x, y] = toScreen(t, ...wind(r0 + ((r1 - r0) * n) / steps, u));
    if (n) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
}

function arcPath(ctx: Ctx, t: Transform, r: number, a0: number, a1: number, move: boolean): void {
  for (let n = 0; n <= 48; n++) {
    const [x, y] = toScreen(t, ...wind(r, a0 + ((a1 - a0) * n) / 48));
    if (n || !move) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
}

function sectorTints(ctx: Ctx, t: Transform, secs: readonly Sector[], taxonomy: Taxonomy): void {
  const S = t.scale;
  for (const w of secs) {
    const hue = taxonomy.styleColours[w.style] ?? '#ffffff';
    ctx.beginPath();
    spiralPath(ctx, t, w.a0, R_GROOVE_IN, R_GROOVE_OUT);
    arcPath(ctx, t, R_GROOVE_OUT, w.a0, w.a1, false);
    spiralPath(ctx, t, w.a1, R_GROOVE_OUT, R_GROOVE_IN);
    arcPath(ctx, t, R_GROOVE_IN, w.a1, w.a0, false);
    ctx.closePath();
    const g = ctx.createRadialGradient(t.cx, t.cy, R_GROOVE_IN * S, t.cx, t.cy, R_GROOVE_OUT * S);
    g.addColorStop(0, rgba(hue, 0.02));
    g.addColorStop(1, rgba(hue, 0.1));
    ctx.fillStyle = g;
    ctx.fill();
    rimBand(ctx, t, w, hue);
  }
}

/** The rim band in the style colour: a soft glow that fades out on both sides, no hard edge. */
function rimBand(ctx: Ctx, t: Transform, w: Sector, hue: string): void {
  const [r0, r1] = [R_DISC * 0.93, R_DISC * 1.02];
  ctx.beginPath();
  arcPath(ctx, t, r0, w.a0, w.a1, true);
  arcPath(ctx, t, r1, w.a1, w.a0, false);
  ctx.closePath();
  const g = ctx.createRadialGradient(t.cx, t.cy, r0 * t.scale, t.cx, t.cy, r1 * t.scale);
  g.addColorStop(0, rgba(hue, 0));
  g.addColorStop(0.6, rgba(hue, 0.38));
  g.addColorStop(1, rgba(hue, 0));
  ctx.fillStyle = g;
  ctx.fill();
}

/** A radial stroke style that fades from `alpha` at R_MAX to nothing at the disc edge. */
function fadeToEdge(ctx: Ctx, t: Transform, rgb: string, alpha: number): CanvasGradient {
  const g = ctx.createRadialGradient(t.cx, t.cy, R_MAX * t.scale, t.cx, t.cy, R_DISC * t.scale);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  return g;
}

function circle(ctx: Ctx, t: Transform, r: number): void {
  ctx.beginPath();
  ctx.arc(t.cx, t.cy, r * t.scale, 0, Math.PI * 2);
}

/** Concentric grooves and the sector boundaries that follow the groove spiral. */
function drawGrooves(ctx: Ctx, t: Transform, secs: readonly Sector[]): void {
  for (let i = 0; i <= GROOVES; i++) {
    circle(ctx, t, R_GROOVE_IN + ((R_GROOVE_OUT - R_GROOVE_IN) * i) / GROOVES);
    ctx.strokeStyle = `rgba(225,232,255,${i % 4 === 0 ? 0.05 : 0.022})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  for (const w of secs) {
    ctx.beginPath();
    spiralPath(ctx, t, w.a0, R_GROOVE_IN, R_DISC);
    ctx.strokeStyle = fadeToEdge(ctx, t, '210,222,255', 0.22);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** Body, sectors, grooves, spiral boundaries, fixed sheen and run-out. */
export function drawDisc(
  ctx: Ctx,
  t: Transform,
  secs: readonly Sector[],
  taxonomy: Taxonomy,
): void {
  const S = t.scale;
  circle(ctx, t, R_DISC);
  // The body fades into the page at the edge: no outline that would cut through the titles.
  const body = ctx.createRadialGradient(t.cx, t.cy, R_LABEL * S, t.cx, t.cy, R_DISC * S);
  body.addColorStop(0, '#0d0f17');
  body.addColorStop(0.9, 'rgba(8,9,14,.96)');
  body.addColorStop(1, 'rgba(8,9,14,0)');
  ctx.fillStyle = body;
  ctx.fill();
  sectorTints(ctx, t, secs, taxonomy);
  drawGrooves(ctx, t, secs);
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

function letterSpacing(ctx: Ctx, value: string): void {
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
  ctx.font = `400 9.5px ${MONO}`;
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

function labelText(ctx: Ctx, LR: number, range: YearRange, trackCount: number): void {
  const fs = Math.max(7, LR * 0.15);
  const r = strings.record;
  ctx.fillStyle = '#e8eeff';
  ctx.textAlign = 'center';
  ctx.font = `500 ${fs * 1.15}px ${DISPLAY}`;
  letterSpacing(ctx, '1px');
  ctx.fillText(r.labelName, 0, -LR * 0.28);
  ctx.font = `400 ${fs * 0.68}px ${MONO}`;
  letterSpacing(ctx, '1.5px');
  ctx.fillStyle = 'rgba(200,212,245,.8)';
  if (LR > 80) {
    ctx.fillText(r.labelSide(range.first, range.last), 0, LR * 0.36);
    ctx.fillText(r.labelTracks(trackCount), 0, LR * 0.52);
  } else {
    ctx.fillText(r.labelShort, 0, LR * 0.42);
  }
  letterSpacing(ctx, '0px');
}

/** The centre label spins with the disc: paper, ice ring, style arcs, name, side and count. */
export function drawCentreLabel(
  ctx: Ctx,
  t: Transform,
  phi: number,
  secs: readonly Sector[],
  taxonomy: Taxonomy,
  range: YearRange,
  trackCount: number,
): void {
  const LR = R_LABEL * t.scale;
  ctx.save();
  ctx.translate(t.cx, t.cy);
  ctx.rotate(phi);
  const paper = ctx.createRadialGradient(0, 0, 0, 0, 0, LR);
  paper.addColorStop(0, '#1b2647');
  paper.addColorStop(1, '#131b35');
  ctx.beginPath();
  ctx.arc(0, 0, LR, 0, Math.PI * 2);
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, LR * 0.93, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(166,220,255,.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  for (const w of secs) {
    const a = (w.a0 + w.a1) / 2;
    ctx.beginPath();
    ctx.arc(0, 0, LR * 0.86, a - 0.18, a + 0.18);
    ctx.strokeStyle = rgba(taxonomy.styleColours[w.style] ?? '#ffffff', 0.9);
    ctx.lineWidth = Math.max(2, LR * 0.04);
    ctx.stroke();
  }
  labelText(ctx, LR, range, trackCount);
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(2.5, LR * 0.07), 0, Math.PI * 2);
  ctx.fillStyle = '#05070f';
  ctx.fill();
  ctx.restore();
}

/** Style name and track count outside the disc edge, never touching it. */
export function drawSectorNames(
  ctx: Ctx,
  t: Transform,
  secs: readonly Sector[],
  taxonomy: Taxonomy,
  zoom: number,
): void {
  for (const w of secs) {
    const [x, y] = toScreen(t, ...wind(R_DISC * LABEL_DISTANCE, (w.a0 + w.a1) / 2));
    ctx.textAlign = 'center';
    ctx.font = `500 ${zoom > 2 ? 12 : 11}px ${MONO}`;
    letterSpacing(ctx, '2px');
    ctx.fillStyle = rgba(taxonomy.styleColours[w.style] ?? '#ffffff', 0.95);
    ctx.fillText(w.style.toUpperCase(), x, y);
    letterSpacing(ctx, '0px');
    ctx.font = `400 10px ${MONO}`;
    ctx.fillStyle = 'rgba(190,205,245,.55)';
    ctx.fillText(strings.tracks(w.count), x, y + 14);
  }
}
