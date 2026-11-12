// Draws SnowflakeParams + ray colours on a 2D context (CLAUDE.md §5.1, §5.2; mockup `gV2`).
// Decides nothing from song data — parameters come from domain/snowflake.ts.
import { rgba } from '../domain/colour';
import { FROST_LINE, GRADIENT_RADIUS, rayGradientStops } from '../domain/ray-colours';
import {
  paintedSize,
  BRANCH_ANGLE,
  BRANCH_AT,
  BRANCH_LENGTH,
  centreDotRadius,
  FORK_SCALE,
  FORK_SPREAD,
  glowBlur,
  lineWidth,
  OFFSHOOT_ANGLE,
  OFFSHOOT_LENGTH,
  RAY_START,
  RING_ALPHA,
  RING_SPAN,
  tipDotRadius,
  type SnowflakeParams,
} from '../domain/snowflake';

type Ctx = CanvasRenderingContext2D;
type Paint = string | CanvasGradient;
type Pt = [number, number];

const WAVE_SAMPLES = 36;

function ink(ctx: Ctx, style: Paint, width: number, glow: string): void {
  ctx.strokeStyle = style;
  ctx.shadowColor = glow;
  ctx.lineWidth = width;
  ctx.stroke();
}

function segment(ctx: Ctx, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
}

function dot(ctx: Ctx, x: number, y: number, r: number, fill: Paint, glow: string): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.shadowColor = glow;
  ctx.fill();
}

function polygon(ctx: Ctx, sides: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}

/** Main ray points: straight at the centre, a gentle wave growing with √t. */
function rayPoints(p: SnowflakeParams, R: number): Pt[] {
  const base = R * p.rayLength;
  const amp = p.waveAmplitude * R;
  const start = R * RAY_START;
  return Array.from({ length: WAVE_SAMPLES + 1 }, (_, n) => {
    const t = n / WAVE_SAMPLES;
    return [
      start + t * (base - start),
      amp * Math.sin(Math.PI * 2 * p.wavePeriods * t) * Math.sqrt(t),
    ];
  });
}

function tangent(pts: Pt[], n: number): number {
  const a = pts[Math.max(0, n - 1)]!;
  const b = pts[Math.min(pts.length - 1, n + 1)]!;
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

interface Stroke {
  ctx: Ctx;
  paint: Paint;
  glow: string;
  w: number;
  tip: number;
}

function line(s: Stroke, x1: number, y1: number, x2: number, y2: number): void {
  segment(s.ctx, x1, y1, x2, y2);
  ink(s.ctx, s.paint, s.w, s.glow);
}

function fork(s: Stroke, x: number, y: number, angle: number, len: number, depth: number): void {
  if (depth <= 0) {
    dot(s.ctx, x, y, s.tip * 1.1, s.paint, s.glow);
    return;
  }
  for (const side of [-1, 1]) {
    const b = angle + side * FORK_SPREAD;
    const ex = x + Math.cos(b) * len;
    const ey = y + Math.sin(b) * len;
    line(s, x, y, ex, ey);
    fork(s, ex, ey, b, len * FORK_SCALE, depth - 1);
  }
}

function offshoots(s: Stroke, p: SnowflakeParams, pts: Pt[], R: number): void {
  if (p.offshoots === 0) return;
  const m = Math.round(WAVE_SAMPLES * 0.5);
  const [mx, my] = pts[m]!;
  const ta = tangent(pts, m);
  const len = R * p.rayLength * OFFSHOOT_LENGTH;
  for (const side of [-1, 1]) {
    const a = ta + side * OFFSHOOT_ANGLE;
    const ex = mx + Math.cos(a) * len;
    const ey = my + Math.sin(a) * len;
    line(s, mx, my, ex, ey);
    dot(s.ctx, ex, ey, s.tip, s.paint, s.glow);
    if (p.offshoots === 2) {
      const fx = mx + Math.cos(a) * len * BRANCH_AT;
      const fy = my + Math.sin(a) * len * BRANCH_AT;
      const a2 = a + side * BRANCH_ANGLE;
      const gx = fx + Math.cos(a2) * len * BRANCH_LENGTH;
      const gy = fy + Math.sin(a2) * len * BRANCH_LENGTH;
      line(s, fx, fy, gx, gy);
      dot(s.ctx, gx, gy, s.tip, s.paint, s.glow);
    }
  }
}

/**
 * How a snowflake is inked. The default: rays in their colours fading to white at the centre,
 * frost rings, a white centre. The random player's phosphor snowflake is inked in the display's
 * colours instead (one ray colour, `core` for the fade and the centre, `ring` for the rings),
 * with a stronger glow and a bolder line.
 */
export interface FlakeInk {
  core: string;
  ring: string;
  glow: number;
  width: number;
}

const DEFAULT_INK: FlakeInk = {
  core: '#ffffff',
  ring: rgba(FROST_LINE, RING_ALPHA),
  glow: 1,
  width: 1,
};

/** Draws a snowflake of radius R centred on the context origin. */
export function drawSnowflake(
  ctx: Ctx,
  p: SnowflakeParams,
  colours: readonly string[],
  R: number,
  look: FlakeInk = DEFAULT_INK,
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = glowBlur(R) * look.glow;
  const w = Math.max(lineWidth(R), lineWidth(R) * look.width);
  for (let k = 1; k <= p.rings; k++) {
    polygon(ctx, p.rays, (R * RING_SPAN * k) / (p.rings + 0.5));
    ink(ctx, look.ring, w, look.ring);
  }
  const gradients = new Map<string, CanvasGradient>();
  const gradientFor = (colour: string): CanvasGradient => {
    let g = gradients.get(colour);
    if (!g) {
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * GRADIENT_RADIUS);
      for (const [offset, c] of rayGradientStops(colour, look.core)) g.addColorStop(offset, c);
      gradients.set(colour, g);
    }
    return g;
  };
  const pts = rayPoints(p, R);
  const end = pts[pts.length - 1]!;
  for (let i = 0; i < p.rays; i++) {
    const colour = colours[i % colours.length] ?? FROST_LINE;
    const s: Stroke = { ctx, paint: gradientFor(colour), glow: colour, w, tip: tipDotRadius(R) };
    ctx.save();
    ctx.rotate((i / p.rays) * Math.PI * 2 - Math.PI / 2);
    ctx.beginPath();
    pts.forEach(([x, y], n) => (n ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ink(ctx, s.paint, w, s.glow);
    offshoots(s, p, pts, R);
    fork(s, end[0], end[1], tangent(pts, WAVE_SAMPLES), R * p.forkLength, p.forkDepth);
    ctx.restore();
  }
  dot(ctx, 0, 0, centreDotRadius(R), look.core, look.core);
  ctx.restore();
}

export const devicePixelRatioCapped = (): number => Math.min(2, window.devicePixelRatio || 1);

/** Sizes a canvas for a static snowflake of radius R (glow included) and draws it. */
export function paintSnowflake(
  canvas: HTMLCanvasElement,
  p: SnowflakeParams,
  colours: readonly string[],
  R: number,
  look?: FlakeInk,
): void {
  const dpr = devicePixelRatioCapped();
  const size = paintedSize(R);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.translate(size / 2, size / 2);
  drawSnowflake(ctx, p, colours, R, look);
}

export interface Sprite {
  canvas: HTMLCanvasElement;
  /** Radius the sprite was drawn at (bucketed). */
  radius: number;
  /** Half the sprite's side, in CSS pixels at `radius`. */
  half: number;
}

const SPRITE_LIMIT = 600;

/** Pre-rendered snowflakes for the record, keyed by id and a 4 px size bucket. */
export class SpriteCache {
  private sprites = new Map<string, Sprite>();

  get(id: string, p: SnowflakeParams, colours: readonly string[], R: number, dpr: number): Sprite {
    const radius = Math.max(6, Math.round(R / 4) * 4);
    const key = `${id}|${radius}|${dpr}`;
    const hit = this.sprites.get(key);
    if (hit) return hit;
    const half = radius * 1.3 + 12;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.ceil(half * 2 * dpr);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(half, half);
      drawSnowflake(ctx, p, colours, radius);
    }
    const sprite = { canvas, radius, half };
    this.sprites.set(key, sprite);
    if (this.sprites.size > SPRITE_LIMIT) {
      this.sprites.delete(this.sprites.keys().next().value!);
    }
    return sprite;
  }

  clear(): void {
    this.sprites.clear();
  }
}
