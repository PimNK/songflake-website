// Pins: notes attached to moments of a recording (CLAUDE.md §4.6). Pure — no DOM, no <audio>.

export interface Pin {
  /** Seconds from the start of the recording. */
  at: number;
  text: string;
}

const TIME = /^(?:(\d+):)?(\d+):(\d{2})$/;

/** `"m:ss"` or `"h:mm:ss"` → seconds; `null` when it is not a valid time. */
export function parseTime(value: string): number | null {
  const m = TIME.exec(value.trim());
  if (!m) return null;
  const [, h, mm, ss] = m;
  const hours = h === undefined ? 0 : Number(h);
  const minutes = Number(mm);
  const seconds = Number(ss);
  if (seconds >= 60) return null;
  if (h !== undefined && (minutes >= 60 || mm!.length !== 2)) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

/** Seconds → `"m:ss"`, or `"h:mm:ss"` from one hour. */
export function formatTime(totalSeconds: number): string {
  const t = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(t % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** A likely intended time for a malformed one (`"2.15"` → `"2:15"`), or `null`. */
export function suggestTime(value: string): string | null {
  const guess = value.trim().replace(/[.,;\s']+/g, ':');
  return guess !== value && parseTime(guess) !== null ? guess : null;
}

export function sortPins<T extends Pin>(pins: readonly T[]): T[] {
  return [...pins].sort((a, b) => a.at - b.at);
}

/** The most recent pin passed at time `t`; it stays active until the next pin is reached. */
export function activePin<T extends Pin>(sortedPins: readonly T[], t: number): T | null {
  let current: T | null = null;
  for (const pin of sortedPins) {
    if (pin.at <= t) current = pin;
    else break;
  }
  return current;
}

/** Marker position as a fraction of the duration; `null` when the pin lies past the end. */
export function markerFraction(at: number, duration: number): number | null {
  if (!(duration > 0) || at > duration) return null;
  return Math.max(0, at / duration);
}

export interface MarkerGroup<T extends Pin> {
  fraction: number;
  pins: T[];
}

/**
 * Markers closer than `minGapPx` on a bar `widthPx` wide merge into one group, positioned
 * at its first pin. Pins past the end of the recording are left out.
 */
export function groupMarkers<T extends Pin>(
  sortedPins: readonly T[],
  duration: number,
  widthPx: number,
  minGapPx = 12,
): MarkerGroup<T>[] {
  const groups: MarkerGroup<T>[] = [];
  for (const pin of sortedPins) {
    const fraction = markerFraction(pin.at, duration);
    if (fraction === null) continue;
    const last = groups[groups.length - 1];
    if (last && (fraction - last.fraction) * widthPx < minGapPx) last.pins.push(pin);
    else groups.push({ fraction, pins: [pin] });
  }
  return groups;
}
