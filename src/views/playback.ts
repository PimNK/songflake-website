// The one shared <audio> element for the whole page, and each recording's duration, cached per
// song in memory. Playback continues when a card closes;
// opening another card does not stop the current track until its own play is pressed; when a
// track ends, the next one follows (autoAdvance), picked the way the run was started: in the
// card's order or by the random-track player.
import type { Song } from '../content/parse';

type Listener = () => void;

/** Who started the current run: a card's play (the card order) or the random-track player. */
export type PlayMode = 'order' | 'shuffle';

export class Playback {
  readonly audio = new Audio();
  /** The song loaded into the audio element, if any. */
  song: Song | null = null;
  mode: PlayMode = 'order';
  /** Positions chosen for songs that are not loaded yet (a cue or a seek before play). */
  private pending = new Map<string, number>();
  private durations = new Map<string, Promise<number>>();
  private listeners = new Set<Listener>();

  constructor() {
    this.audio.preload = 'metadata';
    for (const type of [
      'play',
      'pause',
      'ended',
      'timeupdate',
      'loadedmetadata',
      'seeked',
      'emptied',
      'volumechange',
    ]) {
      this.audio.addEventListener(type, () => this.emit());
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }

  isCurrent(song: Song): boolean {
    return this.song?.slug === song.slug;
  }

  isPlaying(song?: Song): boolean {
    return !this.audio.paused && !this.audio.ended && (!song || this.isCurrent(song));
  }

  /** Playback position of a song: live when it is loaded, otherwise its pending position. */
  position(song: Song): number {
    return this.isCurrent(song) ? this.audio.currentTime : (this.pending.get(song.slug) ?? 0);
  }

  /** Moves a song's position; plays from there when `play` is set. */
  seek(song: Song, seconds: number, play = false): void {
    const t = Math.max(0, seconds);
    if (this.isCurrent(song)) this.audio.currentTime = t;
    else this.pending.set(song.slug, t);
    if (play) this.play(song);
    else this.emit();
  }

  /** Plays a song; switching to another song also sets who started the run (`mode`). */
  play(song: Song, mode: PlayMode = 'order'): void {
    if (!song.audioSrc) return;
    if (!this.isCurrent(song)) {
      this.mode = mode;
      // A finished track starts from the top next time, not from its end.
      if (this.song && this.audio.currentTime > 0 && !this.audio.ended) {
        this.pending.set(this.song.slug, this.audio.currentTime);
      }
      const start = this.pending.get(song.slug) ?? 0;
      this.pending.delete(song.slug);
      this.song = song;
      this.audio.src = song.audioSrc;
      this.audio.currentTime = start;
    } else if (this.audio.ended) {
      this.audio.currentTime = 0;
    }
    void this.audio.play().catch(() => this.emit());
  }

  /** Plays a song from the top, whatever position it was left at (⏮ / ⏭, auto-advance). */
  playFromStart(song: Song, mode: PlayMode = 'order'): void {
    if (!song.audioSrc) return;
    this.pending.delete(song.slug);
    if (this.isCurrent(song)) this.audio.currentTime = 0;
    this.play(song, mode);
  }

  toggle(song: Song): void {
    if (this.isPlaying(song)) this.audio.pause();
    else this.play(song);
  }

  /**
   * When a track ends, play the one `next` picks for the run's mode (none: stop there); `moved`
   * hears about it so an open card can follow. The run keeps its mode.
   */
  autoAdvance(
    next: (ended: Song, mode: PlayMode) => Song | null,
    moved: (from: Song, to: Song) => void,
  ): void {
    this.audio.addEventListener('ended', () => {
      const ended = this.song;
      const to = ended && next(ended, this.mode);
      if (!ended || !to) return;
      moved(ended, to);
      this.playFromStart(to, this.mode);
    });
  }

  /** The recording's duration in seconds (0 when unknown), read from its metadata and cached. */
  duration(song: Song): Promise<number> {
    let d = this.durations.get(song.slug);
    if (!d) {
      d = probeDuration(song.audioSrc!);
      this.durations.set(song.slug, d);
      // A failed probe (e.g. a network blip) is not cached: the next open tries again.
      void d.then((seconds) => {
        if (!seconds) this.durations.delete(song.slug);
      });
    }
    return d;
  }

  /** Playback volume, 0–1. */
  get volume(): number {
    return this.audio.volume;
  }

  set volume(v: number) {
    this.audio.volume = Math.min(1, Math.max(0, v));
  }
}

/** The duration from the recording's metadata. */
function probeDuration(src: string): Promise<number> {
  return new Promise((resolve) => {
    const probe = new Audio();
    probe.preload = 'metadata';
    const done = (): void => resolve(Number.isFinite(probe.duration) ? probe.duration : 0);
    probe.addEventListener('loadedmetadata', done, { once: true });
    probe.addEventListener('error', done, { once: true });
    probe.src = src;
  });
}
