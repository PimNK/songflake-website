// The record stage's DOM around the canvas: the round play / pause button and the hover
// tooltip. Wiring only.
import type { Song } from '../content/parse';
import { strings } from '../strings';
import { esc } from './html';

const r = strings.record;

export const recordTemplate = (): string => `
  <canvas aria-label="${r.canvasLabel}"></canvas>
  <button class="spin" type="button"></button>
  <div class="tip" hidden></div>`;

export interface RecordControlHandlers {
  spinning(): boolean;
  toggleSpin(): void;
}

export function wireRecordControls(stage: HTMLElement, h: RecordControlHandlers): void {
  const spin = stage.querySelector<HTMLButtonElement>('.spin')!;
  const label = (): void => {
    const on = h.spinning();
    spin.textContent = on ? r.pauseGlyph : r.spinGlyph;
    spin.setAttribute('aria-label', on ? r.pause : r.spin);
  };
  label();
  spin.addEventListener('click', () => {
    h.toggleSpin();
    label();
  });
}

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
