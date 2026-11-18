// The card's Years cell (idea → recording): a scale with three stations hanging from it as
// icicles — idea at the start, concept in the middle, ready at the end — and the part already
// reached lit (CLAUDE.md §4.3). Pure.
import type { Song } from '../content/parse';

export interface Station {
  key: 'idea' | 'concept' | 'ready';
  year: number | null;
  /** Where on the scale it sits, 0–1. */
  at: number;
}

export function timeline(years: Song['years']): {
  stations: Station[];
  /** How much of the scale is lit, 0–1: up to the last station reached. */
  lit: number;
} {
  const concept = years.concept ?? null;
  const ready = years.ready ?? null;
  return {
    stations: [
      { key: 'idea', year: years.idea, at: 0 },
      { key: 'concept', year: concept, at: 0.5 },
      { key: 'ready', year: ready, at: 1 },
    ],
    lit: ready !== null ? 1 : concept !== null ? 0.5 : 0,
  };
}
