// "From idea to recording": three stations and the gaps between them (CLAUDE.md §4.3). Pure.
import type { Song } from '../content/parse';

export type StationFill = 'hollow' | 'half' | 'full';

export interface Station {
  key: 'idea' | 'concept' | 'ready';
  year: number | null;
  fill: StationFill;
}

export interface Gap {
  /** Years between the two stations, or null when one of them is missing. */
  years: number | null;
  /** Relative length of the connecting segment; a minimum for zero or unknown gaps. */
  grow: number;
}

export const MIN_GAP = 0.6;

export function timeline(years: Song['years']): { stations: Station[]; gaps: Gap[] } {
  const stations: Station[] = [
    { key: 'idea', year: years.idea, fill: 'hollow' },
    { key: 'concept', year: years.concept ?? null, fill: 'half' },
    { key: 'ready', year: years.ready ?? null, fill: 'full' },
  ];
  const gap = (a: number | null, b: number | null): Gap => {
    const d = a !== null && b !== null ? b - a : null;
    return { years: d, grow: Math.max(MIN_GAP, d ?? 0) };
  };
  // With no concept year, the idea → ready gap is shown on the second segment.
  const concept = stations[1]!.year;
  return {
    stations,
    gaps: [gap(years.idea, concept), gap(concept ?? years.idea, stations[2]!.year)],
  };
}
