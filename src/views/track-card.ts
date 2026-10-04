// The track card modal (CLAUDE.md §4.3): title and ← → ✕, the player slot, the body.
// Focus is trapped while open and returned to the opener; page scroll is locked.
// Closing (✕, Esc, backdrop) and prev/next go through the caller, which owns the state.
import type { Content } from '../content/load';
import type { Song } from '../content/parse';
import { strings } from '../strings';
import { renderCardBody } from './card-body';

export interface CardHooks {
  close(): void;
  step(direction: -1 | 1): void;
  /** Fills the player slot for a song with audio; returns a cleanup function. */
  player(slot: HTMLElement, song: Song, cue: number | null): () => void;
}

export interface TrackCard {
  show(song: Song, cue: number | null): void;
  hide(): void;
}

const c = strings.card;
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function mountTrackCard(content: Content, hooks: CardHooks): TrackCard {
  const modal = createModal();
  const title = modal.querySelector<HTMLElement>('#card-title')!;
  const playerSlot = modal.querySelector<HTMLElement>('.player-blk')!;
  const body = modal.querySelector<HTMLElement>('.mgrid')!;
  const sheet = modal.querySelector<HTMLElement>('.sheet')!;
  let opener: HTMLElement | null = null;
  let disposePlayer: (() => void) | null = null;
  const clearPlayer = (): void => {
    disposePlayer?.();
    disposePlayer = null;
    playerSlot.replaceChildren();
  };

  wireEvents(modal, sheet, hooks);

  return {
    show(song, cue) {
      if (modal.hidden) opener = document.activeElement as HTMLElement | null;
      title.textContent = song.title;
      clearPlayer();
      if (song.audioSrc) disposePlayer = hooks.player(playerSlot, song, cue);
      else playerSlot.innerHTML = `<p class="no-audio">${strings.player.noAudio}</p>`;
      renderCardBody(body, song, content.taxonomy, content.bands);
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

function trapFocus(e: KeyboardEvent, root: HTMLElement): void {
  const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (x) => !(x as HTMLButtonElement).disabled && x.offsetParent !== null,
  );
  if (!items.length) return;
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !root.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || !root.contains(active))) {
    e.preventDefault();
    first.focus();
  }
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
          <button class="btn" type="button" data-step="-1" aria-label="${c.prev}">←</button>
          <button class="btn" type="button" data-step="1" aria-label="${c.next}">→</button>
          <button class="btn" type="button" data-close aria-label="${c.close}">✕</button>
        </div>
      </header>
      <section class="player-blk" aria-label="${strings.player.label}"></section>
      <div class="mgrid"></div>
    </article>`;
  document.body.append(modal);
  return modal;
}

function wireEvents(modal: HTMLElement, sheet: HTMLElement, hooks: CardHooks): void {
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
