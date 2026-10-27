import { describe, expect, it } from 'vitest';
import {
  clampPan,
  collisionRadius,
  hitRadius,
  flakeRadius,
  placementYear,
  spinRate,
  nearAngle,
  R_MAX,
  R_MIN,
  ringStep,
  ringYears,
  toScreen,
  toWorld,
  transform,
  unwind,
  wind,
  yearRadius,
  yearRange,
  yearUnit,
  YEAR_DRIFT,
  zoomAt,
  rotateBy,
  visibleTitles,
  labelLineSize,
  fitScale,
  R_DISC,
  spreadAngle,
  GOLDEN_ANGLE,
  type Viewport,
} from '../src/domain/record-layout';
import { solveLayout } from '../src/domain/record-solve';
import { song } from './fixtures';

const songs = [
  ...Array.from({ length: 9 }, (_, i) =>
    song({ style: 'Alternative', years: { idea: 2010, ready: 2011 + (i % 4) } }),
  ),
  ...Array.from({ length: 7 }, (_, i) =>
    song({ style: 'Progressive', years: { idea: 2015, ready: 2015 + i } }),
  ),
  ...Array.from({ length: 4 }, () =>
    song({ style: 'Electronic', years: { idea: 2026, ready: 2026 } }),
  ),
  song({ style: 'Ambient', years: { idea: 2012, ready: 2012 } }),
];

describe('years', () => {
  it('year range and radius are linear between first and last', () => {
    const range = yearRange(songs);
    expect(range).toEqual({ first: 2011, last: 2026 });
    expect(yearRadius(2011, range)).toBe(R_MIN);
    expect(yearRadius(2026, range)).toBe(R_MAX);
  });

  it('in-progress songs sit at the latest year; no ready songs falls back to ideas', () => {
    const range = yearRange(songs);
    const wip = song({ status: 'in-progress', years: { idea: 2020 } });
    expect(placementYear(wip, range)).toBe(2026);
    expect(yearRange([wip])).toEqual({ first: 2020, last: 2020 });
    expect(yearRadius(2020, { first: 2020, last: 2020 })).toBe((R_MIN + R_MAX) / 2);
  });

  it('wind and unwind are inverses', () => {
    const [x, y] = wind(640, 0.4);
    const [r, u] = unwind(x, y);
    expect(r).toBeCloseTo(640);
    expect(nearAngle(u, 0.4)).toBeCloseTo(0.4);
  });
});

describe('solveLayout', () => {
  const range = yearRange(songs);
  const radius = 30;
  const placed = solveLayout(songs, range, () => radius);
  /** Screen angle of a placed song. */
  const angleOf = (slug: string, res = placed): number => {
    const p = res.get(slug)!;
    return Math.atan2(p.y, p.x);
  };

  it('places every song', () => expect(placed.size).toBe(songs.length));

  it('removes overlaps (within a small tolerance)', () => {
    const pts = [...placed.values()];
    let worst = Infinity;
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        worst = Math.min(worst, Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y));
    expect(worst).toBeGreaterThan(radius * 2 * 0.9);
  });

  it('keeps songs near their year', () => {
    for (const s of songs) {
      const [r] = unwind(placed.get(s.slug)!.x, placed.get(s.slug)!.y);
      const drift = Math.abs(r - yearRadius(s.years.ready!, range)) / yearUnit(range);
      expect(drift).toBeLessThanOrEqual(YEAR_DRIFT + 1e-6);
    }
  });

  it('spreads songs a golden angle apart in year order, the first at the top, at their exact year', () => {
    const one = { first: 2011, last: 2026 };
    const four = [2013, 2012, 2020, 2012].map((y, i) =>
      song({ slug: `s${i}`, title: `t${i}`, years: { idea: y, ready: y } }),
    );
    const res = solveLayout(four, one, () => 1);
    // year order: s1 (2012, t1), s3 (2012, t3), s0 (2013), s2 (2020)
    ['s1', 's3', 's0', 's2'].forEach((slug, k) => {
      expect(nearAngle(angleOf(slug, res), spreadAngle(k))).toBeCloseTo(spreadAngle(k));
      const p = res.get(slug)!;
      const y = four.find((x) => x.slug === slug)!.years.ready!;
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(yearRadius(y, one));
    });
    expect(spreadAngle(0)).toBeCloseTo(-Math.PI / 2);
    expect(spreadAngle(1) - spreadAngle(0)).toBeCloseTo(GOLDEN_ANGLE);
  });

  it('pays no attention to the style', () => {
    const restyled = songs.map((s, i) => ({ ...s, style: i % 2 ? 'Ambient' : 'Electronic' }));
    expect(solveLayout(restyled, range, () => radius)).toEqual(placed);
  });

  it('is deterministic', () => {
    expect(solveLayout(songs, range, () => radius)).toEqual(placed);
  });
});

describe('viewport', () => {
  const v: Viewport = { width: 1000, height: 800, zoom: 1, panX: 0, panY: 0, phi: 0.7 };

  it('screen ⇄ world round-trips with rotation', () => {
    const t = transform({ ...v, zoom: 2.5, panX: 40, panY: -30 });
    const [sx, sy] = toScreen(t, 123, -456);
    const [x, y] = toWorld(t, sx, sy);
    expect(x).toBeCloseTo(123);
    expect(y).toBeCloseTo(-456);
  });

  it('zoom keeps the anchor point fixed and clamps to ×1–×8', () => {
    const before = transform(v);
    const world = toWorld(before, 600, 300);
    const z = zoomAt(v, 3, 600, 300);
    const [sx, sy] = toScreen(transform(z), world[0], world[1]);
    expect(sx).toBeCloseTo(600);
    expect(sy).toBeCloseTo(300);
    expect(zoomAt(v, 20, 0, 0).zoom).toBe(8);
    expect(zoomAt(v, 0.2, 0, 0).zoom).toBe(1);
  });

  it('pan is clamped: none at ×1, more room when zoomed in', () => {
    expect(clampPan({ ...v, panX: 1e6 }).panX).toBe(0);
    expect(clampPan({ ...v, zoom: 4, panX: 1e6 }).panX).toBeGreaterThan(0);
  });

  it('dragging turns the disc by the angle swept round its centre', () => {
    const turned = rotateBy(v, 600, 400, 500, 500); // from right of centre to below it
    expect(turned.phi - v.phi).toBeCloseTo(Math.PI / 2);
    expect(turned.panX).toBe(v.panX);
    // across the ±π seam, the short way round
    expect(rotateBy(v, 400, 399, 400, 401).phi - v.phi).toBeCloseTo(-0.02, 3);
  });

  it('flakes grow slower than the map; spin slows when zoomed', () => {
    expect(flakeRadius(1, 1, 1)).toBe(16);
    expect(flakeRadius(1, 1, 8)).toBeCloseTo(16 * Math.pow(8, 0.45));
    expect(spinRate(1)).toBe(0.03);
    expect(spinRate(4)).toBeCloseTo(0.03 / 8);
  });

  it('ring step by zoom', () => {
    expect([1, 1.69, 1.7, 2.99, 3, 8].map(ringStep)).toEqual([5, 5, 3, 3, 1, 1]);
    expect(ringYears({ first: 2011, last: 2026 }, 5)).toEqual([2015, 2020, 2025]);
    expect(ringYears({ first: 2011, last: 2020 }, 3)).toEqual([2011, 2014, 2017, 2020]);
  });
});

describe('flake rules on the record', () => {
  it('collision radius covers the flake or half the title, whichever is larger', () => {
    expect(collisionRadius(20, 10, 0.5)).toBe((20 * 1.3 + 7) / 0.5);
    expect(collisionRadius(10, 60, 1)).toBeCloseTo(60 * 0.92 + 7);
  });
  it('hit radius', () => {
    expect(hitRadius(5)).toBe(12);
    expect(hitRadius(40)).toBe(44);
  });
});

describe('visibleTitles', () => {
  const at = (x: number, y: number) => ({
    box: { x, y: y + 22, w: 60, h: 12 },
    flake: { x, y, r: 20 },
  });
  it('keeps the first of two colliding titles and every title with room', () => {
    expect(visibleTitles([at(0, 0), at(30, 4), at(300, 0)])).toEqual([true, false, true]);
  });
  it('hides a title that would cover another snowflake', () => {
    expect(visibleTitles([at(0, 0), at(0, -40)])).toEqual([true, false]);
  });
});

describe('solveLayout on a small stage', () => {
  it('stays finite and inside the year band when the collision radii are huge', () => {
    const range = yearRange(songs);
    const placed = solveLayout(songs, range, () => 400);
    for (const s of songs) {
      const p = placed.get(s.slug)!;
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
      const drift = Math.abs(Math.hypot(p.x, p.y) - yearRadius(s.years.ready!, range));
      expect(drift / yearUnit(range)).toBeLessThanOrEqual(YEAR_DRIFT + 1e-6);
    }
  });
});

describe('centre label', () => {
  it('a label line keeps its size when it fits, shrinks to the chord, or is left out', () => {
    expect(labelLineSize(-20, 10, 100, 50)).toBe(10);
    const shrunk = labelLineSize(-20, 10, 100, 200)!;
    const chord = 2 * Math.sqrt(80 * 80 - 30 * 30);
    expect(shrunk).toBeCloseTo((10 * chord) / 200);
    expect(labelLineSize(-20, 10, 100, 4000)).toBeNull(); // under 5 px
    expect(labelLineSize(85, 10, 100, 10)).toBeNull(); // outside the inner circle
  });
});

describe('fitScale', () => {
  it('fits the disc inside the stage', () => {
    for (const [w, h] of [
      [1400, 900],
      [360, 680],
      [900, 900],
    ] as const) {
      expect(R_DISC * fitScale(w, h) + 16).toBeLessThanOrEqual(Math.min(w, h) / 2 + 1e-9);
    }
    expect(fitScale(10, 10)).toBeGreaterThan(0);
  });
});
