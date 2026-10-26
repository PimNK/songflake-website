// Seeking on a bar (CLAUDE.md §4.6), shared by the card's waveform and the random player's line:
// click or drag sets the position, ← / → step by SEEK_STEP seconds, Home / End go to the ends.

const SEEK_STEP = 5;

/** `toFraction` gets the pointer's place along the bar (0–1); `by` gets a step in seconds. */
export function wireSeek(
  bar: HTMLElement,
  toFraction: (f: number) => void,
  by: (delta: number) => void,
): void {
  const at = (e: PointerEvent): void => {
    const r = bar.getBoundingClientRect();
    toFraction(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  };
  bar.addEventListener('pointerdown', (e) => {
    bar.setPointerCapture(e.pointerId);
    at(e);
  });
  bar.addEventListener('pointermove', (e) => {
    if (bar.hasPointerCapture(e.pointerId)) at(e);
  });
  bar.addEventListener('keydown', (e) => {
    const step: Record<string, number> = {
      ArrowRight: SEEK_STEP,
      ArrowLeft: -SEEK_STEP,
      Home: -Infinity,
      End: Infinity,
    };
    if (e.target !== bar || !(e.key in step)) return;
    e.preventDefault();
    by(step[e.key]!);
  });
}
