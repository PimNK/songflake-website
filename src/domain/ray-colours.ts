// Song → colour per ray (CLAUDE.md §5.2). Pure.
import type { Song } from '../content/parse';
import type { Taxonomy } from '../content/taxonomy';
import { mix } from './colour';

const WHITE = '#ffffff';
const FALLBACK = '#dfe8ff';

/**
 * Instruments take turns round the flake: ray i gets accents[i mod n]. When the rays do not
 * divide evenly the remainder falls to the first instruments, so the lead gets the extra one.
 */
export function rayColours(
  song: Pick<Song, 'accents'>,
  rays: number,
  taxonomy: Taxonomy,
): string[] {
  const colours = song.accents.map(
    (id) => taxonomy.accents.find((a) => a.id === id)?.colour ?? FALLBACK,
  );
  if (!colours.length) colours.push(FALLBACK);
  return Array.from({ length: rays }, (_, i) => colours[i % colours.length]!);
}

/**
 * Radial gradient stops from the centre: frost → ~45 % white at 0.3 R → pure from 0.72 R. `core`
 * replaces the white (the player's phosphor snowflake fades to the display's hottest colour).
 */
export function rayGradientStops(colour: string, core = WHITE): [offset: number, colour: string][] {
  return [
    [0, mix(colour, core, 0.88)],
    [0.3, mix(colour, core, 0.45)],
    [0.72, colour],
    [1, colour],
  ];
}

/** The gradient spans slightly past the flake radius so tips get the pure colour. */
export const GRADIENT_RADIUS = 1.02;

/** Rings are neutral frost, never instrument colours. */
export const FROST_LINE = FALLBACK;
