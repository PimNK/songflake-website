// The record's motion state: slow spin, eased button zoom and eased reset of the pan.
// Under prefers-reduced-motion nothing moves on its own and zoom/reset jump to their target.
import { spinRate, zoomAt, ZOOM_MAX, ZOOM_MIN, type Viewport } from '../domain/record-layout';

/** Easing rate per second: ≈ 20 % of the remaining distance per frame at 60 fps. */
const EASE = 13.4;

export class RecordMotion {
  /** Seconds of spin so far; snowflakes turn with it. */
  time = 0;
  spinning: boolean;
  private zoomTarget: number | null = null;
  private resetting = false;

  constructor(readonly reduced: boolean) {
    this.spinning = !reduced;
  }

  /** Start an eased zoom by `factor` from the current target (or zoom). */
  zoomBy(vp: Viewport, factor: number): void {
    const z = this.zoomTarget ?? vp.zoom;
    this.zoomTarget = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * factor));
  }

  reset(): void {
    this.zoomTarget = ZOOM_MIN;
    this.resetting = true;
  }

  /** Direct manipulation cancels eased motion. */
  interrupt(): void {
    this.zoomTarget = null;
    this.resetting = false;
  }

  get busy(): boolean {
    return this.spinning || this.zoomTarget !== null || this.resetting;
  }

  /** Advance by dt seconds; returns the new viewport. */
  step(vp: Viewport, dt: number): Viewport {
    if (this.zoomTarget !== null) {
      const k = 1 - Math.exp(-EASE * dt);
      const z = vp.zoom + (this.zoomTarget - vp.zoom) * k;
      const done = this.reduced || Math.abs(this.zoomTarget - z) < 0.004;
      vp = zoomAt(vp, done ? this.zoomTarget : z, vp.width / 2, vp.height / 2);
      if (done) this.zoomTarget = null;
    }
    if (this.resetting) {
      const k = this.reduced ? 0 : Math.exp(-EASE * dt);
      vp = { ...vp, panX: vp.panX * k, panY: vp.panY * k };
      if (Math.abs(vp.panX) + Math.abs(vp.panY) < 0.5 && this.zoomTarget === null) {
        vp = { ...vp, panX: 0, panY: 0 };
        this.resetting = false;
      }
    }
    if (this.spinning) {
      this.time += dt;
      vp = { ...vp, phi: vp.phi + dt * spinRate(vp.zoom) };
    }
    return vp;
  }
}
