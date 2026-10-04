// The single app state and change notifications. No DOM.
import type { FilterState } from '../domain/filters';

export type ViewName = 'record' | 'list';

export interface AppState {
  view: ViewName;
  filters: FilterState;
  /** Slug of the open track card, or null. */
  openSlug: string | null;
  /** Seconds to cue the player at when the card opens (from `?t=`), or null. */
  cue: number | null;
  /** A short message over the view, e.g. "Track not found". */
  notice: string | null;
}

type Listener = (state: AppState, previous: AppState) => void;

export class Store {
  private listeners = new Set<Listener>();

  constructor(private state: AppState) {}

  get(): AppState {
    return this.state;
  }

  set(patch: Partial<AppState>): void {
    const previous = this.state;
    this.state = { ...previous, ...patch };
    for (const listener of this.listeners) listener(this.state, previous);
  }

  subscribe(listener: Listener): void {
    this.listeners.add(listener);
  }
}
