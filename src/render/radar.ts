// The five-axis complexity radar as an SVG string (CLAUDE.md §4.3), drawn as a round CRT: a dark
// tube, dashed grid rings at 1 / 2, a solid one at 3, the spokes, the trace in the lead colour with
// a glow, and the axis names with their values. No chart library. Colours of the tube, grid and
// labels follow the backlight through CSS (styles/card-body.css); the trace takes the lead colour.
import { AXES, type Complexity } from '../content/parse';
import { strings } from '../strings';

const R = 100;
const LEVELS = [1, 2, 3];

const angle = (i: number): number => -Math.PI / 2 + (i * Math.PI * 2) / AXES.length;
const point = (i: number, v: number): [number, number] => [
  Math.cos(angle(i)) * R * v,
  Math.sin(angle(i)) * R * v,
];
const pts = (values: readonly number[]): string =>
  values
    .map((v, i) =>
      point(i, v / 3)
        .map((n) => n.toFixed(1))
        .join(','),
    )
    .join(' ');

export function radarSvg(complexity: Complexity, colour: string): string {
  const values = AXES.map((a) => complexity[a]);
  const names = AXES.map((a) => strings.axes[a]);
  const grid = LEVELS.map(
    (l) =>
      `<polygon class="radar-grid${l < 3 ? ' dash' : ''}" points="${pts(AXES.map(() => l))}"/>`,
  ).join('');
  const spokes = AXES.map((_, i) => {
    const [x, y] = point(i, 1);
    return `<line class="radar-grid" x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
  }).join('');
  const trace = `<polygon points="${pts(values)}" fill="${colour}" fill-opacity=".14" stroke="${colour}" stroke-width="1.6" stroke-linejoin="round" filter="url(#radar-glow)"/>`;
  const dots = values
    .map((v, i) => {
      const [x, y] = point(i, v / 3);
      return `<circle class="radar-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" filter="url(#radar-glow)"/>`;
    })
    .join('');
  const labels = names
    .map((n, i) => {
      const [x, y] = point(i, 1.24);
      const anchor = Math.abs(x) < 8 ? 'middle' : x > 0 ? 'start' : 'end';
      const dy = y < -50 ? -4 : 6;
      return `<text class="radar-axis" x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}">${n} <tspan class="radar-value">${values[i]}</tspan></text>`;
    })
    .join('');
  const label = strings.card.radarLabel(names.map((n, i) => [n, values[i]!]));
  return `<svg viewBox="-185 -138 370 270" role="img" aria-label="${label}">
    <defs><filter id="radar-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="radar-tube"><stop offset="0" class="tube-in"/><stop offset=".8" stop-color="#060301" stop-opacity=".9"/><stop offset="1" stop-color="#000"/></radialGradient></defs>
    <circle r="118" fill="url(#radar-tube)" stroke="#000" stroke-width="2"/><circle class="radar-rim" r="121"/>
    ${grid}${spokes}${trace}${dots}${labels}</svg>`;
}
