// The backlight knobs (brightness, tone) and the light they set (CLAUDE.md §4.1): CSS custom
// properties on :root for the page, and the current light for the canvases (record, the
// oscilloscope traces, the player's phosphor snowflake), which subscribe to redraw. The knobs
// remember their position in this browser (best effort). Colour maths is in domain/backlight.ts.
import {
  backlight,
  DEFAULT_BRIGHTNESS,
  DEFAULT_TONE,
  luminance,
  turnKnob,
  type Light,
} from '../domain/backlight';
import { strings } from '../strings';

type Knob = 'brightness' | 'tone';

const KEY = (k: Knob): string => `songflake.${k}`;
const STEP = 0.05;
/** Drag distance in px for a full turn of a knob. */
const DRAG_PX = 140;

const read = (k: Knob, fallback: number): number => {
  try {
    const v = localStorage.getItem(KEY(k));
    return v === null ? fallback : turnKnob(Number(v), 0);
  } catch {
    return fallback;
  }
};

const store = (k: Knob, v: number): void => {
  try {
    localStorage.setItem(KEY(k), v.toFixed(3));
  } catch {
    // Storage blocked: the knob starts at its default next time.
  }
};

const knobs: Record<Knob, number> = {
  brightness: read('brightness', DEFAULT_BRIGHTNESS),
  tone: read('tone', DEFAULT_TONE),
};
let current: Light = { lum: 0, colours: backlight(0) };
const listeners = new Set<() => void>();

/** The light now. */
export const light = (): Light => current;

/** Called whenever a knob turns; returns an unsubscribe. */
export function onLight(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `rgba()` of a light triple, for canvases. */
export const glow = (rgb: readonly number[], alpha: number): string =>
  `rgba(${rgb.join(',')},${alpha})`;

function apply(): void {
  const lum = luminance(knobs.brightness);
  const colours = backlight(knobs.tone);
  current = { lum, colours };
  const root = document.documentElement.style;
  root.setProperty('--lum', lum.toFixed(3));
  for (const k of ['amber', 'hot', 'cream', 'label', 'off'] as const) {
    root.setProperty(`--${k}`, colours[k]);
  }
  root.setProperty('--g', colours.glow.join(' '));
  root.setProperty('--p', colours.paper.map((v) => Math.round(v * 0.6)).join(' '));
  for (const l of listeners) l();
}

/** Sets the page's light from the stored (or default) knobs; call once before rendering. */
export function startBacklight(): void {
  apply();
}

const SUN =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.6"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M13 3l-1.4 1.4M4.4 11.6L3 13"/></svg>';
const HALF =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" stroke="none"/></svg>';

const b = strings.backlight;

/** The two knobs, each with its icon: brightness, then tone (cold → warm). */
export function mountDials(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'dials';
  el.innerHTML = `
    <div class="dim">${SUN}<div class="dial" data-knob="brightness" role="slider" tabindex="0" aria-label="${b.brightness}" aria-valuemin="0" aria-valuemax="100"><i></i></div></div>
    <div class="dim">${HALF}<div class="dial tone" data-knob="tone" role="slider" tabindex="0" aria-label="${b.tone}" aria-valuemin="0" aria-valuemax="100"><i></i></div></div>`;
  for (const dial of el.querySelectorAll<HTMLElement>('.dial')) wireDial(dial);
  return el;
}

/** What a knob's position says: a percentage, or where the tone stands from cold to warm. */
const valueText = (k: Knob, v: number): string =>
  k === 'brightness'
    ? `${Math.round(v * 100)} %`
    : v < 1 / 3
      ? b.cold
      : v < 2 / 3
        ? b.neutral
        : b.warm;

/** A knob turns by dragging (up or right), the wheel, ← ↑ → ↓, Home and End. */
function wireDial(dial: HTMLElement): void {
  const k = dial.dataset.knob as Knob;
  const show = (): void => {
    dial.style.setProperty('--k', knobs[k].toFixed(3));
    dial.setAttribute('aria-valuenow', String(Math.round(knobs[k] * 100)));
    dial.setAttribute('aria-valuetext', valueText(k, knobs[k]));
  };
  const set = (v: number): void => {
    knobs[k] = turnKnob(v, 0);
    store(k, knobs[k]);
    show();
    apply();
  };
  let drag: { x: number; y: number; k: number } | null = null;
  dial.addEventListener('pointerdown', (e) => {
    e.preventDefault(); // a drag turns the knob, it never selects text
    drag = { x: e.clientX, y: e.clientY, k: knobs[k] };
    dial.setPointerCapture(e.pointerId);
  });
  dial.addEventListener('pointermove', (e) => {
    if (drag) set(drag.k + (drag.y - e.clientY + (e.clientX - drag.x)) / DRAG_PX);
  });
  dial.addEventListener('pointerup', () => (drag = null));
  dial.addEventListener('pointercancel', () => (drag = null));
  dial.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      set(knobs[k] - Math.sign(e.deltaY) * STEP);
    },
    { passive: false },
  );
  dial.addEventListener('keydown', (e) => {
    const d = { ArrowUp: STEP, ArrowRight: STEP, ArrowDown: -STEP, ArrowLeft: -STEP }[e.key];
    if (d !== undefined) set(knobs[k] + d);
    else if (e.key === 'Home') set(0);
    else if (e.key === 'End') set(1);
    else return;
    e.preventDefault();
  });
  show();
}
