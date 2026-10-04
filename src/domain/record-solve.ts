// Placing the songs on the record (CLAUDE.md §5.3): each at its year, spread along the groove
// within its sector, then relaxed apart. Pure — geometry comes from domain/record-layout.ts.
import type { Song } from '../content/parse';
import {
  clamp,
  nearAngle,
  placementYear,
  wind,
  yearRadius,
  yearUnit,
  YEAR_DRIFT,
  type Sector,
  type YearRange,
} from './record-layout';

export interface Placement {
  x: number;
  y: number;
}

interface SolveNode {
  s: Song;
  sec: Sector;
  /** True radius (its year) and home spiral angle (its share of the sector). */
  rt: number;
  home: number;
  /** The radii a song may drift between: YEAR_DRIFT either side of its year. */
  lo: number;
  hi: number;
  r: number;
  u: number;
  cw: number;
}

/**
 * Songs of one style and year share the sector evenly: the k-th of n sits at (k + 1) / (n + 1)
 * of the way from the counterclockwise border, on the groove spiral, so a column of songs
 * repeats the shape of the sector's borders.
 */
function seedNodes(
  songs: readonly Song[],
  secs: readonly Sector[],
  range: YearRange,
  radiusOf: (song: Song) => number,
  drift: number,
): SolveNode[] {
  return secs.flatMap((sec) => {
    const own = songs.filter((s) => s.style === sec.style);
    const year = (s: Song): number => placementYear(s, range);
    return own.map((s) => {
      const peers = own
        .filter((o) => year(o) === year(s))
        .sort((a, b) => a.title.localeCompare(b.title) || a.slug.localeCompare(b.slug));
      const home = sec.a0 + ((sec.a1 - sec.a0) * (peers.indexOf(s) + 1)) / (peers.length + 1);
      const rt = yearRadius(year(s), range);
      const [lo, hi] = [rt - drift, rt + drift];
      return { s, sec, rt, home, lo, hi, r: rt, u: home, cw: radiusOf(s) };
    });
  });
}

/** Pushes two overlapping songs apart, mostly along the groove; the earlier goes counterclockwise. */
function separate(a: SolveNode, b: SolveNode): void {
  const [ax, ay] = wind(a.r, a.u);
  const [bx, by] = wind(b.r, b.u);
  const d = Math.max(1e-3, Math.hypot(bx - ax, by - ay));
  const overlap = a.cw + b.cw - d;
  if (overlap <= 0) return;
  const du = nearAngle(b.u - a.u, 0);
  const order =
    Math.abs(du) > 1e-4 ? Math.sign(du) : Math.sign(b.rt - a.rt || b.home - a.home || 1);
  // Steps are capped so a large overlap (a small stage) cannot fling a song round the disc.
  const step = Math.min(overlap / 2, 40);
  a.u -= (order * step) / a.r;
  b.u += (order * step) / b.r;
  const dr = ((b.r - a.r) / d) * step * 0.5;
  a.r = clamp(a.r - dr, a.lo, a.hi);
  b.r = clamp(b.r + dr, b.lo, b.hi);
}

/**
 * Each song sits at its year radius at its home angle in its sector; relaxation then moves
 * overlapping songs apart along the groove, letting them drift at most YEAR_DRIFT years.
 * `radiusOf` is the collision radius in world units (flake and title together).
 */
export function solveLayout(
  songs: readonly Song[],
  secs: readonly Sector[],
  range: YearRange,
  radiusOf: (song: Song) => number,
  iterations = 400,
): Map<string, Placement> {
  const drift = yearUnit(range) * YEAR_DRIFT;
  const nodes = seedNodes(songs, secs, range, radiusOf, drift);
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) separate(nodes[i]!, nodes[j]!);
    }
    for (const n of nodes) {
      n.u = nearAngle(n.u, (n.sec.a0 + n.sec.a1) / 2);
      n.u += (n.home - n.u) * 0.02;
      n.r += (n.rt - n.r) * 0.05;
      n.r = clamp(n.r, n.lo, n.hi);
      const margin = Math.min((n.cw * 1.05) / n.r, (n.sec.a1 - n.sec.a0) * 0.45);
      n.u = clamp(n.u, n.sec.a0 + margin, n.sec.a1 - margin);
    }
  }
  return new Map(
    nodes.map((n) => {
      const [x, y] = wind(n.r, n.u);
      return [n.s.slug, { x, y }];
    }),
  );
}
