import { describe, expect, it } from 'vitest';
import { en } from '../src/strings/en';
import { ru } from '../src/strings/ru';

/** Every key path in a strings table, nested objects included. */
const keys = (o: object, at = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${at}${k}.`) : [`${at}${k}`],
  );

describe('Russian strings', () => {
  it('have every key the English ones have, and as many hint steps', () => {
    expect(keys(ru)).toEqual(keys(en));
    expect(ru.hints.steps).toHaveLength(en.hints.steps.length);
  });

  it('picks the noun form for 1, 2–4 and 5+, teens included', () => {
    expect([1, 2, 5, 11, 12, 21, 22, 25, 111].map(ru.years)).toEqual([
      '1 год',
      '2 года',
      '5 лет',
      '11 лет',
      '12 лет',
      '21 год',
      '22 года',
      '25 лет',
      '111 лет',
    ]);
  });

  it('says «из N трека / треков» after the count', () => {
    expect(ru.filters.toggleLabel(3, 21)).toBe('Фильтры: показано 3 из 21 трека');
    expect(ru.filters.toggleLabel(22, 22)).toBe('Фильтры: показано 22 из 22 треков');
  });
});
