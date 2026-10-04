// Geometry of the record (CLAUDE.md §5.3). Pure — no canvas, no animation loop.
// World units: grooves from R_MIN (earliest year) to R_MAX (latest), disc edge at R_DISC.
import type { Song } from '../content/parse';
import { hash01 } from './seed';

export const R_MIN = 300;
export const R_MAX = 1000;
export const R_DISC = 1070;
export const R_LABEL = 186;
export const R_GROOVE_IN = R_MIN * 0.9;
export const R_GROOVE_OUT = R_MAX * 1.03;
export const SPIRAL = 0.85;
export const MIN_SHARE = 0.14;
export const LABEL_DISTANCE = 1.17; // style names, × R_DISC
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 8;
export const YEAR_BAND = 1.7; // a song may drift this many years from its true radius

export interface Sector {
  style: string;
  /** Start and end angle at R_MIN, radians, clockwise in screen space (y down). */
  a0: number;
  a1: number;
  count: number;
}

export interface YearRange {
  first: number;
  last: number;
}

/** The year a song sits at: its ready year; in-progress songs sit at the latest year. */
export const placementYear = (song: Song, range: YearRange): number =>
  song.years.ready ?? range.last;

export function yearRange(songs: readonly Song[]): YearRange {
  const years = songs.flatMap((s) => (s.years.ready === undefined ? [] : [s.years.ready]));
  if (!years.length) {
    const now = Math.max(0, ...songs.map((s) => s.years.idea));
    return { first: now, last: now };
  }
  return { first: Math.min(...years), last: Math.max(...years) };
}

export function yearRadius(year: number, range: YearRange): number {
  if (range.last === range.first) return (R_MIN + R_MAX) / 2;
  return R_MIN + ((year - range.first) / (range.last - range.first)) * (R_MAX - R_MIN);
}

/** Radial units per year (for the ±YEAR_BAND constraint). */
export const yearUnit = (range: YearRange): number =>
  (R_MAX - R_MIN) / Math.max(1, range.last - range.first);

/** One sector per style in taxonomy order, width ∝ song count with a minimum share. */
export function sectors(styles: readonly string[], songs: readonly Song[]): Sector[] {
  if (!styles.length) return [];
  const counts = styles.map((st) => songs.filter((s) => s.style === st).length);
  const total = Math.max(1, songs.length);
  const raw = counts.map((n) => Math.max(MIN_SHARE, n / total));
  const sum = raw.reduce((a, b) => a + b, 0);
  const shares = raw.map((x) => x / sum);
  let a = -Math.PI / 2 - shares[0]! * Math.PI; // first sector centred on the top
  return styles.map((style, i) => {
    const w = shares[i]! * Math.PI * 2;
    const sector = { style, a0: a, a1: a + w, count: counts[i]! };
    a += w;
    return sector;
  });
}

/** Point at radius r on the groove spiral that starts at angle u on R_MIN. */
export function wind(r: number, u: number): [number, number] {
  const t = u + SPIRAL * Math.log(r / R_MIN);
  return [r * Math.cos(t), r * Math.sin(t)];
}

/** Inverse of `wind`: world point → [radius, spiral start angle]. */
export function unwind(x: number, y: number): [number, number] {
  const r = Math.max(1, Math.hypot(x, y));
  return [r, Math.atan2(y, x) - SPIRAL * Math.log(r / R_MIN)];
}

/** Angle `u` shifted by whole turns to lie within π of `centre`. */
export function nearAngle(u: number, centre: number): number {
  while (u - centre > Math.PI) u -= Math.PI * 2;
  while (u - centre < -Math.PI) u += Math.PI * 2;
  return u;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export interface Placement {
  x: number;
  y: number;
}

/**
 * Each song starts at its year radius inside its sector, then relaxation pushes overlapping
 * songs apart. `radiusOf` is the collision radius in world units (flake and title together).
 */
export function solveLayout(
  songs: readonly Song[],
  secs: readonly Sector[],
  range: YearRange,
  radiusOf: (song: Song) => number,
  iterations = 600,
): Map<string, Placement> {
  const band = yearUnit(range) * YEAR_BAND;
  const nodes = secs.flatMap((sec) =>
    songs
      .filter((s) => s.style === sec.style)
      .map((s) => ({ s, h: hash01(s.slug), rt: yearRadius(placementYear(s, range), range) }))
      .sort((a, b) => a.rt - b.rt || a.h - b.h)
      .map((n, j) => {
        const u = sec.a0 + (sec.a1 - sec.a0) * (0.12 + 0.76 * ((j * 0.618) % 1));
        const [x, y] = wind(n.rt, u);
        return { ...n, sec, cw: radiusOf(n.s), x, y };
      }),
  );
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        const m = a.cw + b.cw;
        if (d >= m) continue;
        if (d < 1e-3) [dx, dy, d] = [Math.cos(i + j), Math.sin(i + j), 1];
        const p = (m - d) / 2 / d;
        a.x -= dx * p;
        a.y -= dy * p;
        b.x += dx * p;
        b.y += dy * p;
      }
    }
    for (const n of nodes) {
      let [r, u] = unwind(n.x, n.y);
      u = nearAngle(u, (n.sec.a0 + n.sec.a1) / 2);
      r += (n.rt - r) * 0.05;
      r = clamp(r, Math.max(R_MIN * 0.86, n.rt - band), Math.min(R_MAX * 1.02, n.rt + band));
      const margin = Math.min((n.cw * 1.05) / r, (n.sec.a1 - n.sec.a0) * 0.45);
      u = clamp(u, n.sec.a0 + margin, n.sec.a1 - margin);
      [n.x, n.y] = wind(r, u);
    }
  }
  return new Map(nodes.map((n) => [n.s.slug, { x: n.x, y: n.y }]));
}

// ---- viewport -------------------------------------------------------------------------------

export interface Viewport {
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
  /** Disc rotation, radians. */
  phi: number;
}

/** Screen pixels per world unit at zoom 1: the disc plus outside labels fill the stage. */
export const fitScale = (width: number, height: number): number =>
  Math.min(width, height) / 2 / (R_MAX * 1.3);

/** Snowflake size scale for the stage; flakes grow slower than the map when zooming. */
export const stageFlakeScale = (width: number, height: number): number =>
  clamp(Math.min(width, height) / 760, 0.72, 1.35);

/**
 * Collision radius in world units: covers the snowflake and its title (§5.3) —
 * max(1.3 × flake radius, half the label width), plus a small gap.
 */
export const collisionRadius = (flakePx: number, halfLabelPx: number, fit: number): number =>
  (Math.max(flakePx * 1.3, halfLabelPx * 0.92) + 7) / fit;

/** Each snowflake turns slowly on its own; more rays turn a little faster. */
export const flakeTurn = (structure: number, time: number, offset: number): number =>
  time * 0.08 * (1 + structure * 0.3) + offset;

/** How close a pointer must be to a snowflake to hit it, in px. */
export const hitRadius = (flakePx: number): number => Math.max(12, flakePx * 1.1);

export const flakeRadius = (sizeFactor: number, flakeScale: number, zoom: number): number =>
  16 * sizeFactor * flakeScale * Math.pow(zoom, 0.45);

export interface Transform {
  scale: number;
  cx: number;
  cy: number;
  cos: number;
  sin: number;
}

export function transform(v: Viewport): Transform {
  return {
    scale: fitScale(v.width, v.height) * v.zoom,
    cx: v.width / 2 + v.panX,
    cy: v.height / 2 + v.panY,
    cos: Math.cos(v.phi),
    sin: Math.sin(v.phi),
  };
}

export function toScreen(t: Transform, x: number, y: number): [number, number] {
  return [t.cx + (x * t.cos - y * t.sin) * t.scale, t.cy + (x * t.sin + y * t.cos) * t.scale];
}

export function toWorld(t: Transform, sx: number, sy: number): [number, number] {
  const dx = (sx - t.cx) / t.scale;
  const dy = (sy - t.cy) / t.scale;
  return [dx * t.cos + dy * t.sin, -dx * t.sin + dy * t.cos];
}

/** Pan limited so the disc can never be lost off-screen. */
export function clampPan(v: Viewport): Viewport {
  const lim = Math.max(
    0,
    R_MAX * fitScale(v.width, v.height) * v.zoom * 1.05 - Math.min(v.width, v.height) * 0.3,
  );
  return { ...v, panX: clamp(v.panX, -lim, lim), panY: clamp(v.panY, -lim, lim) };
}

/** Zoom to `zoom`, keeping the screen point (mx, my) over the same spot of the disc. */
export function zoomAt(v: Viewport, zoom: number, mx: number, my: number): Viewport {
  const z = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
  const k = z / v.zoom;
  const cx = v.width / 2 + v.panX;
  const cy = v.height / 2 + v.panY;
  const ncx = mx - (mx - cx) * k;
  const ncy = my - (my - cy) * k;
  return clampPan({ ...v, zoom: z, panX: ncx - v.width / 2, panY: ncy - v.height / 2 });
}

/** Year rings: every 5 years below ×1.7, every 3 below ×3, every year from ×3. */
export const ringStep = (zoom: number): 1 | 3 | 5 => (zoom < 1.7 ? 5 : zoom < 3 ? 3 : 1);

export function ringYears(range: YearRange, step: 1 | 3 | 5): number[] {
  const out: number[] = [];
  for (let y = range.first; y <= range.last; y++) {
    if (step === 1 || (step === 5 ? y % 5 === 0 : (y - range.first) % 3 === 0)) out.push(y);
  }
  return out;
}

/** Disc spin speed, slowed when zoomed so a zoomed-in region does not drift away. */
export const spinRate = (zoom: number): number => 0.03 / Math.pow(zoom, 1.5);
