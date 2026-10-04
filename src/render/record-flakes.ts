// Things drawn over and under the vinyl that are not the vinyl: the star field behind the stage
// and the snowflakes with their titles. Positions and sizes come from the record view.
import { rng } from '../domain/seed';
import { MONO } from './record';
import type { Sprite } from './snowflake';

type Ctx = CanvasRenderingContext2D;

export interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  p: number;
}

/** A fixed star field for a stage size (seeded, so it does not jump on redraw). */
export function starField(width: number, height: number): Star[] {
  const rand = rng(0.4217);
  return Array.from({ length: Math.round((width * height) / 2800) }, () => ({
    x: rand() * width,
    y: rand() * height,
    r: rand() * 1.1 + 0.2,
    a: rand() * 0.45 + 0.06,
    p: rand() * 6,
  }));
}

export function drawStars(ctx: Ctx, stars: readonly Star[], time: number): void {
  for (const s of stars) {
    ctx.fillStyle = `rgba(220,230,255,${s.a * (0.7 + 0.3 * Math.sin(time * 0.8 + s.p))})`;
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
}

export interface FlakeNode {
  x: number;
  y: number;
  /** Drawn radius in px. */
  R: number;
  rotation: number;
  sprite: Sprite;
  /** Matches the filters: full opacity with a label. */
  on: boolean;
  hovered: boolean;
  title: string;
}

export const flakeTitleFont = (hovered: boolean, zoom: number): string =>
  `${hovered ? 500 : 400} ${hovered ? 11.5 : zoom > 2 ? 11 : 10}px ${MONO}`;

export function drawFlakes(ctx: Ctx, nodes: readonly FlakeNode[], zoom: number): void {
  const labelAlpha = zoom < 1.3 ? 0.55 : 0.85;
  for (const n of nodes) {
    const k = n.R / n.sprite.radius;
    const hh = n.sprite.half * k;
    ctx.save();
    ctx.globalAlpha = n.on ? 1 : 0.1;
    ctx.translate(n.x, n.y);
    ctx.rotate(n.rotation);
    ctx.drawImage(n.sprite.canvas, -hh, -hh, hh * 2, hh * 2);
    ctx.restore();
    if (!n.on) continue;
    ctx.font = flakeTitleFont(n.hovered, zoom);
    ctx.textAlign = 'center';
    ctx.fillStyle = n.hovered ? 'rgba(240,245,255,1)' : `rgba(205,215,240,${labelAlpha})`;
    ctx.fillText(n.title, n.x, n.y + n.R * 1.1 + 11);
  }
}
