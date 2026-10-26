// The record's motion state: the slow spin, always on. Under prefers-reduced-motion nothing
// moves on its own.
import { spinRate, type Viewport } from '../domain/record-layout';

export class RecordMotion {
  /** Seconds of spin so far; snowflakes turn with it. */
  time = 0;

  constructor(readonly reduced: boolean) {}

  get busy(): boolean {
    return !this.reduced;
  }

  /** Advance by dt seconds; returns the new viewport. */
  step(vp: Viewport, dt: number): Viewport {
    if (this.reduced) return vp;
    this.time += dt;
    return { ...vp, phi: vp.phi + dt * spinRate(vp.zoom) };
  }
}
