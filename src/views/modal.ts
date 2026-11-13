// What the page's modal windows share (the track card and About): keeping Tab inside the window.

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * On Tab, moves focus round the window's visible, enabled controls, wrapping. With several roots
 * (the narrow card and the bottom player, which is its transport) it goes round all of them in
 * the order given.
 */
export function trapFocus(e: KeyboardEvent, ...roots: HTMLElement[]): void {
  const items = roots
    .flatMap((root) => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)])
    .filter((x) => !(x as HTMLButtonElement).disabled && x.offsetParent !== null);
  if (!items.length) return;
  e.preventDefault();
  const at = items.indexOf(document.activeElement as HTMLElement);
  const n = items.length;
  const to = at < 0 ? (e.shiftKey ? n - 1 : 0) : (at + (e.shiftKey ? -1 : 1) + n) % n;
  items[to]!.focus();
}
