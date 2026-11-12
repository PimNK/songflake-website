import { describe, expect, it } from 'vitest';
import { backlight, luminance, turnKnob } from '../src/domain/backlight';

describe('backlight', () => {
  it('tone 0, 0.5 and 1 give the cold, neutral and warm lamps', () => {
    expect(backlight(0).amber).toBe('#8fd0ff');
    expect(backlight(0.5).amber).toBe('#f1e8d8');
    expect(backlight(1).amber).toBe('#ffb04a');
    expect(backlight(1).glow).toEqual([255, 150, 50]);
  });

  it('mixes between the nearest two tones', () => {
    expect(backlight(0.25).glow).toEqual([163, 205, 235]);
    expect(backlight(0.75).hot).toBe('#ffecd0');
  });

  it('keeps knobs within 0–1, whatever comes in', () => {
    expect(backlight(-1)).toEqual(backlight(0));
    expect(backlight(Number.NaN)).toEqual(backlight(0));
    expect(turnKnob(0.98, 0.05)).toBe(1);
    expect(turnKnob(0.02, -0.05)).toBe(0);
  });

  it('brightness spans a dim to a strong light', () => {
    expect(luminance(0)).toBeCloseTo(0.12);
    expect(luminance(1)).toBeCloseTo(1.88);
    expect(luminance(2)).toBeCloseTo(1.88);
  });
});
