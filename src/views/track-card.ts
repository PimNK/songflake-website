// The track card modal (CLAUDE.md §4.3), the console's player, wider: a display with the time's
// readout, the title (one line; a ticker on narrow cards), the level bars with the pins,
// the pin note and the turning snowflake at its right; under it previous · play / pause · next
// and the volume fader; the five cells below — the style and main-instrument pads of which are
// buttons that make their one option the whole filter and close the card (`pick`). There is
// no ✕: a click outside the card closes it.
// Swiping left / right on touch steps tracks. Below 1100 px the card has no keys: it ends above the
// bottom player, which is its transport (CSS), and focus goes round the card, the filter sheet and
// that player (`dock`). Focus is trapped while open and returned to the opener; page scroll is
// locked. Closing (Esc, backdrop) and prev/next go through the caller, which owns the state.
import type { Content } from '../content/load';
import type { ChoiceKind } from '../domain/filters';
import type { Song } from '../content/parse';
import { strings } from '../strings';
import { renderCardBody } from './card-body';
import { icon } from './html';
import { trapFocus } from './modal';
import { WIDE } from './page';
import type { Playback } from './playback';
import { NARROW } from './pin-markers';
import { emptyPlayer } from './player';
import { refitOnResize, setRun } from './ticker';
import { volumeFader } from './volume';

export interface CardHooks {
  close(): void;
  step(direction: -1 | 1): void;
  /** A press on the card's style or main-instrument pad: that option becomes the whole filter
   *  and the card closes onto the view behind it, which keeps its place. */
  pick(kind: ChoiceKind, id: string): void;
  /** Fills the play slot and the player body for a song with audio; returns a cleanup. */
  player(slots: PlayerSlots, song: Song, cue: number | null): () => void;
}

export interface PlayerSlots {
  /** Between the previous and next buttons: the round play / pause button goes here. */
  play: HTMLElement;
  /** In the display: the time's readout, the level bars with pins, the pin note. */
  body: HTMLElement;
}

export interface TrackCard {
  show(song: Song, cue: number | null): void;
  hide(): void;
}

const c = strings.card;
const p = strings.player;
const SWIPE_PX = 60;

/** `dock`: the filter sheet and the bottom player, the card's transport below 1100 px. */
export function mountTrackCard(
  content: Content,
  playback: Playback,
  hooks: CardHooks,
  dock: HTMLElement[],
): TrackCard {
  const modal = createModal(playback);
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

  wireEvents(modal, sheet, hooks, dock);

  return {
    show(song, cue) {
      if (modal.hidden) opener = document.activeElement as HTMLElement | null;
      setRun(title, song.title, NARROW.matches);
      title.title = song.title; // one line on wide cards: the whole title on hover
      clearPlayer();
      if (song.audioSrc) disposePlayer = hooks.player(slots, song, cue);
      else {
        slots.play.innerHTML = `<button class="btn play" type="button" disabled aria-label="${p.play}">${icon('play')}</button>`;
        slots.body.innerHTML = emptyPlayer();
      }
      renderCardBody(grid, flake, song, content.taxonomy);
      present(modal, sheet);
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

/** Shows the card and locks the page's scroll. A card that opens starts at the top, focus on it. */
function present(modal: HTMLElement, sheet: HTMLElement): void {
  const opening = modal.hidden;
  modal.hidden = false;
  document.body.classList.add('locked');
  if (!opening) return;
  sheet.scrollTop = 0;
  sheet.focus({ preventScroll: true });
}

/** The card's frame, once for the page: the display, the keys with the volume, the cells. */
function createModal(playback: Playback): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  // Below 1100 px the bottom player stays usable beside the card: it is not a modal window there.
  const modalWide = (): void => modal.setAttribute('aria-modal', String(WIDE.matches));
  modalWide();
  WIDE.addEventListener('change', modalWide);
  modal.setAttribute('aria-labelledby', 'card-title');
  modal.innerHTML = `
    <article class="sheet panel" tabindex="-1">
      <section class="mtop" aria-label="${p.label}">
        <div class="vfd mscreen">
          <h2 class="mtitle" id="card-title"></h2>
          <div class="player-body"></div>
          <div class="mflake flake-clip" aria-hidden="true"></div>
        </div>
        <div class="mtransport">
          <button class="btn k" type="button" data-step="-1" aria-label="${c.prev}">${icon('prev')}</button>
          <div class="play-slot"></div>
          <button class="btn k" type="button" data-step="1" aria-label="${c.next}">${icon('next')}</button>
        </div>
      </section>
      <div class="mgrid"></div>
    </article>`;
  modal.querySelector('.mtransport')!.append(volumeFader(playback));
  // The title runs as a ticker on narrow cards only: refitted when its width changes.
  refitOnResize(modal.querySelector<HTMLElement>('#card-title')!, () => NARROW.matches);
  document.body.append(modal);
  return modal;
}

/**
 * Touch: a mostly horizontal swipe of at least SWIPE_PX steps tracks — left for the next one,
 * right for the previous, as in a music player. Swipes that start on the waveform (it seeks), a
 * pin or a style / instrument pad (a tap picks) are not steps.
 */
function wireSwipe(sheet: HTMLElement, hooks: CardHooks): void {
  let start: { x: number; y: number } | null = null;
  sheet.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      const onControl = (e.target as HTMLElement).closest('.wave, .pin, input, [data-pick]');
      start = t && e.touches.length === 1 && !onControl ? { x: t.clientX, y: t.clientY } : null;
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

function wireEvents(
  modal: HTMLElement,
  sheet: HTMLElement,
  hooks: CardHooks,
  dock: HTMLElement[],
): void {
  wireSwipe(sheet, hooks);
  modal.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t === modal) hooks.close();
    else {
      const pick = t.closest<HTMLElement>('[data-pick]');
      if (pick) hooks.pick(pick.dataset.pick as ChoiceKind, pick.dataset.id!);
      else {
        const step = t.closest<HTMLElement>('[data-step]');
        if (step) hooks.step(Number(step.dataset.step) as -1 | 1);
      }
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
    else if (e.key === 'Tab') {
      if (WIDE.matches) trapFocus(e, sheet);
      else trapFocus(e, sheet, ...dock);
    }
  });
}
