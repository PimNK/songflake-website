// The volume fader beside the transport keys (the random player and the card, wide screens only;
// phones use their own volume keys). Every fader follows the one audio element, so moving one
// moves the others. The level is remembered in this browser (best effort).
import { strings } from '../strings';
import type { Playback } from './playback';

const KEY = 'songflake.volume';

const SPEAKER =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" stroke="none"/><path d="M10.5 5.6a3.4 3.4 0 0 1 0 4.8M12.6 3.6a6.2 6.2 0 0 1 0 8.8"/></svg>';

/** Sets the stored volume on the audio element; call once at start. */
export function restoreVolume(playback: Playback): void {
  try {
    const v = localStorage.getItem(KEY);
    if (v !== null && Number.isFinite(Number(v))) playback.volume = Number(v);
  } catch {
    // Storage blocked: full volume.
  }
}

/** A fader for the playback volume. */
export function volumeFader(playback: Playback): HTMLElement {
  const el = document.createElement('div');
  el.className = 'vol';
  el.innerHTML = `${SPEAKER}<div class="dual fader"><input type="range" min="0" max="100" step="1" aria-label="${strings.player.volume}"></div>`;
  const input = el.querySelector('input')!;
  const show = (): void => {
    const v = playback.volume;
    input.value = String(Math.round(v * 100));
    input.parentElement!.style.setProperty('--hi', String(v));
  };
  input.addEventListener('input', () => {
    playback.volume = Number(input.value) / 100;
    try {
      localStorage.setItem(KEY, playback.volume.toFixed(2));
    } catch {
      // Storage blocked: the level is not kept.
    }
  });
  show();
  // Faders live for the page's lifetime: the subscription is never released.
  playback.subscribe(show);
  return el;
}
