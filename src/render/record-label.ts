// The label in the centre of the record, a backlit dial: it spins with the disc, and its text is
// shrunk to stay inside the label circle (or left out when too small to read). Its paper and
// glow come from the backlight.
import type { Light } from '../domain/backlight';
import { labelLineSize, R_LABEL, type Transform, type YearRange } from '../domain/record-layout';
import { strings } from '../strings';
import { DISPLAY, letterSpacing, MONO } from './record';

type Ctx = CanvasRenderingContext2D;

/** One line of label text, fitted inside the label circle; false (nothing drawn) if too small. */
function fittedLine(
  ctx: Ctx,
  text: string,
  y: number,
  size: number,
  LR: number,
  font: (px: number) => string,
  spacing: number,
): boolean {
  ctx.font = font(size);
  letterSpacing(ctx, `${size * spacing}px`);
  const px = labelLineSize(y, size, LR, ctx.measureText(text).width);
  if (px === null) return false;
  ctx.font = font(px);
  letterSpacing(ctx, `${px * spacing}px`);
  ctx.fillText(text, 0, y);
  return true;
}

function labelText(ctx: Ctx, LR: number, range: YearRange, trackCount: number, light: Light): void {
  const fs = LR * 0.15;
  const r = strings.record;
  const { glow, sheen, hot } = light.colours;
  ctx.textAlign = 'center';
  ctx.save();
  ctx.shadowColor = `rgba(${glow.join(',')},.9)`;
  ctx.shadowBlur = Math.min(16, LR * 0.05) * light.lum;
  ctx.fillStyle = hot;
  fittedLine(ctx, r.labelName, -LR * 0.2, fs * 1.4, LR, (px) => `500 ${px}px ${DISPLAY}`, 0.1);
  ctx.fillStyle = `rgba(${sheen.join(',')},.85)`;
  const small = (px: number): string => `500 ${px}px ${MONO}`;
  const side = fittedLine(
    ctx,
    r.labelSide(range.first, range.last),
    LR * 0.36,
    fs * 0.62,
    LR,
    small,
    0,
  );
  if (side) fittedLine(ctx, r.labelTracks(trackCount), LR * 0.56, fs * 0.62, LR, small, 0);
  else fittedLine(ctx, r.labelShort, LR * 0.42, fs * 0.62, LR, small, 0);
  ctx.restore();
  letterSpacing(ctx, '0px');
}

/** The centre label spins with the disc: lit paper, a glowing ring, name, side and count. */
export function drawCentreLabel(
  ctx: Ctx,
  t: Transform,
  phi: number,
  range: YearRange,
  trackCount: number,
  light: Light,
): void {
  const LR = R_LABEL * t.scale;
  const { paper, glow, sheen } = light.colours;
  const pl = Math.min(1, 0.25 + 0.6 * light.lum);
  ctx.save();
  ctx.translate(t.cx, t.cy);
  ctx.rotate(phi);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, LR);
  g.addColorStop(0, `rgb(${paper.map((v) => v * pl).join(',')})`);
  g.addColorStop(0.75, `rgb(${paper.map((v) => v * pl * 0.5).join(',')})`);
  g.addColorStop(1, '#0b0501');
  ctx.beginPath();
  ctx.arc(0, 0, LR, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.shadowColor = `rgba(${glow.join(',')},.9)`;
  ctx.shadowBlur = 8 * Math.min(2, LR / 75) * light.lum;
  ctx.beginPath();
  ctx.arc(0, 0, LR * 0.9, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${sheen.join(',')},.55)`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  labelText(ctx, LR, range, trackCount, light);
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(2.5, LR * 0.07), 0, Math.PI * 2);
  ctx.fillStyle = '#020101';
  ctx.fill();
  ctx.restore();
}
