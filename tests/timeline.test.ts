import { describe, expect, it } from 'vitest';
import { MIN_GAP, timeline } from '../src/domain/timeline';

describe('timeline', () => {
  it('stations with fills and proportional gaps', () => {
    const t = timeline({ idea: 2014, concept: 2019, ready: 2021 });
    expect(t.stations.map((s) => [s.year, s.fill])).toEqual([
      [2014, 'hollow'],
      [2019, 'half'],
      [2021, 'full'],
    ]);
    expect(t.gaps).toEqual([
      { years: 5, grow: 5 },
      { years: 2, grow: 2 },
    ]);
  });

  it('zero gaps get a minimum length', () => {
    const t = timeline({ idea: 2020, concept: 2020, ready: 2020 });
    expect(t.gaps.map((g) => g.grow)).toEqual([MIN_GAP, MIN_GAP]);
    expect(t.gaps[0]!.years).toBe(0);
  });

  it('missing years: in progress, and no concept', () => {
    const wip = timeline({ idea: 2024 });
    expect(wip.stations[2]!.year).toBeNull();
    expect(wip.gaps[1]!.years).toBeNull();
    const noConcept = timeline({ idea: 2010, ready: 2012 });
    expect(noConcept.gaps[0]!.years).toBeNull();
    expect(noConcept.gaps[1]!.years).toBe(2);
  });
});
