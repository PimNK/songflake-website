// Waveform bars from decoded audio (CLAUDE.md §4.6). Pure: numbers in, numbers out.

/** Peak amplitude per bin over all channels, normalised so the loudest bin is 1. */
export function peaks(channels: readonly Float32Array[], bins: number): Float32Array {
  const out = new Float32Array(Math.max(1, bins));
  const length = channels[0]?.length ?? 0;
  if (!length) return out;
  const size = length / out.length;
  for (let b = 0; b < out.length; b++) {
    const start = Math.floor(b * size);
    const end = Math.max(start + 1, Math.floor((b + 1) * size));
    let max = 0;
    for (const ch of channels) {
      for (let i = start; i < end && i < length; i++) {
        const v = Math.abs(ch[i]!);
        if (v > max) max = v;
      }
    }
    out[b] = max;
  }
  const top = out.reduce((m, v) => Math.max(m, v), 0);
  if (top > 0) for (let b = 0; b < out.length; b++) out[b]! /= top;
  return out;
}

/** About one bar per `pxPerBar` pixels. */
export const barCount = (widthPx: number, pxPerBar = 4): number =>
  Math.max(8, Math.floor(widthPx / pxPerBar));

/** Stored peaks → `bars` values (max per group), so one decode serves any width. */
export function resample(source: Float32Array, bars: number): number[] {
  if (!source.length) return Array(bars).fill(0);
  return Array.from({ length: bars }, (_, i) => {
    const start = Math.floor((i * source.length) / bars);
    const end = Math.max(start + 1, Math.floor(((i + 1) * source.length) / bars));
    let max = 0;
    for (let j = start; j < end && j < source.length; j++) max = Math.max(max, source[j]!);
    return max;
  });
}
