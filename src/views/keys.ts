// The page's playback keys: Space plays / pauses, ↑ / ↓ turn the volume up / down, ← / → go to the
// previous / next track (an open card steps itself: views/track-card.ts). They leave alone text
// fields, modified keys, and controls with keys of their own — buttons and links (Space presses
// them), sliders, faders and knobs (the arrows move them) — when those were reached by the
// keyboard. A control that only holds the focus after a click does not keep the keys, except that
// ← / → always stay with a fader or knob that has the focus.
import type { Playback } from './playback';
import { setVolume } from './volume';

const VOLUME_STEP = 0.05;

const TYPING =
  'input:not([type="range"], [type="checkbox"], [type="radio"]), textarea, select, [contenteditable]';
const OWN_KEYS = 'button, a[href], input, [role="slider"], [tabindex]:not([tabindex="-1"])';

/** Whether the focus last moved by the keyboard (Tab) rather than by a press. */
let byKeyboard = false;

const SLIDER = 'input[type="range"], [role="slider"]';

const keepsKeys = (t: Element): boolean =>
  !!t.closest(TYPING) || (byKeyboard && !!t.closest(OWN_KEYS));

export interface KeyHooks {
  /** What Space plays or pauses (main.ts owns the state it reads). */
  playPause(): void;
  /** The previous / next track; main.ts leaves it to an open card. */
  skip(direction: -1 | 1): void;
}

export function wireKeys(playback: Playback, hooks: KeyHooks): void {
  document.addEventListener('pointerdown', () => (byKeyboard = false), true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') byKeyboard = true;
    if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
    if (keepsKeys(e.target as Element)) return;
    if (document.querySelector('.hints')) return;
    const arrow = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    if (arrow && (e.target as Element).closest(SLIDER)) return;
    if (e.key === ' ') {
      if (e.repeat) return;
      hooks.playPause();
    } else if (arrow) {
      if (e.repeat) return;
      hooks.skip(arrow);
    } else if (e.key === 'ArrowUp') setVolume(playback, playback.volume + VOLUME_STEP);
    else if (e.key === 'ArrowDown') setVolume(playback, playback.volume - VOLUME_STEP);
    else return;
    e.preventDefault();
  });
}
