import { describe, expect, it } from 'vitest';
import { timeline } from '../src/domain/timeline';

describe('timeline', () => {
  it('idea at the start, concept in the middle, ready at the end, whatever the years', () => {
    const t = timeline({ idea: 2014, concept: 2015, ready: 2021 });
    expect(t.stations.map((s) => [s.key, s.year, s.at])).toEqual([
      ['idea', 2014, 0],
      ['concept', 2015, 0.5],
      ['ready', 2021, 1],
    ]);
    expect(t.lit).toBe(1);
  });

  it('lights the scale up to the last station reached', () => {
    expect(timeline({ idea: 2022, concept: 2023 }).lit).toBe(0.5);
    expect(timeline({ idea: 2024 }).lit).toBe(0);
    expect(timeline({ idea: 2010, ready: 2012 }).lit).toBe(1);
  });

  it('missing years stay empty', () => {
    const wip = timeline({ idea: 2024 });
    expect(wip.stations[1]!.year).toBeNull();
    expect(wip.stations[2]!.year).toBeNull();
  });
});
