import { describe, expect, it } from 'vitest';
import { atRest, easeAmp, scopeTarget } from '../src/domain/scope';

describe('oscilloscope swing', () => {
  it('swings fully while playing, a little when paused, not at all when unloaded', () => {
    expect(scopeTarget(true, true)).toBe(1);
    expect(scopeTarget(false, true)).toBe(0.28);
    expect(scopeTarget(false, false)).toBe(0);
  });

  it('eases towards the target and comes to rest', () => {
    let amp = 0;
    for (let i = 0; i < 200 && !atRest(amp, 1); i++) amp = easeAmp(amp, 1);
    expect(atRest(amp, 1)).toBe(true);
    expect(easeAmp(0, 1)).toBeCloseTo(0.08);
  });
});
