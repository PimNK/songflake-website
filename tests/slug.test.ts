import { describe, expect, it } from 'vitest';
import { SLUG_PATTERN, slugify } from '../src/content/slug';

describe('slugify', () => {
  it.each([
    ['На луну', 'na-lunu'],
    ['Bésame', 'besame'],
    ["Frog's dancing", 'frogs-dancing'],
    ['Winter girl', 'winter-girl'],
    ['98', '98'],
    ['  Roll — across the sphere!  ', 'roll-across-the-sphere'],
    ['Печали', 'pechali'],
    ['Исаевы', 'isaevy'],
  ])('%s → %s', (title, slug) => {
    expect(slugify(title)).toBe(slug);
    expect(SLUG_PATTERN.test(slug)).toBe(true);
  });
});
