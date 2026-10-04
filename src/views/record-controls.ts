// The record stage's DOM around the canvas: hint, Pause/Spin, zoom buttons with the readout,
// and the hover tooltip. Wiring only.
import type { Song } from '../content/parse';
import { strings } from '../strings';
import { esc } from './html';

const r = strings.record;
const BUTTON_ZOOM = 1.6;

export const recordTemplate = (): string => `
  <canvas aria-label="${r.canvasLabel}"></canvas>
  <div class="hint">${r.hint}</div>
  <button class="btn pause" type="button"></button>
  <div class="zoom">
    <span class="zread"></span>
    <button class="btn" type="button" data-z="out" aria-label="${r.zoomOut}">−</button>
    <button class="btn" type="button" data-z="in" aria-label="${r.zoomIn}">+</button>
    <button class="btn" type="button" data-z="reset">${r.reset}</button>
  </div>
  <div class="tip" hidden></div>`;

export interface RecordControlHandlers {
  spinning(): boolean;
  toggleSpin(): void;
  /** Multiply the zoom target by `factor`. */
  zoom(factor: number): void;
  reset(): void;
}

export function wireRecordControls(stage: HTMLElement, h: RecordControlHandlers): void {
  const pause = stage.querySelector<HTMLButtonElement>('.pause')!;
  const label = (): void => {
    pause.textContent = h.spinning() ? r.pause : r.spin;
  };
  label();
  pause.addEventListener('click', () => {
    h.toggleSpin();
    label();
  });
  stage.querySelectorAll<HTMLButtonElement>('[data-z]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.z === 'in') h.zoom(BUTTON_ZOOM);
      else if (b.dataset.z === 'out') h.zoom(1 / BUTTON_ZOOM);
      else h.reset();
    }),
  );
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
