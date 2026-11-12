// The random-track player's order (CLAUDE.md §4.6): a shuffle bag — no track comes round again
// until every track of the pool has been heard — and a history to step back through. Pure: the
// random source is passed in.

/**
 * A random item of `pool` not yet heard this round; null when the pool is empty. When every
 * track of the pool has been heard the round starts afresh, never with `current` (unless it is
 * the only one).
 */
export function pickRandom(
  pool: readonly string[],
  heard: ReadonlySet<string>,
  current: string | null,
  rand: () => number,
): string | null {
  if (!pool.length) return null;
  const fresh = pool.filter((x) => !heard.has(x) && x !== current);
  const others = pool.filter((x) => x !== current);
  const from = fresh.length ? fresh : others.length ? others : pool;
  return from[Math.min(from.length - 1, Math.floor(rand() * from.length))]!;
}

/** True when a new round starts: every track of the pool has been heard. */
export const roundDone = (pool: readonly string[], heard: ReadonlySet<string>): boolean =>
  pool.every((x) => heard.has(x));

/** The tracks played so far by the random player, with a cursor for stepping back and forth. */
export class ShuffleHistory {
  private played: string[] = [];
  private at = -1;
  /** Tracks heard in this round of the bag. */
  private heard = new Set<string>();

  /** The current track, if the random player has played one. */
  get current(): string | null {
    return this.played[this.at] ?? null;
  }

  /**
   * Forward: replays the history after a step back while the next entry is still in the pool
   * (a filter may have left it out; then the rest is dropped), otherwise picks a track not heard
   * yet in this round.
   */
  next(pool: readonly string[], rand: () => number): string | null {
    const ahead = this.played[this.at + 1];
    if (ahead !== undefined && pool.includes(ahead)) return this.played[++this.at]!;
    this.played = this.played.slice(0, this.at + 1);
    if (roundDone(pool, this.heard)) this.heard = new Set();
    const pick = pickRandom(pool, this.heard, this.current, rand);
    if (pick !== null) this.push(pick);
    return pick;
  }

  /** Back to the track before the current one; null at the start of the history. */
  back(): string | null {
    if (this.at <= 0) return null;
    return this.played[--this.at]!;
  }

  /** Records a track that started (here or elsewhere, e.g. a card), so Back can return to it. */
  push(slug: string): void {
    this.heard.add(slug);
    if (this.current === slug) return;
    this.played = [...this.played.slice(0, this.at + 1), slug];
    this.at = this.played.length - 1;
  }
}
