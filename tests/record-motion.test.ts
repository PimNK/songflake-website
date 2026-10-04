import { describe, expect, it } from 'vitest';
import type { Viewport } from '../src/domain/record-layout';
import { RecordMotion } from '../src/views/record-motion';

const vp: Viewport = { width: 1000, height: 800, zoom: 1, panX: 120, panY: -60, phi: 0 };

describe('RecordMotion', () => {
  it('spins unless reduced motion', () => {
    expect(new RecordMotion(false).step(vp, 1).phi).toBeCloseTo(0.03);
    const still = new RecordMotion(true);
    expect(still.busy).toBe(false);
    expect(still.step(vp, 1)).toEqual(vp);
  });

  it('eases zoom towards the target, independent of frame rate', () => {
    const a = new RecordMotion(true);
    a.spinning = false;
    const b = new RecordMotion(false);
    b.spinning = false;
    const m60 = new RecordMotion(false);
    m60.spinning = false;
    m60.zoomBy(vp, 2);
    b.zoomBy(vp, 2);
    let v60 = vp;
    for (let i = 0; i < 6; i++) v60 = m60.step(v60, 1 / 60);
    let v120 = vp;
    for (let i = 0; i < 12; i++) v120 = b.step(v120, 1 / 120);
    expect(v120.zoom).toBeCloseTo(v60.zoom, 5);
    expect(v60.zoom).toBeGreaterThan(1);
    expect(v60.zoom).toBeLessThan(2);
    a.zoomBy(vp, 2);
    expect(a.step(vp, 1 / 60).zoom).toBe(2); // reduced motion jumps
  });

  it('reset returns to ×1 and centre, then stops being busy', () => {
    const m = new RecordMotion(false);
    m.spinning = false;
    m.reset();
    let v = { ...vp, zoom: 3 };
    for (let i = 0; i < 300 && m.busy; i++) v = m.step(v, 1 / 60);
    expect(m.busy).toBe(false);
    expect(v).toMatchObject({ zoom: 1, panX: 0, panY: 0 });
  });
});
