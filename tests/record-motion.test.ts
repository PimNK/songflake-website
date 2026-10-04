import { describe, expect, it } from 'vitest';
import type { Viewport } from '../src/domain/record-layout';
import { RecordMotion } from '../src/views/record-motion';

const vp: Viewport = { width: 1000, height: 800, zoom: 1, panX: 0, panY: 0, phi: 0 };

describe('RecordMotion', () => {
  it('spins unless reduced motion', () => {
    expect(new RecordMotion(false).step(vp, 1).phi).toBeCloseTo(0.03);
    const still = new RecordMotion(true);
    expect(still.busy).toBe(false);
    expect(still.step(vp, 1)).toEqual(vp);
  });

  it('pause stops the disc and the snowflakes’ own turn', () => {
    const m = new RecordMotion(false);
    m.step(vp, 2);
    m.spinning = false;
    expect(m.busy).toBe(false);
    expect(m.step(vp, 5)).toEqual(vp);
    expect(m.time).toBe(2);
  });
});
