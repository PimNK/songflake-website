// Geometry of the record (CLAUDE.md §5.3). Pure — no canvas, no animation loop.
// World units: grooves from R_MIN (earliest year) to R_MAX (latest), disc edge at R_DISC.
import type { Song } from '../content/parse';

export const R_MIN = 300;
export const R_MAX = 1000;
export const R_DISC = 1070;
export const R_LABEL = 186;
export const R_GROOVE_IN = R_MIN * 0.9;
export const R_GROOVE_OUT = R_MAX * 1.03;
export const SPIRAL = 0.85;
export const LABEL_DISTANCE = 1.17; // style names, × R_DISC
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 8;
export const YEAR_DRIFT = 0.45; // under half a year: songs of different years never swap order

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

/** Radial units per year (for the ±YEAR_DRIFT constraint). */
export const yearUnit = (range: YearRange): number =>
  (R_MAX - R_MIN) / Math.max(1, range.last - range.first);

/** One sector per style in taxonomy order, all the same width, the first centred on the top. */
export function sectors(styles: readonly string[], songs: readonly Song[]): Sector[] {
  const w = (Math.PI * 2) / Math.max(1, styles.length);
  const start = -Math.PI / 2 - w / 2;
  return styles.map((style, i) => ({
    style,
    a0: start + i * w,
    a1: start + (i + 1) * w,
    count: songs.filter((s) => s.style === style).length,
  }));
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

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

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

/** Pan limited so the disc can never be lost off-screen; at ×1 the disc is centred. */
export function clampPan(v: Viewport): Viewport {
  const lim = Math.max(0, R_MAX * fitScale(v.width, v.height) * (v.zoom - ZOOM_MIN) * 1.05);
  return { ...v, panX: clamp(v.panX, -lim, lim), panY: clamp(v.panY, -lim, lim) };
}

/** Dragging turns the disc round its centre by the angle swept from (x0, y0) to (x1, y1). */
export function rotateBy(v: Viewport, x0: number, y0: number, x1: number, y1: number): Viewport {
  const cx = v.width / 2 + v.panX;
  const cy = v.height / 2 + v.panY;
  const swept = nearAngle(Math.atan2(y1 - cy, x1 - cx) - Math.atan2(y0 - cy, x0 - cx), 0);
  return { ...v, phi: v.phi + swept };
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

/** A title's box (centre x, top y, width, height) under its snowflake (centre, radius), in px. */
export interface Labelled {
  box: { x: number; y: number; w: number; h: number };
  flake: { x: number; y: number; r: number };
}

/**
 * Which titles are drawn: greedily in the given (priority) order, a title is shown unless it
 * would cover a title already shown or another snowflake. Zooming in makes room for the rest.
 */
export function visibleTitles(items: readonly Labelled[]): boolean[] {
  const shown: Labelled['box'][] = [];
  return items.map((it, i) => {
    const b = it.box;
    const [left, right, top, bottom] = [b.x - b.w / 2, b.x + b.w / 2, b.y, b.y + b.h];
    const hitsBox = shown.some(
      (o) => left < o.x + o.w / 2 && right > o.x - o.w / 2 && top < o.y + o.h && bottom > o.y,
    );
    const hitsFlake = items.some((o, j) => {
      if (j === i) return false;
      const nx = clamp(o.flake.x, left, right);
      const ny = clamp(o.flake.y, top, bottom);
      return Math.hypot(o.flake.x - nx, o.flake.y - ny) < o.flake.r * 0.8;
    });
    if (hitsBox || hitsFlake) return false;
    shown.push(b);
    return true;
  });
}
