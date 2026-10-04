import { describe, expect, it } from 'vitest';
import { barCount, peaks, resample } from '../src/domain/waveform';

describe('waveform', () => {
  it('peaks per bin across channels, normalised', () => {
    const l = Float32Array.from([0.1, -0.5, 0.2, 0.1]);
    const r = Float32Array.from([0, 0.2, -0.25, 0.05]);
    expect([...peaks([l, r], 2)]).toEqual([1, 0.5]);
  });
  it('handles silence and empty input', () => {
    expect([...peaks([new Float32Array(10)], 3)]).toEqual([0, 0, 0]);
    expect([...peaks([], 2)]).toEqual([0, 0]);
  });
  it('about one bar per 4 px, with a floor', () => {
    expect(barCount(400)).toBe(100);
    expect(barCount(10)).toBe(8);
  });
  it('resamples by max', () => {
    expect(resample(Float32Array.from([0.1, 0.9, 0.3, 0.4]), 2)).toEqual([
      expect.closeTo(0.9),
      expect.closeTo(0.4),
    ]);
    expect(resample(new Float32Array(0), 3)).toEqual([0, 0, 0]);
  });
});
