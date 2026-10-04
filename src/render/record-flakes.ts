// The snowflakes with their titles, drawn over the vinyl. Positions and sizes come from the
// record view.
import { visibleTitles } from '../domain/record-layout';
import { MONO } from './record';
import type { Sprite } from './snowflake';

type Ctx = CanvasRenderingContext2D;

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
  for (const n of nodes) {
    const k = n.R / n.sprite.radius;
    const hh = n.sprite.half * k;
    ctx.save();
    ctx.globalAlpha = n.on ? 1 : 0.1;
    ctx.translate(n.x, n.y);
    ctx.rotate(n.rotation);
    ctx.drawImage(n.sprite.canvas, -hh, -hh, hh * 2, hh * 2);
    ctx.restore();
  }
  drawTitles(ctx, nodes, zoom);
}

/** Titles of matching snowflakes; the hovered one and bigger snowflakes win where they collide. */
function drawTitles(ctx: Ctx, nodes: readonly FlakeNode[], zoom: number): void {
  const labelAlpha = zoom < 1.3 ? 0.55 : 0.85;
  const on = nodes
    .filter((n) => n.on)
    .sort((a, b) => Number(b.hovered) - Number(a.hovered) || b.R - a.R);
  const items = on.map((n) => {
    ctx.font = flakeTitleFont(n.hovered, zoom);
    const w = ctx.measureText(n.title).width + 4;
    return { box: { x: n.x, y: n.y + n.R * 1.1 + 2, w, h: 12 }, flake: { x: n.x, y: n.y, r: n.R } };
  });
  const visible = visibleTitles(items);
  ctx.textAlign = 'center';
  on.forEach((n, i) => {
    if (!visible[i]) return;
    ctx.font = flakeTitleFont(n.hovered, zoom);
    ctx.fillStyle = n.hovered ? 'rgba(240,245,255,1)' : `rgba(205,215,240,${labelAlpha})`;
    ctx.fillText(n.title, n.x, n.y + n.R * 1.1 + 11);
  });
}
