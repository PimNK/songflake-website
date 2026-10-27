// The paper label in the centre of the record: it spins with the disc, and its text is shrunk
// to stay inside the label circle (or left out when too small to read).
import { labelLineSize, R_LABEL, type Transform, type YearRange } from '../domain/record-layout';
import { strings } from '../strings';
import { BODY, DISPLAY, letterSpacing } from './record';

type Ctx = CanvasRenderingContext2D;

/** One line of label text, fitted inside the label circle; false (nothing drawn) if too small. */
function fittedLine(
  ctx: Ctx,
  text: string,
  y: number,
  size: number,
  LR: number,
  font: (px: number) => string,
): boolean {
  ctx.font = font(size);
  letterSpacing(ctx, `${size * 0.1}px`);
  const px = labelLineSize(y, size, LR, ctx.measureText(text).width);
  if (px === null) return false;
  ctx.font = font(px);
  letterSpacing(ctx, `${px * 0.1}px`);
  ctx.fillText(text, 0, y);
  return true;
}

function labelText(ctx: Ctx, LR: number, range: YearRange, trackCount: number): void {
  const fs = LR * 0.15;
  const r = strings.record;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8eeff';
  fittedLine(ctx, r.labelName, -LR * 0.2, fs * 1.15, LR, (px) => `500 ${px}px ${DISPLAY}`);
  ctx.fillStyle = 'rgba(200,212,245,.8)';
  const small = (px: number): string => `400 ${px}px ${BODY}`;
  const side = fittedLine(
    ctx,
    r.labelSide(range.first, range.last),
    LR * 0.36,
    fs * 0.68,
    LR,
    small,
  );
  if (side) fittedLine(ctx, r.labelTracks(trackCount), LR * 0.52, fs * 0.68, LR, small);
  else fittedLine(ctx, r.labelShort, LR * 0.42, fs * 0.68, LR, small);
  letterSpacing(ctx, '0px');
}

/** The centre label spins with the disc: paper, ice ring, name, side and count. */
export function drawCentreLabel(
  ctx: Ctx,
  t: Transform,
  phi: number,
  range: YearRange,
  trackCount: number,
): void {
  const LR = R_LABEL * t.scale;
  ctx.save();
  ctx.translate(t.cx, t.cy);
  ctx.rotate(phi);
  const paper = ctx.createRadialGradient(0, 0, 0, 0, 0, LR);
  paper.addColorStop(0, '#1b2647');
  paper.addColorStop(1, '#131b35');
  ctx.beginPath();
  ctx.arc(0, 0, LR, 0, Math.PI * 2);
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, LR * 0.93, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(166,220,255,.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  labelText(ctx, LR, range, trackCount);
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(2.5, LR * 0.07), 0, Math.PI * 2);
  ctx.fillStyle = '#05070f';
  ctx.fill();
  ctx.restore();
}
