import { describe, expect, it } from 'vitest';
import { mix, rgba } from '../src/domain/colour';
import { rayColours, rayGradientStops } from '../src/domain/ray-colours';
import { hash01, rng } from '../src/domain/seed';
import {
  flakeOf,
  lineWidth,
  sampleComplexity,
  sizeFactor,
  snowflakeParams,
} from '../src/domain/snowflake';
import { song, taxonomy } from './fixtures';

describe('snowflakeParams (§5.1)', () => {
  const at = (axis: string, v: number) =>
    snowflakeParams({ complexity: sampleComplexity({ [axis]: v }), band: null });

  it('structure → 4 / 6 / 8 rays', () => {
    expect([1, 2, 3].map((v) => at('structure', v).rays)).toEqual([4, 6, 8]);
  });
  it('rhythm → fork depth and shorter rays', () => {
    expect([1, 2, 3].map((v) => at('rhythm', v).forkDepth)).toEqual([0, 1, 2]);
    expect([1, 2, 3].map((v) => at('rhythm', v).rayLength)).toEqual([0.82, 0.58, 0.47]);
  });
  it('melody → wave', () => {
    expect([1, 2, 3].map((v) => at('melody', v).waveAmplitude)).toEqual([0, 0.035, 0.06]);
    expect([1, 2, 3].map((v) => at('melody', v).wavePeriods)).toEqual([0, 1.5, 2.5]);
  });
  it('technique → offshoots, instruments → rings, band → halo', () => {
    expect([1, 2, 3].map((v) => at('technique', v).offshoots)).toEqual([0, 1, 2]);
    expect([1, 2, 3].map((v) => at('instruments', v).rings)).toEqual([1, 2, 3]);
    expect(snowflakeParams({ complexity: sampleComplexity(), band: '' }).halo).toBe(true);
    expect(snowflakeParams({ complexity: sampleComplexity(), band: null }).halo).toBe(false);
  });
  it('is a pure function of the data', () => {
    const s = song();
    expect(snowflakeParams(s)).toEqual(snowflakeParams({ ...s }));
  });
  it('thin line width with a floor; size grows with total', () => {
    expect(lineWidth(10)).toBe(0.6);
    expect(lineWidth(100)).toBeCloseTo(2.1);
    expect(sizeFactor(10)).toBe(1);
    expect(sizeFactor(15)).toBeGreaterThan(sizeFactor(5));
  });
});

describe('ray colours (§5.2)', () => {
  it('instruments take turns; the lead gets the extra ray', () => {
    const c = rayColours({ accents: ['Guitar', 'Vox', 'Keys'] }, 4, taxonomy);
    expect(c).toEqual(['#ff9100', '#00e5ff', '#d500f9', '#ff9100']);
    expect(rayColours({ accents: ['Keys'] }, 6, taxonomy)).toEqual(Array(6).fill('#d500f9'));
  });
  it('gradient runs from frosted white to the pure colour', () => {
    const stops = rayGradientStops('#ff0000');
    expect(stops[0]).toEqual([0, mix('#ff0000', '#ffffff', 0.88)]);
    expect(stops.at(-1)).toEqual([1, '#ff0000']);
    expect(stops[2]).toEqual([0.72, '#ff0000']);
  });
});

describe('colour and seed', () => {
  it('mixes and formats', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(rgba('#ff8000', 0.5)).toBe('rgba(255,128,0,0.5)');
  });
  it('seeds deterministically', () => {
    expect(hash01('destination')).toBe(hash01('destination'));
    expect(hash01('a')).not.toBe(hash01('b'));
    const a = rng(0.3);
    const b = rng(0.3);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('flakeOf', () => {
  it('one colour per ray, lead takes the extra ray', () => {
    const f = flakeOf(
      song({ accents: ['Vox', 'Keys'], complexity: sampleComplexity({ structure: 1 }) }),
      taxonomy,
    );
    expect(f.params.rays).toBe(4);
    expect(f.colours).toEqual(['#00e5ff', '#d500f9', '#00e5ff', '#d500f9']);
    const odd = flakeOf(song({ accents: ['Guitar', 'Vox', 'Keys'] }), taxonomy);
    expect(odd.colours.filter((c) => c === '#ff9100')).toHaveLength(2);
  });
});
