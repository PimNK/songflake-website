// The star field behind the whole page: seeded, so it does not jump when redrawn.
import { rng } from '../domain/seed';

/** Draws the stars on a canvas of `width` × `height` CSS px, already scaled for the DPR. */
export function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const rand = rng(0.4217);
  ctx.clearRect(0, 0, width, height);
  for (let i = Math.round((width * height) / 2800); i > 0; i--) {
    const x = rand() * width;
    const y = rand() * height;
    const r = rand() * 1.1 + 0.2;
    ctx.fillStyle = `rgba(220,230,255,${rand() * 0.4 + 0.05})`;
    ctx.fillRect(x, y, r, r);
  }
}
