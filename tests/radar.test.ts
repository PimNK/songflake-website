import { describe, expect, it } from 'vitest';
import { radarSvg } from '../src/render/radar';
import { sampleComplexity } from './fixtures';

describe('radarSvg', () => {
  const svg = radarSvg(sampleComplexity({ rhythm: 3, melody: 1 }), '#ff9100');

  it('draws grid rings at 1/2/3, five axes and the value polygon in the lead colour', () => {
    expect(svg.match(/class="radar-grid" points=/g)).toHaveLength(3);
    expect(svg.match(/<line class="radar-grid"/g)).toHaveLength(5);
    expect(svg).toContain('stroke="#ff9100"');
    expect(svg.match(/class="radar-dot"/g)).toHaveLength(5);
  });

  it('labels axes with values and describes itself', () => {
    expect(svg).toContain('aria-label="Complexity radar: Rhythm 3 of 3, Melody 1 of 3');
    expect(svg).toMatch(/Rhythm <tspan[^>]*>3<\/tspan>/);
  });
});

describe('record label strings', () => {
  it('plural uses the given form', async () => {
    const { strings } = await import('../src/strings');
    expect(strings.record.labelTracks(22)).toBe('22 TRACKS · 33⅓ RPM');
    expect(strings.record.labelTracks(1)).toBe('1 TRACK · 33⅓ RPM');
  });
});
