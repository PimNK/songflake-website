// The track card modal (CLAUDE.md §4.3): title and ✕; the player laid out like the random player
// (previous · play / pause · next, then its caption and the waveform line), the turning snowflake
// beside it; the four cells below. Swiping left / right on touch steps tracks.
// Focus is trapped while open and returned to the opener; page scroll is locked.
// Closing (✕, Esc, backdrop) and prev/next go through the caller, which owns the state.
import type { Content } from '../content/load';
import type { Song } from '../content/parse';
import { strings } from '../strings';
import { renderCardBody } from './card-body';
import { SKIP_ICON } from './html';
import { trapFocus } from './modal';
import { emptyPlayer } from './player';

export interface CardHooks {
  close(): void;
  step(direction: -1 | 1): void;
  /** Fills the play slot and the player body for a song with audio; returns a cleanup. */
  player(slots: PlayerSlots, song: Song, cue: number | null): () => void;
}

export interface PlayerSlots {
  /** Between the previous and next buttons: the round play / pause button goes here. */
  play: HTMLElement;
  /** Beside and under the keys: the caption with the pin note, the waveform with pins, the time. */
  body: HTMLElement;
}

export interface TrackCard {
  show(song: Song, cue: number | null): void;
  hide(): void;
}

const c = strings.card;
const p = strings.player;
const SWIPE_PX = 60;

export function mountTrackCard(content: Content, hooks: CardHooks): TrackCard {
  const modal = createModal();
  const title = modal.querySelector<HTMLElement>('#card-title')!;
  const slots: PlayerSlots = {
    play: modal.querySelector<HTMLElement>('.play-slot')!,
    body: modal.querySelector<HTMLElement>('.player-body')!,
  };
  const grid = modal.querySelector<HTMLElement>('.mgrid')!;
  const flake = modal.querySelector<HTMLElement>('.mflake')!;
  const sheet = modal.querySelector<HTMLElement>('.sheet')!;
  let opener: HTMLElement | null = null;
  let disposePlayer: (() => void) | null = null;
  const clearPlayer = (): void => {
    disposePlayer?.();
    disposePlayer = null;
    slots.play.replaceChildren();
    slots.body.replaceChildren();
  };

  wireEvents(modal, sheet, hooks);

  return {
    show(song, cue) {
      if (modal.hidden) opener = document.activeElement as HTMLElement | null;
      title.textContent = song.title;
      title.title = song.title; // one line on wide cards: the whole title on hover
      clearPlayer();
      if (song.audioSrc) disposePlayer = hooks.player(slots, song, cue);
      else {
        slots.play.innerHTML = `<button class="play" type="button" disabled aria-label="${p.play}">${p.playGlyph}</button>`;
        slots.body.innerHTML = emptyPlayer();
      }
      renderCardBody(grid, flake, song, content.taxonomy, content.bands);
      const opening = modal.hidden;
      modal.hidden = false;
      document.body.classList.add('locked');
      if (opening) {
        sheet.scrollTop = 0;
        modal.querySelector<HTMLElement>('[data-close]')!.focus({ preventScroll: true });
      }
    },
    hide() {
      if (modal.hidden) return;
      modal.hidden = true;
      clearPlayer();
      document.body.classList.remove('locked');
      opener?.focus({ preventScroll: true });
      opener = null;
    },
  };
}

function createModal(): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'card-title');
  modal.innerHTML = `
    <article class="sheet">
      <header class="mhead">
        <h2 id="card-title"></h2>
        <div class="mnav">
          <button class="btn" type="button" data-close aria-label="${c.close}">✕</button>
        </div>
      </header>
      <div class="mtop">
        <section class="player-blk" aria-label="${p.label}">
          <div class="transport">
            <button class="nav" type="button" data-step="-1" aria-label="${c.prev}">${SKIP_ICON}</button>
            <div class="play-slot"></div>
            <button class="nav next" type="button" data-step="1" aria-label="${c.next}">${SKIP_ICON}</button>
          </div>
          <div class="player-body"></div>
        </section>
        <div class="mflake flake-clip" aria-hidden="true"></div>
      </div>
      <div class="mgrid"></div>
    </article>`;
  document.body.append(modal);
  return modal;
}

/**
 * Touch: a mostly horizontal swipe of at least SWIPE_PX steps tracks — left for the next one,
 * right for the previous, as in a music player. Swipes that start on the waveform seek instead.
 */
function wireSwipe(sheet: HTMLElement, hooks: CardHooks): void {
  let start: { x: number; y: number } | null = null;
  sheet.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      const onSeek = (e.target as HTMLElement).closest('.wave, .pin, input');
      start = t && e.touches.length === 1 && !onSeek ? { x: t.clientX, y: t.clientY } : null;
    },
    { passive: true },
  );
  sheet.addEventListener('touchcancel', () => (start = null));
  sheet.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    start = null;
    if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) hooks.step(dx < 0 ? 1 : -1);
  });
}

function wireEvents(modal: HTMLElement, sheet: HTMLElement, hooks: CardHooks): void {
  wireSwipe(sheet, hooks);
  modal.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t === modal) hooks.close();
    else if (t.closest('[data-close]')) hooks.close();
    else {
      const step = t.closest<HTMLElement>('[data-step]');
      if (step) hooks.step(Number(step.dataset.step) as -1 | 1);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    // Arrow shortcuts leave modified keys alone (Alt+← is the browser's Back).
    const typing =
      (e.target as HTMLElement).closest('input, textarea, [role="slider"]') ||
      e.altKey ||
      e.ctrlKey ||
      e.metaKey;
    if (e.key === 'Escape') hooks.close();
    else if (e.key === 'ArrowLeft' && !typing) hooks.step(-1);
    else if (e.key === 'ArrowRight' && !typing) hooks.step(1);
    else if (e.key === 'Tab') trapFocus(e, sheet);
  });
}
