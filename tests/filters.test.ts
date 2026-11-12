import { describe, expect, it } from 'vitest';
import {
  countOptions,
  defaultFilters,
  fromQuery,
  isDefault,
  matches,
  neighbour,
  playableNeighbour,
  setRange,
  setYears,
  toggle,
  toQuery,
} from '../src/domain/filters';
import { song, taxonomy } from './fixtures';

const years = { first: 2010, last: 2020 };
const space = { taxonomy, years };
const d = defaultFilters(space);

describe('filters (§4.2)', () => {
  const s = song({ style: 'Ambient', accents: ['Keys', 'Vox'] });

  it('default matches everything', () => expect(matches(s, d, years)).toBe(true));
  it('style', () =>
    expect(matches(s, { ...d, styles: toggle(d.styles, 'Ambient', false) }, years)).toBe(false));
  it('complexity range inclusive', () => {
    expect(matches(s, { ...d, min: 10, max: 10 }, years)).toBe(true);
    expect(matches(s, { ...d, min: 11 }, years)).toBe(false);
  });
  it('at least one checked instrument', () => {
    expect(matches(s, { ...d, accents: new Set(['Vox']) }, years)).toBe(true);
    expect(matches(s, { ...d, accents: new Set(['Guitar']) }, years)).toBe(false);
  });
  it('status', () => {
    const wip = song({ status: 'in-progress', years: { idea: 2020 } });
    expect(matches(wip, { ...d, inProgress: false }, years)).toBe(false);
    expect(matches(wip, { ...d, ready: false }, years)).toBe(true);
  });
  it('min can never exceed max', () => {
    expect(setRange({ ...d, max: 8 }, 'min', 12)).toMatchObject({ min: 12, max: 12 });
    expect(setRange({ ...d, min: 10 }, 'max', 7)).toMatchObject({ min: 7, max: 7 });
    expect(setRange(d, 'min', 2).min).toBe(5);
  });
  it('year range inclusive; in progress counts as the latest year', () => {
    expect(matches(s, { ...d, from: 2016, to: 2016 }, years)).toBe(true);
    expect(matches(s, { ...d, to: 2015 }, years)).toBe(false);
    const wip = song({ status: 'in-progress', years: { idea: 2012 } });
    expect(matches(wip, { ...d, from: 2020 }, years)).toBe(true);
    expect(matches(wip, { ...d, to: 2019 }, years)).toBe(false);
  });
  it('from never exceeds to, both stay inside the years', () => {
    expect(setYears({ ...d, to: 2012 }, 'from', 2015, years)).toMatchObject({
      from: 2015,
      to: 2015,
    });
    expect(setYears({ ...d, from: 2018 }, 'to', 2014, years)).toMatchObject({
      from: 2014,
      to: 2014,
    });
    expect(setYears(d, 'from', 1990, years).from).toBe(2010);
    expect(setYears(d, 'to', 2099, years).to).toBe(2020);
  });
  it('counts per option, zeros kept', () => {
    const c = countOptions([s, song({ style: 'Alternative', accents: ['Guitar'] })], taxonomy);
    expect(c.styles).toEqual({ Alternative: 1, Progressive: 0, Electronic: 0, Ambient: 1 });
    expect(c.accents).toMatchObject({ Keys: 1, Vox: 1, Guitar: 1, Bass: 0 });
    expect(c).toMatchObject({ ready: 2, inProgress: 0 });
  });
});

describe('filters ⇄ query (§4.5)', () => {
  it('default is empty', () => {
    expect(toQuery(d, space)).toEqual({});
    expect(isDefault(d, space)).toBe(true);
  });
  it('only differences, in taxonomy order', () => {
    const f = { ...d, styles: new Set(['Ambient', 'Progressive']), min: 9 };
    expect(toQuery(f, space)).toEqual({ style: 'Progressive,Ambient', min: '9' });
  });
  it('round-trips', () => {
    const f = {
      ...d,
      styles: new Set<string>(),
      accents: new Set(['Vox']),
      max: 12,
      from: 2013,
      ready: false,
    };
    const back = fromQuery(new URLSearchParams(toQuery(f, space)), space);
    expect(toQuery(back, space)).toEqual(toQuery(f, space));
    expect(back.styles.size).toBe(0);
    expect(back).toMatchObject({ from: 2013, to: 2020 });
  });
  it('ignores unknown status, lists and empty numbers', () => {
    const f = fromQuery(new URLSearchParams('status=bogus&listen=Sitar&min='), space);
    expect(isDefault(f, space)).toBe(true);
    const none = fromQuery(new URLSearchParams('status=none&style='), space);
    expect(none).toMatchObject({ ready: false, inProgress: false });
    expect(none.styles.size).toBe(0);
  });

  it('ignores unknown values', () => {
    const f = fromQuery(new URLSearchParams('style=Nope,Ambient&min=abc&x=1'), space);
    expect([...f.styles]).toEqual(['Ambient']);
    expect(f.min).toBe(5);
  });
});

describe('neighbour (card prev / next)', () => {
  const a = song({ style: 'Ambient' });
  const b = song({ style: 'Alternative' });
  const c = song({ style: 'Ambient' });
  const all = [a, b, c];
  it('walks the filtered order and wraps', () => {
    const f = { ...d, styles: new Set(['Ambient']) };
    expect(neighbour(all, f, years, a.slug, 1)).toBe(c.slug);
    expect(neighbour(all, f, years, c.slug, 1)).toBe(a.slug);
    expect(neighbour(all, f, years, a.slug, -1)).toBe(c.slug);
  });
  it('falls back to the full order when the open song is filtered out', () => {
    const f = { ...d, styles: new Set(['Ambient']) };
    expect(neighbour(all, f, years, b.slug, 1)).toBe(c.slug);
    expect(neighbour(all, d, years, 'missing', 1)).toBeNull();
  });
});

describe('playableNeighbour (auto-advance, card keys)', () => {
  const a = song({ style: 'Ambient' });
  const b = song({ style: 'Ambient' });
  const c = song({ style: 'Ambient' });
  const all = [a, b, c];
  it('skips tracks without a recording and wraps', () => {
    const playable = (s: typeof a) => s !== b;
    expect(playableNeighbour(all, d, years, a.slug, 1, playable)).toBe(c.slug);
    expect(playableNeighbour(all, d, years, c.slug, 1, playable)).toBe(a.slug);
  });
  it('steps back too, skipping tracks without a recording', () => {
    const playable = (s: typeof a) => s !== b;
    expect(playableNeighbour(all, d, years, c.slug, -1, playable)).toBe(a.slug);
    expect(playableNeighbour(all, d, years, a.slug, -1, playable)).toBe(c.slug);
  });
  it('is null when no other track can play', () => {
    expect(playableNeighbour(all, d, years, a.slug, 1, (s) => s === a)).toBeNull();
  });
});

describe('playableNeighbour with filters', () => {
  const a = song({ style: 'Ambient' });
  const b = song({ style: 'Alternative' });
  const c = song({ style: 'Ambient' });
  const all = [a, b, c];
  const ambient = { ...d, styles: new Set(['Ambient']) };
  it('follows the filtered order', () => {
    expect(playableNeighbour(all, ambient, years, a.slug, 1, () => true)).toBe(c.slug);
  });
  it('a filtered-out track continues through the full order', () => {
    expect(playableNeighbour(all, ambient, years, b.slug, 1, () => true)).toBe(c.slug);
  });
});
