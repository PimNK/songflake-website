// The five-axis complexity radar as an SVG string (CLAUDE.md §4.3). No chart library.
// Grid and label colours come from CSS classes (styles/card.css); the polygon from the lead colour.
import { AXES, type Complexity } from '../content/parse';
import { rgba } from '../domain/colour';
import { strings } from '../strings';

const C = 150;
const R = 92;
const LEVELS = [1, 2, 3];

const angle = (i: number): number => -Math.PI / 2 + (i * Math.PI * 2) / AXES.length;
const point = (i: number, v: number): [number, number] => [
  C + (Math.cos(angle(i)) * R * v) / 3,
  C + (Math.sin(angle(i)) * R * v) / 3,
];
const pts = (values: number[]): string => values.map((v, i) => point(i, v).join(',')).join(' ');

export function radarSvg(complexity: Complexity, colour: string): string {
  const values = AXES.map((a) => complexity[a]);
  const names = AXES.map((a) => strings.axes[a]);
  let g = LEVELS.map(
    (l) => `<polygon class="radar-grid" points="${pts(AXES.map(() => l))}"/>`,
  ).join('');
  g += AXES.map((_, i) => {
    const [x, y] = point(i, 3);
    return `<line class="radar-grid" x1="${C}" y1="${C}" x2="${x}" y2="${y}"/>`;
  }).join('');
  g += LEVELS.map((l) => {
    const [x, y] = point(0, l);
    return `<text class="radar-scale" x="${x + 6}" y="${y + 3}">${l}</text>`;
  }).join('');
  g += `<polygon points="${pts(values)}" fill="${rgba(colour, 0.22)}" stroke="${colour}" stroke-width="1.6" stroke-linejoin="round"/>`;
  g += values
    .map((v, i) => {
      const [x, y] = point(i, v);
      return `<circle class="radar-dot" cx="${x}" cy="${y}" r="3.2"/>`;
    })
    .join('');
  g += names
    .map((n, i) => {
      const a = angle(i);
      const x = C + Math.cos(a) * (R + 22);
      const y = C + Math.sin(a) * (R + 18);
      const anchor = Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
      return `<text class="radar-axis" x="${x}" y="${y + 4}" text-anchor="${anchor}">${n} <tspan fill="${colour}" class="radar-value">${values[i]}</tspan></text>`;
    })
    .join('');
  const label = strings.card.radarLabel(names.map((n, i) => [n, values[i]!]));
  // Framed tight round the labels (the side ones reach past the grid), so the radar fills its cell.
  return `<svg viewBox="-34 26 368 226" role="img" aria-label="${label}">${g}</svg>`;
}
