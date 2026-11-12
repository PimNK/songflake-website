// The oscilloscope trace's liveliness (CLAUDE.md §4.6): how much it swings for the player's
// state, and how it eases there frame by frame. Pure; drawing is render/scope.ts.

/** The swing a trace eases to: full while playing, a little when paused, none when unloaded. */
export const scopeTarget = (playing: boolean, loaded: boolean): number =>
  playing ? 1 : loaded ? 0.28 : 0;

/** One frame's easing step of the swing towards its target. */
export const easeAmp = (amp: number, target: number): number => amp + (target - amp) * 0.08;

/** Close enough to the target to stop animating. */
export const atRest = (amp: number, target: number): boolean => Math.abs(target - amp) <= 0.004;
