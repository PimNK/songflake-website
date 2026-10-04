import { describe, expect, it } from 'vitest';
import {
  clampPan,
  flakeRadius,
  placementYear,
  spinRate,
  nearAngle,
  R_MAX,
  R_MIN,
  ringStep,
  ringYears,
  sectors,
  solveLayout,
  toScreen,
  toWorld,
  transform,
  unwind,
  wind,
  yearRadius,
  yearRange,
  yearUnit,
  YEAR_BAND,
  zoomAt,
  type Viewport,
} from '../src/domain/record-layout';
import { song } from './fixtures';

const styles = ['Alternative', 'Progressive', 'Electronic', 'Ambient'];
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

describe('years and sectors', () => {
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

  it('sectors cover the circle in taxonomy order, with a minimum share', () => {
    const secs = sectors([...styles, 'Empty'], songs);
    expect(secs.map((s) => s.style)).toEqual([...styles, 'Empty']);
    expect(secs.at(-1)!.a1 - secs[0]!.a0).toBeCloseTo(Math.PI * 2);
    const width = (i: number) => secs[i]!.a1 - secs[i]!.a0;
    expect(width(4)).toBeGreaterThan(0.3); // empty style still gets a usable sector
    expect(width(0)).toBeGreaterThan(width(1));
    expect((secs[0]!.a0 + secs[0]!.a1) / 2).toBeCloseTo(-Math.PI / 2); // first centred on top
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
  const secs = sectors(styles, songs);
  const radius = 30;
  const placed = solveLayout(songs, secs, range, () => radius);

  it('places every song', () => expect(placed.size).toBe(songs.length));

  it('removes overlaps (within a small tolerance)', () => {
    const pts = [...placed.values()];
    let worst = Infinity;
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        worst = Math.min(worst, Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y));
    expect(worst).toBeGreaterThan(radius * 2 * 0.9);
  });

  it('keeps songs inside their sector and near their year', () => {
    for (const s of songs) {
      const p = placed.get(s.slug)!;
      const [r, u0] = unwind(p.x, p.y);
      const sec = secs.find((x) => x.style === s.style)!;
      const u = nearAngle(u0, (sec.a0 + sec.a1) / 2);
      expect(u).toBeGreaterThanOrEqual(sec.a0 - 1e-6);
      expect(u).toBeLessThanOrEqual(sec.a1 + 1e-6);
      const drift = Math.abs(r - yearRadius(s.years.ready!, range)) / yearUnit(range);
      expect(drift).toBeLessThanOrEqual(YEAR_BAND + 1e-6);
    }
  });

  it('is deterministic', () => {
    expect(solveLayout(songs, secs, range, () => radius)).toEqual(placed);
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

  it('pan is clamped so the disc stays reachable', () => {
    const atOne = clampPan({ ...v, panX: 1e6 }).panX;
    expect(atOne).toBeLessThan(150);
    expect(clampPan({ ...v, zoom: 4, panX: 1e6 }).panX).toBeGreaterThan(atOne);
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
