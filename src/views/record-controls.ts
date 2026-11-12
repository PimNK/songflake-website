// The record's stage DOM: the canvas and its hover tooltip — a small display with the title,
// style · year, the five complexity axes as lamp bars and the instruments' lights. Wiring only.
import { AXES, type Song } from '../content/parse';
import type { Taxonomy } from '../content/taxonomy';
import { strings } from '../strings';
import { esc } from './html';

export const recordTemplate = (): string => `
  <canvas aria-label="${strings.record.canvasLabel}"></canvas>
  <div class="tip" hidden></div>`;

const LEVELS = [1, 2, 3];

function tipHtml(s: Song, taxonomy: Taxonomy): string {
  const year = s.years.ready !== undefined ? String(s.years.ready) : strings.list.inProgress;
  const axes = AXES.map(
    (a) =>
      `<div><span>${strings.axes[a]}</span>${LEVELS.map((v) => `<i${v <= s.complexity[a] ? ' class="on"' : ''}></i>`).join('')}</div>`,
  ).join('');
  const accents = s.accents
    .map((id) => taxonomy.accents.find((x) => x.id === id))
    .map((a) => (a ? `<span><i style="--led:${esc(a.colour)}"></i>${esc(a.name)}</span>` : ''))
    .join('');
  return `<b>${esc(s.title)}</b><small>${esc(strings.list.year(s.style, year))}</small>
    <div class="tax">${axes}</div><div class="tacc">${accents}</div>`;
}

/** Shows the tooltip for a song by the pointer, kept inside the stage. */
export function showTooltip(
  tip: HTMLElement,
  s: Song,
  taxonomy: Taxonomy,
  x: number,
  y: number,
  stage: { width: number; height: number },
): void {
  if (tip.dataset.slug !== s.slug) {
    tip.innerHTML = tipHtml(s, taxonomy);
    tip.dataset.slug = s.slug;
  }
  tip.hidden = false;
  tip.style.left = `${Math.min(stage.width - tip.offsetWidth - 8, x + 18)}px`;
  tip.style.top = `${Math.min(stage.height - tip.offsetHeight - 8, y + 18)}px`;
}
