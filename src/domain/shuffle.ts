// The random-track player's order (CLAUDE.md §4.6): a random pick that avoids the tracks heard
// most recently, and a history to step back through. Pure: the random source is passed in.

/** How many of the latest tracks a new pick avoids: about half the pool, never all of it. */
export const avoidCount = (poolSize: number): number =>
  Math.max(0, Math.min(poolSize - 1, Math.floor(poolSize / 2)));

/** A random item of `pool` that is not among the last `avoidCount` of `recent`; null when empty. */
export function pickRandom(
  pool: readonly string[],
  recent: readonly string[],
  rand: () => number,
): string | null {
  if (!pool.length) return null;
  const avoid = new Set(recent.slice(-avoidCount(pool.length)));
  const fresh = pool.filter((x) => !avoid.has(x));
  const from = fresh.length ? fresh : pool;
  return from[Math.min(from.length - 1, Math.floor(rand() * from.length))]!;
}

/** The tracks played so far by the random player, with a cursor for stepping back and forth. */
export class ShuffleHistory {
  private played: string[] = [];
  private at = -1;

  /** The current track, if the random player has played one. */
  get current(): string | null {
    return this.played[this.at] ?? null;
  }

  /**
   * Forward: replays the history after a step back while the next entry is still in the pool
   * (a filter may have left it out; then the rest is dropped), otherwise picks a new track.
   */
  next(pool: readonly string[], rand: () => number): string | null {
    const ahead = this.played[this.at + 1];
    if (ahead !== undefined && pool.includes(ahead)) return this.played[++this.at]!;
    this.played = this.played.slice(0, this.at + 1);
    const pick = pickRandom(pool, this.played, rand);
    if (pick !== null) this.push(pick);
    return pick;
  }

  /** Back to the track before the current one; null at the start of the history. */
  back(): string | null {
    if (this.at <= 0) return null;
    return this.played[--this.at]!;
  }

  /** Records a track that started elsewhere (e.g. a card), so Back can return to it. */
  push(slug: string): void {
    if (this.current === slug) return;
    this.played = [...this.played.slice(0, this.at + 1), slug];
    this.at = this.played.length - 1;
  }
}
