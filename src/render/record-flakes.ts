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
  /** The playing track: its pulse phase, 0–1; null for every other snowflake. */
  pulse: number | null;
  title: string;
}

export const flakeTitleFont = (hovered: boolean, zoom: number): string =>
  `${hovered ? 500 : 400} ${hovered ? 11.5 : zoom > 2 ? 11 : 10}px ${MONO}`;

export function drawFlakes(ctx: Ctx, nodes: readonly FlakeNode[], zoom: number): void {
  for (const n of nodes) {
    if (n.pulse !== null && n.on) drawBeat(ctx, n, n.pulse);
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

/** The page's ice accent (--ice), as an rgb triple for canvas rgba(). */
const ICE = '166,220,255';

/** The playing snowflake's beat: a soft ice glow that swells with the pulse. */
function drawBeat(ctx: Ctx, n: FlakeNode, pulse: number): void {
  const r = n.R * (1.05 + 0.25 * pulse);
  const g = ctx.createRadialGradient(n.x, n.y, n.R * 0.3, n.x, n.y, r);
  g.addColorStop(0, `rgba(${ICE},${0.1 + 0.16 * pulse})`);
  g.addColorStop(1, `rgba(${ICE},0)`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(${ICE},${0.55 - 0.3 * pulse})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
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
