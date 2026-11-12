import { describe, expect, it } from 'vitest';
import { pickRandom, roundDone, ShuffleHistory } from '../src/domain/shuffle';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

describe('random pick: a shuffle bag', () => {
  it('picks only tracks not heard this round, never the current one', () => {
    const pool = ['a', 'b', 'c', 'd'];
    for (let r = 0; r < 1; r += 0.1) {
      expect(['b', 'c']).toContain(pickRandom(pool, new Set(['a', 'd']), 'a', () => r));
    }
  });
  it('once all are heard, any track but the current one', () => {
    expect(pickRandom(['a', 'b'], new Set(['a', 'b']), 'a', () => 0)).toBe('b');
    expect(roundDone(['a', 'b'], new Set(['a', 'b']))).toBe(true);
    expect(roundDone(['a', 'b'], new Set(['a']))).toBe(false);
  });
  it('a pool of one always gives that track; an empty pool gives null', () => {
    expect(pickRandom(['a'], new Set(['a']), 'a', () => 0.5)).toBe('a');
    expect(pickRandom([], new Set(), null, () => 0.5)).toBeNull();
  });
  it('rand() of 1 stays inside the pool', () => {
    expect(pickRandom(['a', 'b'], new Set(), null, () => 1)).toBe('b');
  });
});

describe('shuffle history', () => {
  it('back and forward walk the history before new picks', () => {
    const h = new ShuffleHistory();
    const pool = ['a', 'b', 'c', 'd'];
    const rand = seq(0, 0, 0);
    const first = h.next(pool, rand)!;
    const second = h.next(pool, rand)!;
    expect(second).not.toBe(first);
    expect(h.back()).toBe(first);
    expect(h.back()).toBeNull();
    expect(h.next(pool, rand)).toBe(second);
    expect(h.current).toBe(second);
  });
  it('a track started elsewhere joins the history and cuts the forward part', () => {
    const h = new ShuffleHistory();
    h.push('a');
    h.push('b');
    h.back();
    h.push('c');
    expect(h.current).toBe('c');
    expect(h.back()).toBe('a');
    h.push('a');
    expect(h.back()).toBeNull();
  });
  it('a replayed track that left the pool is dropped for a new pick', () => {
    const h = new ShuffleHistory();
    h.push('a');
    h.push('b');
    h.back();
    expect(h.next(['a', 'c'], () => 0)).toBe('c');
    expect(h.back()).toBe('a');
    expect(h.next(['a', 'b', 'c'], () => 0)).toBe('c');
  });
  it('plays every track of the pool once before any comes round again', () => {
    const h = new ShuffleHistory();
    const pool = ['a', 'b', 'c', 'd', 'e'];
    const rand = seq(0.9, 0.1, 0.5, 0.3, 0.7);
    const round = pool.map(() => h.next(pool, rand));
    expect(new Set(round).size).toBe(pool.length);
    expect(h.next(pool, rand)).not.toBe(round[round.length - 1]);
  });
});
