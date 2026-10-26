import { describe, expect, it } from 'vitest';
import {
  countOptions,
  defaultFilters,
  fromQuery,
  isDefault,
  matches,
  neighbour,
  nextPlayable,
  setRange,
  toggle,
  toQuery,
} from '../src/domain/filters';
import { song, taxonomy } from './fixtures';

const d = defaultFilters(taxonomy);

describe('filters (§4.2)', () => {
  const s = song({ style: 'Ambient', accents: ['Keys', 'Vox'], band: 'X' });

  it('default matches everything', () => expect(matches(s, d)).toBe(true));
  it('style', () =>
    expect(matches(s, { ...d, styles: toggle(d.styles, 'Ambient', false) })).toBe(false));
  it('complexity range inclusive', () => {
    expect(matches(s, { ...d, min: 10, max: 10 })).toBe(true);
    expect(matches(s, { ...d, min: 11 })).toBe(false);
  });
  it('at least one checked instrument', () => {
    expect(matches(s, { ...d, accents: new Set(['Vox']) })).toBe(true);
    expect(matches(s, { ...d, accents: new Set(['Guitar']) })).toBe(false);
  });
  it('status', () => {
    const wip = song({ status: 'in-progress', years: { idea: 2020 } });
    expect(matches(wip, { ...d, inProgress: false })).toBe(false);
    expect(matches(wip, { ...d, ready: false })).toBe(true);
  });
  it('min can never exceed max', () => {
    expect(setRange({ ...d, max: 8 }, 'min', 12)).toMatchObject({ min: 12, max: 12 });
    expect(setRange({ ...d, min: 10 }, 'max', 7)).toMatchObject({ min: 7, max: 7 });
    expect(setRange(d, 'min', 2).min).toBe(5);
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
    expect(toQuery(d, taxonomy)).toEqual({});
    expect(isDefault(d, taxonomy)).toBe(true);
  });
  it('only differences, in taxonomy order', () => {
    const f = { ...d, styles: new Set(['Ambient', 'Progressive']), min: 9 };
    expect(toQuery(f, taxonomy)).toEqual({ style: 'Progressive,Ambient', min: '9' });
  });
  it('round-trips', () => {
    const f = {
      ...d,
      styles: new Set<string>(),
      accents: new Set(['Vox']),
      max: 12,
      ready: false,
    };
    const back = fromQuery(new URLSearchParams(toQuery(f, taxonomy)), taxonomy);
    expect(toQuery(back, taxonomy)).toEqual(toQuery(f, taxonomy));
    expect(back.styles.size).toBe(0);
  });
  it('ignores unknown status, lists and empty numbers', () => {
    const f = fromQuery(new URLSearchParams('status=bogus&listen=Sitar&min='), taxonomy);
    expect(isDefault(f, taxonomy)).toBe(true);
    const none = fromQuery(new URLSearchParams('status=none&style='), taxonomy);
    expect(none).toMatchObject({ ready: false, inProgress: false });
    expect(none.styles.size).toBe(0);
  });

  it('ignores unknown values', () => {
    const f = fromQuery(new URLSearchParams('style=Nope,Ambient&min=abc&x=1'), taxonomy);
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
    expect(neighbour(all, f, a.slug, 1)).toBe(c.slug);
    expect(neighbour(all, f, c.slug, 1)).toBe(a.slug);
    expect(neighbour(all, f, a.slug, -1)).toBe(c.slug);
  });
  it('falls back to the full order when the open song is filtered out', () => {
    const f = { ...d, styles: new Set(['Ambient']) };
    expect(neighbour(all, f, b.slug, 1)).toBe(c.slug);
    expect(neighbour(all, d, 'missing', 1)).toBeNull();
  });
});

describe('nextPlayable (auto-advance)', () => {
  const a = song({ style: 'Ambient' });
  const b = song({ style: 'Ambient' });
  const c = song({ style: 'Ambient' });
  const all = [a, b, c];
  it('skips tracks without a recording and wraps', () => {
    const playable = (s: typeof a) => s !== b;
    expect(nextPlayable(all, d, a.slug, playable)).toBe(c.slug);
    expect(nextPlayable(all, d, c.slug, playable)).toBe(a.slug);
  });
  it('is null when no other track can play', () => {
    expect(nextPlayable(all, d, a.slug, (s) => s === a)).toBeNull();
  });
});

describe('nextPlayable with filters', () => {
  const a = song({ style: 'Ambient' });
  const b = song({ style: 'Alternative' });
  const c = song({ style: 'Ambient' });
  const all = [a, b, c];
  const ambient = { ...d, styles: new Set(['Ambient']) };
  it('follows the filtered order', () => {
    expect(nextPlayable(all, ambient, a.slug, () => true)).toBe(c.slug);
  });
  it('a filtered-out track continues through the full order', () => {
    expect(nextPlayable(all, ambient, b.slug, () => true)).toBe(c.slug);
  });
});
