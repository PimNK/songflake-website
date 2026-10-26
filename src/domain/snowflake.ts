// Song → snowflake parameters: the whole mapping of CLAUDE.md §5.1, in one place. Pure.
// Lengths are fractions of the flake radius R; render/snowflake.ts multiplies them out.
import type { Song } from '../content/parse';
import type { Taxonomy } from '../content/taxonomy';
import { COMPLEXITY_MAX } from './filters';
import { rayColours } from './ray-colours';
import { hash01 } from './seed';

export type Level = 1 | 2 | 3;

export interface SnowflakeParams {
  /** structure 1/2/3 → 4/6/8 rays, the first pointing up. */
  rays: 4 | 6 | 8;
  /** rhythm 1/2/3 → forks at the tip: none / one / one that forks again. */
  forkDepth: 0 | 1 | 2;
  /** Main ray length; shorter when the forks are deeper so they fit. */
  rayLength: number;
  /** First fork length, as a fraction of R. Each deeper fork is `FORK_SCALE` of the previous. */
  forkLength: number;
  /** melody 1/2/3 → wave amplitude (fraction of R) and number of periods along the ray. */
  waveAmplitude: number;
  wavePeriods: number;
  /** technique 1/2/3 → offshoots from mid-ray: none / two / two that branch outward. */
  offshoots: 0 | 1 | 2;
  /** instruments 1/2/3 → inner polygon rings. */
  rings: Level;
  /** Recorded with a band → dashed halo. */
  halo: boolean;
}

export const FORK_SPREAD = 0.55; // rad, each side
export const FORK_SCALE = 0.62;
export const OFFSHOOT_ANGLE = 0.78; // rad from the local tangent
export const OFFSHOOT_LENGTH = 0.46; // × ray length
export const BRANCH_AT = 0.55; // along the offshoot
export const BRANCH_ANGLE = 0.8; // rad, turning outward
export const BRANCH_LENGTH = 0.5; // × offshoot length
export const HALO_RADIUS = 1.12;
export const RING_SPAN = 0.72;
export const RING_ALPHA = 0.35;
export const RAY_START = 0.05;

const RAY_LENGTH = [0.82, 0.58, 0.47] as const;
const WAVE_AMPLITUDE = [0, 0.035, 0.06] as const;
const WAVE_PERIODS = [0, 1.5, 2.5] as const;

export type SnowflakeInput = Pick<Song, 'complexity' | 'band'>;

export function snowflakeParams({ complexity: c, band }: SnowflakeInput): SnowflakeParams {
  const rayLength = RAY_LENGTH[c.rhythm - 1]!;
  return {
    rays: (c.structure * 2 + 2) as 4 | 6 | 8,
    forkDepth: (c.rhythm - 1) as 0 | 1 | 2,
    rayLength,
    forkLength: rayLength * 0.6,
    waveAmplitude: WAVE_AMPLITUDE[c.melody - 1]!,
    wavePeriods: WAVE_PERIODS[c.melody - 1]!,
    offshoots: (c.technique - 1) as 0 | 1 | 2,
    rings: c.instruments as Level,
    halo: band !== null,
  };
}

/** Every line has the same thin width, so the pattern does not clog at small sizes. */
export const lineWidth = (R: number): number => Math.max(0.6, 0.021 * R);
export const glowBlur = (R: number): number => Math.min(6, Math.max(1, 0.06 * R));
export const tipDotRadius = (R: number): number => Math.max(0.7, lineWidth(R) * 1.25);
export const centreDotRadius = (R: number): number => Math.max(1.4, 0.045 * R);

/** complexityTotal (5–15) → size factor, 1 at the middle total of 10. */
export const sizeFactor = (complexityTotal: number): number => (6 + complexityTotal) / 16;

/** Side of the canvas a static snowflake of radius `R` needs, halo and glow included (CSS px). */
export const paintedSize = (R: number): number => Math.ceil(R * 2.7 + 16);

/**
 * A list tile's snowflake: its radius for a tile radius, the largest tile canvas (`full`, the top
 * total) and this canvas as a share of it, so all tile snowflakes scale together with the tile.
 */
export function tileFlake(
  complexityTotal: number,
  tileRadius: number,
): { R: number; full: number; share: number } {
  const R = tileRadius * sizeFactor(complexityTotal);
  const full = paintedSize(tileRadius * sizeFactor(COMPLEXITY_MAX));
  return { R, full, share: paintedSize(R) / full };
}

/** Each snowflake turns slowly on its own, in rad/s; more rays turn a little faster. */
export const turnRate = (structure: number): number => 0.08 * (1 + structure * 0.3);

/** A snowflake's starting angle, seeded by the slug so neighbours do not turn in step. */
export const turnOffset = (slug: string): number => hash01(slug) * 6;

/** The snowflake's own angle after `time` seconds of turning. */
export const flakeTurn = (structure: number, time: number, offset: number): number =>
  time * turnRate(structure) + offset;

/** The same turn as a CSS animation: one full turn in `period` s, started `delay` s ago. */
export function turnTiming(song: Pick<Song, 'slug' | 'complexity'>): {
  period: number;
  delay: number;
} {
  const rate = turnRate(song.complexity.structure);
  return { period: (Math.PI * 2) / rate, delay: -turnOffset(song.slug) / rate };
}

export interface Flake {
  params: SnowflakeParams;
  /** One colour per ray. */
  colours: string[];
}

/** Everything the renderer needs for one song's snowflake. */
export function flakeOf(
  song: Pick<Song, 'complexity' | 'band' | 'accents'>,
  taxonomy: Taxonomy,
): Flake {
  const params = snowflakeParams(song);
  return { params, colours: rayColours(song, params.rays, taxonomy) };
}
