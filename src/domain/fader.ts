// Pure fader maths (views/fader.ts wires it to the pointer): which thumb a press takes, and the
// value at a point of the travel.

/**
 * The index of the thumb a press at `v` takes: the nearest; with two thumbs on one value, the
 * lower one below it, the upper one above it, and null on it (the drag's direction decides).
 */
export function nearestThumb(values: readonly number[], v: number): number | null {
  if (values.length === 1) return 0;
  const [a, b] = values as [number, number];
  if (a === b) return v < a ? 0 : v > b ? 1 : null;
  return Math.abs(v - a) <= Math.abs(v - b) ? 0 : 1;
}

/** The value at fraction `f` (0–1, clamped) of the travel, snapped to `step` within min–max. */
export function valueAt(f: number, min: number, max: number, step: number): number {
  const s = step > 0 ? step : 1;
  const v = min + Math.round((Math.min(1, Math.max(0, f)) * (max - min)) / s) * s;
  return Math.min(max, Math.max(min, v));
}
