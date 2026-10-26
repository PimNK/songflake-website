import { describe, expect, it } from 'vitest';
import {
  activePin,
  formatTime,
  groupMarkers,
  markerFraction,
  parseTime,
  sortPins,
  suggestTime,
} from '../src/domain/pins';

describe('time', () => {
  it('parses m:ss and h:mm:ss', () => {
    expect(parseTime('0:42')).toBe(42);
    expect(parseTime('12:05')).toBe(725);
    expect(parseTime('1:02:03')).toBe(3723);
    expect(parseTime('0:60')).toBeNull();
    expect(parseTime('1:60:00')).toBeNull();
    expect(parseTime('1:5:00')).toBeNull();
    expect(parseTime('2.15')).toBeNull();
    expect(parseTime('42')).toBeNull();
  });

  it('formats seconds', () => {
    expect(formatTime(42)).toBe('0:42');
    expect(formatTime(725.9)).toBe('12:05');
    expect(formatTime(3723)).toBe('1:02:03');
  });

  it('round-trips', () => {
    for (const t of [0, 59, 61, 3599, 3600, 7322]) expect(parseTime(formatTime(t))).toBe(t);
  });

  it('suggests a fix', () => {
    expect(suggestTime('2.15')).toBe('2:15');
    expect(suggestTime('1,02,03')).toBe('1:02:03');
    expect(suggestTime('abc')).toBeNull();
  });
});

describe('pins', () => {
  const pins = sortPins([
    { at: 100, text: 'c' },
    { at: 10, text: 'a' },
    { at: 14, text: 'b' },
  ]);

  it('sorts', () => expect(pins.map((p) => p.text)).toEqual(['a', 'b', 'c']));

  it('active pin: most recent passed, until the next one', () => {
    expect(activePin(pins, 5)).toBeNull();
    expect(activePin(pins, 10)?.text).toBe('a');
    expect(activePin(pins, 13.9)?.text).toBe('a');
    expect(activePin(pins, 15)?.text).toBe('b');
    expect(activePin(pins, 22.5)?.text).toBe('b');
    expect(activePin(pins, 99.9)?.text).toBe('b');
    expect(activePin(pins, 101)?.text).toBe('c');
  });

  it('marker fraction', () => {
    expect(markerFraction(50, 200)).toBe(0.25);
    expect(markerFraction(250, 200)).toBeNull();
    expect(markerFraction(10, 0)).toBeNull();
  });

  it('groups markers closer than 12 px, skipping pins past the end', () => {
    const groups = groupMarkers([...pins, { at: 500, text: 'gone' }], 200, 400);
    expect(groups.map((g) => g.pins.map((p) => p.text))).toEqual([['a', 'b'], ['c']]);
    expect(groups[0]!.fraction).toBe(0.05);
  });
});
