import { describe, expect, it } from 'vitest';
import { historyAction, parseHash, stateToHash } from '../src/app/router';
import type { AppState } from '../src/app/state';
import { defaultFilters } from '../src/domain/filters';
import { taxonomy } from './fixtures';

const base: AppState = {
  view: 'record',
  filters: defaultFilters(taxonomy),
  openSlug: null,
  cue: null,
  notice: null,
};

describe('router (§4.5)', () => {
  it('parses views, songs and queries', () => {
    expect(parseHash('')).toMatchObject({ view: 'record', slug: null });
    expect(parseHash('#/')).toMatchObject({ view: 'record', slug: null });
    expect(parseHash('#/list?min=9')).toMatchObject({ view: 'list', slug: null });
    expect(parseHash('#/list?min=9').query.get('min')).toBe('9');
    const song = parseHash('#/song/na-lunu?t=2:15');
    expect(song).toMatchObject({ view: null, slug: 'na-lunu' });
    expect(song.query.get('t')).toBe('2:15');
  });

  it('writes the hash with only non-default filters', () => {
    expect(stateToHash(base, taxonomy)).toBe('#/');
    expect(stateToHash({ ...base, view: 'list' }, taxonomy)).toBe('#/list');
    const f = {
      ...base.filters,
      styles: new Set(['Progressive', 'Ambient']),
      min: 9,
      solo: true,
      band: false,
    };
    expect(stateToHash({ ...base, view: 'list', filters: f }, taxonomy)).toBe(
      '#/list?style=Progressive,Ambient&min=9&band=solo',
    );
  });

  it('a song card with a cue time', () => {
    expect(stateToHash({ ...base, openSlug: 'dd', cue: 135 }, taxonomy)).toBe('#/song/dd?t=2:15');
    expect(stateToHash({ ...base, openSlug: 'dd' }, taxonomy)).toBe('#/song/dd');
  });
});

describe('router robustness and history', () => {
  it('a malformed escape falls back to the raw slug', () => {
    expect(parseHash('#/song/100%').slug).toBe('100%');
    expect(parseHash('#/song/%E0%A4%A').slug).toBe('%E0%A4%A');
    expect(parseHash('#/list?min=9?x').query.get('min')).toBe('9?x');
  });

  it('push on open and view switch, back on closing an own entry, else replace', () => {
    const rec = { view: 'record' as const, openSlug: null };
    const card = { view: 'record' as const, openSlug: 'dd' };
    expect(historyAction(rec, card, false)).toBe('push');
    expect(historyAction(card, rec, true)).toBe('back');
    expect(historyAction(card, rec, false)).toBe('replace'); // deep link closed
    expect(historyAction(card, { ...card, openSlug: 'shine' }, true)).toBe('replace'); // prev/next
    expect(historyAction(rec, { view: 'list', openSlug: null }, false)).toBe('push');
    expect(historyAction(rec, rec, false)).toBe('replace'); // filters
  });
});
