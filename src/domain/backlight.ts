// The console's backlight (CLAUDE.md §4.1): two knobs — brightness and tone, cold · neutral ·
// warm — set the page's lamp colours. Pure: knob positions (0–1) in, colours out; views/backlight.ts
// applies them to CSS and the canvases.
import { mix } from './colour';

type Triple = [number, number, number];

/** The lamp colours for one tone. Strings are "#rrggbb"; triples are rgb for canvas rgba(). */
export interface Backlight {
  /** Phosphor: display text, lit controls. */
  amber: string;
  /** The brightest phosphor: titles, the playhead. */
  hot: string;
  /** Main text. */
  cream: string;
  /** Small labels. */
  label: string;
  /** Unlit text and parts. */
  off: string;
  /** The glow. */
  glow: Triple;
  /** Light on the grooves, rings and the trace's graticule. */
  sheen: Triple;
  /** Main text as a triple (titles on the record). */
  creamRgb: Triple;
  /** The centre label's paper. */
  paper: Triple;
}

/** Cold (tone 0), neutral (0.5) and warm (1). */
const TONES: readonly Backlight[] = [
  {
    amber: '#8fd0ff',
    hot: '#e6f5ff',
    cream: '#dbe6ee',
    label: '#6d8ba3',
    off: '#46515b',
    glow: [70, 170, 255],
    sheen: [130, 200, 255],
    creamRgb: [219, 230, 238],
    paper: [12, 44, 86],
  },
  {
    amber: '#f1e8d8',
    hot: '#ffffff',
    cream: '#ece8e0',
    label: '#99948a',
    off: '#55524c',
    glow: [255, 240, 215],
    sheen: [255, 246, 230],
    creamRgb: [236, 232, 224],
    paper: [52, 46, 38],
  },
  {
    amber: '#ffb04a',
    hot: '#ffd9a0',
    cream: '#eedcc0',
    label: '#a98a62',
    off: '#5e5142',
    glow: [255, 150, 50],
    sheen: [255, 180, 96],
    creamRgb: [238, 220, 192],
    paper: [86, 44, 10],
  },
];

/** The light now: its strength and its colours. */
export interface Light {
  /** Strength of every glow, 0.12–1.88. */
  lum: number;
  colours: Backlight;
}

/** The knobs as they leave the workshop: a dim, cold light. */
export const DEFAULT_BRIGHTNESS = 0.471;
export const DEFAULT_TONE = 0.064;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));

/** Brightness knob (0–1) → the light's strength, a multiplier of every glow (0.12–1.88). */
export const luminance = (knob: number): number => 0.12 + clamp01(knob) * 1.76;

const mixTriple = (a: Triple, b: Triple, t: number): Triple =>
  a.map((v, i) => Math.round(v + (b[i]! - v) * t)) as Triple;

/** Tone knob (0–1) → the lamp colours, mixed between the two nearest tones. */
export function backlight(tone: number): Backlight {
  const w = clamp01(tone);
  const [a, b, t] = w < 0.5 ? [TONES[0]!, TONES[1]!, w * 2] : [TONES[1]!, TONES[2]!, w * 2 - 1];
  return {
    amber: mix(a.amber, b.amber, t),
    hot: mix(a.hot, b.hot, t),
    cream: mix(a.cream, b.cream, t),
    label: mix(a.label, b.label, t),
    off: mix(a.off, b.off, t),
    glow: mixTriple(a.glow, b.glow, t),
    sheen: mixTriple(a.sheen, b.sheen, t),
    creamRgb: mixTriple(a.creamRgb, b.creamRgb, t),
    paper: mixTriple(a.paper, b.paper, t),
  };
}

/** A knob's position after a step (keys, wheel) or a drag, kept within 0–1. */
export const turnKnob = (knob: number, delta: number): number => clamp01(knob + delta);
