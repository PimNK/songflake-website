// The first-visit hints on wide screens (CLAUDE.md §4.1): three steps, each a glowing ring round
// a part of the page and a note beside it — the snowflakes, the random-track player, the
// filter block. They move on by themselves (not while the pointer is on the note), by Next, and
// end with Got it, Skip, Esc or a click elsewhere. Shown once per browser on their own
// (localStorage, best effort), and again whenever the About window closes.
import { strings } from '../strings';
import type { PageSlots } from './page';

const KEY = 'songflake.hints';
const STEP_MS = 6000;
const GAP = 16;
const h = strings.hints;

const seen = (): boolean => {
  try {
    return localStorage.getItem(KEY) === 'seen';
  } catch {
    return false;
  }
};

const markSeen = (): void => {
  try {
    localStorage.setItem(KEY, 'seen');
  } catch {
    // Storage blocked: the hints may show again next time.
  }
};

/** What a step rings, read when the step shows (and on resize); a round ring for the disc. */
type Target = () => { box: DOMRect; round: boolean };

const around =
  (el: HTMLElement): Target =>
  () => ({ box: el.getBoundingClientRect(), round: false });

/** The record disc (it fills the stage's shorter side), or the list when that is shown. */
const disc =
  (slots: PageSlots): Target =>
  () => {
    if (slots.stage.hidden) return around(slots.listView)();
    const r = slots.stage.getBoundingClientRect();
    const side = Math.min(r.width, r.height) * 0.94;
    const box = new DOMRect(r.x + (r.width - side) / 2, r.y + (r.height - side) / 2, side, side);
    return { box, round: true };
  };

const LAYER = `
  <div class="hint-ring"></div>
  <div class="hint-note" role="dialog" aria-label="${h.label}">
    <small class="hint-n"></small>
    <p aria-live="polite"></p>
    <div class="hint-keys">
      <button type="button" class="btn" data-skip>${h.skip}</button>
      <button type="button" class="btn hint-next" data-next></button>
    </div>
  </div>`;

/**
 * Rings the target; the note goes beside it — right if there is room, else left, else inside.
 * The disc's note sits inside the ring, under the label, so it covers no filters.
 */
function place(ring: HTMLElement, note: HTMLElement, target: Target): void {
  const { box, round } = target();
  Object.assign(ring.style, {
    borderRadius: round ? '50%' : '',
    left: `${box.left - 6}px`,
    top: `${box.top - 6}px`,
    width: `${box.width + 12}px`,
    height: `${box.height + 12}px`,
  });
  const w = note.offsetWidth;
  if (round) {
    Object.assign(note.style, {
      left: `${box.left + (box.width - w) / 2}px`,
      top: `${box.top + box.height * 0.64}px`,
    });
    return;
  }
  const left =
    box.right + GAP + w < innerWidth - GAP
      ? box.right + GAP
      : box.left - GAP - w > GAP
        ? box.left - GAP - w
        : box.left + (box.width - w) / 2;
  const mid = box.top + (box.height - note.offsetHeight) / 2;
  const top = Math.min(Math.max(GAP, mid), innerHeight - note.offsetHeight - GAP);
  Object.assign(note.style, { left: `${left}px`, top: `${top}px` });
}

/** The note's text for step `i`, with its entry animation restarted. */
function fill(note: HTMLElement, i: number, total: number): void {
  note.querySelector('.hint-n')!.textContent = h.step(i + 1, total);
  note.querySelector('p')!.textContent = h.steps[i] ?? '';
  note.querySelector('[data-next]')!.textContent = i === total - 1 ? h.done : h.next;
  note.classList.remove('in');
  void note.offsetWidth;
  note.classList.add('in');
}

/**
 * Starts the hints (snowflakes, player, filter block) unless the screen is narrow, they are
 * already showing, or — unless `again` — they were seen.
 */
export function startHints(slots: PageSlots, again = false): void {
  const wide = window.matchMedia('(min-width: 1100px) and (hover: hover)').matches;
  if (!wide || (!again && seen()) || document.querySelector('.hints')) return;
  const targets = [disc(slots), around(slots.player), around(slots.filterBlock)];
  const layer = document.createElement('div');
  layer.className = 'hints';
  layer.innerHTML = LAYER;
  document.body.append(layer);
  const ring = layer.querySelector<HTMLElement>('.hint-ring')!;
  const note = layer.querySelector<HTMLElement>('.hint-note')!;
  let step = 0;
  let timer = 0;
  let hovered = false;
  const replace = (): void => place(ring, note, targets[step]!);

  const show = (i: number): void => {
    step = i;
    fill(note, i, targets.length);
    replace();
    window.clearTimeout(timer);
    timer = window.setTimeout(tick, STEP_MS);
  };
  const forward = (): void => (step < targets.length - 1 ? show(step + 1) : end());

  function tick(): void {
    if (hovered) timer = window.setTimeout(tick, STEP_MS / 2);
    else forward();
  }

  function end(): void {
    window.clearTimeout(timer);
    markSeen();
    layer.remove();
    window.removeEventListener('resize', replace);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onOutside, true);
  }

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') end();
  };
  const onOutside = (e: PointerEvent): void => {
    if (!note.contains(e.target as Node)) end();
  };

  layer.querySelector('[data-next]')!.addEventListener('click', forward);
  layer.querySelector('[data-skip]')!.addEventListener('click', end);
  note.addEventListener('pointerenter', () => (hovered = true));
  note.addEventListener('pointerleave', () => (hovered = false));
  window.addEventListener('resize', replace);
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', onOutside, true);
  show(0);
}
