// The record's controls: the canvas with its hover tooltip, and the Play / Pause segment in the
// page's bar. Wiring only.
import type { Song } from '../content/parse';
import { strings } from '../strings';
import { esc } from './html';

const r = strings.record;

export const recordTemplate = (): string => `
  <canvas aria-label="${r.canvasLabel}"></canvas>
  <div class="tip" hidden></div>`;

export interface RecordControlHandlers {
  spinning(): boolean;
  toggleSpin(): void;
}

/** Fills the Play / Pause segment; the pressed half shows whether the record spins. */
export function wireRecordControls(segment: HTMLElement, h: RecordControlHandlers): void {
  const half = (spin: string, glyph: string, word: string): string =>
    `<button type="button" data-spin="${spin}" aria-label="${word}">${glyph}<span class="word"> ${word}</span></button>`;
  segment.innerHTML =
    half('on', strings.player.playGlyph, r.play) + half('off', strings.player.pauseGlyph, r.pause);
  const buttons = [...segment.querySelectorAll<HTMLButtonElement>('button')];
  const mark = (): void =>
    buttons.forEach((b) =>
      b.setAttribute('aria-pressed', String((b.dataset.spin === 'on') === h.spinning())),
    );
  mark();
  for (const b of buttons) {
    b.addEventListener('click', () => {
      if ((b.dataset.spin === 'on') !== h.spinning()) h.toggleSpin();
      mark();
    });
  }
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
