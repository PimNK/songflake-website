import { describe, expect, it } from 'vitest';
import { nearestThumb, valueAt } from '../src/domain/fader';

describe('nearestThumb', () => {
  it('takes the only thumb of a one-thumb fader', () => {
    expect(nearestThumb([40], 90)).toBe(0);
  });
  it('takes the nearer of two thumbs', () => {
    expect(nearestThumb([5, 15], 7)).toBe(0);
    expect(nearestThumb([5, 15], 12)).toBe(1);
  });
  it('takes the lower thumb at the midpoint', () => {
    expect(nearestThumb([5, 15], 10)).toBe(0);
  });
  it('decides equal thumbs by the side of the press', () => {
    expect(nearestThumb([9, 9], 6)).toBe(0);
    expect(nearestThumb([9, 9], 12)).toBe(1);
    expect(nearestThumb([9, 9], 9)).toBeNull();
  });
});

describe('valueAt', () => {
  it('maps the travel onto the range', () => {
    expect(valueAt(0, 5, 15, 1)).toBe(5);
    expect(valueAt(1, 5, 15, 1)).toBe(15);
    expect(valueAt(0.5, 5, 15, 1)).toBe(10);
  });
  it('snaps to the step', () => {
    expect(valueAt(0.33, 0, 100, 10)).toBe(30);
    expect(valueAt(0.26, 5, 15, 1)).toBe(8);
  });
  it('clamps outside the travel', () => {
    expect(valueAt(-0.4, 2010, 2024, 1)).toBe(2010);
    expect(valueAt(1.7, 2010, 2024, 1)).toBe(2024);
  });
});
