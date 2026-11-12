// The snowflakes with their titles, drawn over the vinyl. Positions and sizes come from the
// record view; the playing track's lamp and the titles' colours from the backlight.
import type { Light } from '../domain/backlight';
import { visibleTitles } from '../domain/record-layout';
import { letterSpacing, MONO } from './record';
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

/** The titles: small, uppercase, the same face as the list's tiles. */
export const TITLE_FONT = `500 8.5px ${MONO}`;
const TITLE_SPACING = '0.6px';

/** A title as it is drawn (uppercase), for measuring and drawing alike. */
export const titleText = (title: string): string => title.toUpperCase();

/** Sets the title font on a context (font and letter spacing), e.g. to measure titles. */
export function titleFont(ctx: Ctx): void {
  ctx.font = TITLE_FONT;
  letterSpacing(ctx, TITLE_SPACING);
}

export function drawFlakes(ctx: Ctx, nodes: readonly FlakeNode[], light: Light): void {
  for (const n of nodes) {
    if (n.pulse !== null && n.on) drawBeat(ctx, n, n.pulse, light);
    const k = n.R / n.sprite.radius;
    const hh = n.sprite.half * k;
    ctx.save();
    ctx.globalAlpha = n.on ? 1 : 0.1;
    ctx.translate(n.x, n.y);
    ctx.rotate(n.rotation);
    ctx.drawImage(n.sprite.canvas, -hh, -hh, hh * 2, hh * 2);
    ctx.restore();
  }
  drawTitles(ctx, nodes, light);
}

/** The playing snowflake's beat: a warm lamp under it and a thin ring, both swelling with it. */
function drawBeat(ctx: Ctx, n: FlakeNode, pulse: number, light: Light): void {
  const { glow, sheen } = light.colours;
  const g = ctx.createRadialGradient(n.x, n.y, n.R * 0.2, n.x, n.y, n.R * 2.1);
  g.addColorStop(0, `rgba(${glow.join(',')},${Math.min(0.8, (0.16 + 0.26 * pulse) * light.lum)})`);
  g.addColorStop(1, `rgba(${glow.join(',')},0)`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(n.x, n.y, n.R * 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(${sheen.join(',')},${0.18 + 0.5 * pulse})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(n.x, n.y, n.R * 1.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Titles of matching snowflakes; the hovered one and bigger snowflakes win where they collide. */
function drawTitles(ctx: Ctx, nodes: readonly FlakeNode[], light: Light): void {
  const on = nodes
    .filter((n) => n.on)
    .sort((a, b) => Number(b.hovered) - Number(a.hovered) || b.R - a.R);
  titleFont(ctx);
  const items = on.map((n) => {
    const w = ctx.measureText(titleText(n.title)).width + 6;
    return { box: { x: n.x, y: n.y + n.R * 1.2 + 3, w, h: 16 }, flake: { x: n.x, y: n.y, r: n.R } };
  });
  const visible = visibleTitles(items);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const rest = `rgba(${light.colours.creamRgb.join(',')},.58)`;
  on.forEach((n, i) => {
    if (!visible[i]) return;
    ctx.fillStyle = n.hovered || n.pulse !== null ? light.colours.hot : rest;
    ctx.fillText(titleText(n.title), n.x, n.y + n.R * 1.2 + 11);
  });
  ctx.textBaseline = 'alphabetic';
  letterSpacing(ctx, '0px');
}
