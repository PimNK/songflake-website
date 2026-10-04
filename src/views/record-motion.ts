// The record's motion state: the slow spin, started and stopped by the play / pause button.
// Under prefers-reduced-motion nothing moves on its own.
import { spinRate, type Viewport } from '../domain/record-layout';

export class RecordMotion {
  /** Seconds of spin so far; snowflakes turn with it. */
  time = 0;
  spinning: boolean;

  constructor(readonly reduced: boolean) {
    this.spinning = !reduced;
  }

  get busy(): boolean {
    return this.spinning;
  }

  /** Advance by dt seconds; returns the new viewport. */
  step(vp: Viewport, dt: number): Viewport {
    if (!this.spinning) return vp;
    this.time += dt;
    return { ...vp, phi: vp.phi + dt * spinRate(vp.zoom) };
  }
}
