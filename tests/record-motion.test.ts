import { describe, expect, it } from 'vitest';
import type { Viewport } from '../src/domain/record-layout';
import { RecordMotion } from '../src/views/record-motion';

const vp: Viewport = { width: 1000, height: 800, zoom: 1, panX: 0, panY: 0, phi: 0 };

describe('RecordMotion', () => {
  it('spins unless reduced motion', () => {
    const m = new RecordMotion(false);
    expect(m.step(vp, 1).phi).toBeCloseTo(0.03);
    expect(m.time).toBe(1);
    const still = new RecordMotion(true);
    expect(still.busy).toBe(false);
    expect(still.step(vp, 1)).toEqual(vp);
  });
});
