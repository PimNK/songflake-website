import { describe, expect, it } from 'vitest';
import { levelsOf, resample } from '../src/domain/levels';

describe('levelsOf', () => {
  it('gives nothing for no samples', () => {
    expect(levelsOf([], 4)).toEqual([]);
    expect(levelsOf([new Float32Array(0)], 4)).toEqual([]);
  });
  it('scales the loudest stretch to 1', () => {
    const quiet = Array.from({ length: 100 }, (_, i) => (i % 2 ? 0.25 : -0.25));
    const loud = Array.from({ length: 100 }, (_, i) => (i % 2 ? 0.5 : -0.5));
    const levels = levelsOf([[...quiet, ...loud]], 2);
    expect(levels[1]).toBeCloseTo(1);
    expect(levels[0]).toBeCloseTo(0.5);
  });
  it('averages the channels', () => {
    const a = [1, 1, 0, 0];
    const b = [1, 1, 0, 0];
    expect(levelsOf([a, b], 2)).toEqual([1, 0]);
  });
  it('gives zeros for silence', () => {
    expect(levelsOf([new Float32Array(10)], 3)).toEqual([0, 0, 0]);
  });
});

describe('resample', () => {
  it('takes the loudest level a bar covers when squeezing', () => {
    expect(resample([0.1, 0.9, 0.2, 0.4], 2)).toEqual([0.9, 0.4]);
  });
  it('repeats levels when stretching', () => {
    expect(resample([0.2, 0.8], 4)).toEqual([0.2, 0.2, 0.8, 0.8]);
  });
  it('gives nothing for no levels', () => {
    expect(resample([], 5)).toEqual([]);
  });
});
