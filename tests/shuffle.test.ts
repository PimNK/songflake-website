import { describe, expect, it } from 'vitest';
import { avoidCount, pickRandom, ShuffleHistory } from '../src/domain/shuffle';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

describe('random pick', () => {
  it('avoids about half of the pool, never all of it', () => {
    expect(avoidCount(0)).toBe(0);
    expect(avoidCount(1)).toBe(0);
    expect(avoidCount(2)).toBe(1);
    expect(avoidCount(10)).toBe(5);
  });
  it('skips the latest tracks', () => {
    const pool = ['a', 'b', 'c', 'd'];
    for (let r = 0; r < 1; r += 0.1) {
      expect(['a', 'b']).toContain(pickRandom(pool, ['x', 'c', 'd'], () => r));
    }
  });
  it('a pool of one always gives that track; an empty pool gives null', () => {
    expect(pickRandom(['a'], ['a'], () => 0.5)).toBe('a');
    expect(pickRandom([], [], () => 0.5)).toBeNull();
  });
  it('rand() of 1 stays inside the pool', () => {
    expect(pickRandom(['a', 'b'], [], () => 1)).toBe('b');
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
});
