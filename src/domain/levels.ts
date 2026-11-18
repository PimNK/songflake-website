// The loudness of a recording along its length (CLAUDE.md §4.6), for the level bars of the
// progress lines. Pure: the caller decodes the audio and passes its channels; drawing is
// render/levels.ts.

/** How many levels are kept per recording; the bars are resampled from these. */
export const LEVEL_COUNT = 600;

/** Samples read per bucket at most: enough for a steady RMS, fast on long recordings. */
const SAMPLES_PER_BUCKET = 2048;

/**
 * The RMS loudness of `count` equal stretches of the recording, averaged over the channels and
 * scaled so the loudest is 1. Silence (or no samples) gives zeros.
 */
export function levelsOf(channels: readonly ArrayLike<number>[], count = LEVEL_COUNT): number[] {
  const length = channels[0]?.length ?? 0;
  if (!length || count < 1) return [];
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const from = Math.floor((i * length) / count);
    const to = Math.max(from + 1, Math.floor(((i + 1) * length) / count));
    const step = Math.max(1, Math.floor((to - from) / SAMPLES_PER_BUCKET));
    let sum = 0;
    let n = 0;
    for (const ch of channels) {
      for (let j = from; j < to && j < length; j += step) {
        const v = ch[j]!;
        sum += v * v;
        n++;
      }
    }
    out.push(n ? Math.sqrt(sum / n) : 0);
  }
  const top = Math.max(...out);
  return top > 0 ? out.map((v) => v / top) : out.map(() => 0);
}

/** `levels` squeezed or stretched to `count` bars; each bar takes the loudest level it covers. */
export function resample(levels: readonly number[], count: number): number[] {
  if (!levels.length || count < 1) return [];
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const from = Math.floor((i * levels.length) / count);
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / count));
    let top = 0;
    for (let j = from; j < to; j++) top = Math.max(top, levels[j]!);
    out.push(top);
  }
  return out;
}
