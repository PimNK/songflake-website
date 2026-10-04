// Deterministic "randomness" seeded by a song's slug, so anything random-looking is stable.
// Pure. Port of `hash`/`rng` from the mockup.

/** FNV-1a hash of a string → a number in [0, 1). */
export function hash01(text: string): number {
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100003) / 100003;
}

/** Xorshift generator seeded from a number in [0, 1); returns values in [0, 1). */
export function rng(seed: number): () => number {
  let a = Math.floor(seed * 4294967295) >>> 0 || 1;
  return () => {
    a ^= a << 13;
    a >>>= 0;
    a ^= a >> 17;
    a ^= a << 5;
    a >>>= 0;
    return a / 4294967296;
  };
}
