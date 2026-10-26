// The record's stage DOM: the canvas and its hover tooltip. Wiring only.
import type { Song } from '../content/parse';
import { strings } from '../strings';
import { esc } from './html';

const r = strings.record;

export const recordTemplate = (): string => `
  <canvas aria-label="${r.canvasLabel}"></canvas>
  <div class="tip" hidden></div>`;

/** Title, style · band/solo · year · complexity, kept inside the stage. */
export function showTooltip(
  tip: HTMLElement,
  s: Song,
  x: number,
  y: number,
  stage: { width: number; height: number },
): void {
  const year = s.years.ready !== undefined ? String(s.years.ready) : strings.list.inProgress;
  const meta = r.tooltip(s.style, s.band !== null, year, s.complexityTotal);
  tip.innerHTML = `<b>${esc(s.title)}</b><small>${esc(meta)}</small>`;
  tip.hidden = false;
  tip.style.left = `${Math.min(stage.width - tip.offsetWidth - 8, x + 16)}px`;
  tip.style.top = `${Math.min(stage.height - tip.offsetHeight - 8, y + 16)}px`;
}
