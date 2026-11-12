// A line of text that runs as a ticker when it is too long for its width (the random player's
// caption and title, the card's title on narrow screens): a second, aria-hidden copy closes the
// loop. The line is re-fitted whenever it changes width. CSS: `.run` / `.tick` in base.css.
import { esc } from './html';

/** Ticker speed in px per second. */
const RUN_SPEED = 40;

/**
 * Puts new text on a ticker line; unchanged text is left running. `may` says whether the line
 * may run at all (the card's title runs on narrow screens only).
 */
export function setRun(line: HTMLElement, text: string, may = true): void {
  if (line.dataset.text === text) return;
  line.dataset.text = text;
  fitRun(line, may);
}

/** Sets the line's text; when it does not fit (and may run), it runs as a ticker. */
function fitRun(line: HTMLElement, may = true): void {
  const text = esc(line.dataset.text ?? '');
  line.innerHTML = `<span class="tick"><span>${text}</span></span>`;
  const run = line.firstElementChild as HTMLElement;
  const over = may && run.offsetWidth > line.clientWidth + 1;
  line.classList.toggle('run', over);
  if (!over) return;
  run.insertAdjacentHTML('beforeend', `<span aria-hidden="true">${text}</span>`);
  run.style.setProperty('--run', `${(run.offsetWidth / 2 / RUN_SPEED).toFixed(1)}s`);
}

/** Re-fits a ticker line when it changes width; returns a cleanup. */
export function refitOnResize(line: HTMLElement, may: () => boolean = () => true): () => void {
  let width = 0;
  const ro = new ResizeObserver(([entry]) => {
    const w = Math.round(entry!.contentRect.width);
    if (w !== width && (width = w) && line.dataset.text) fitRun(line, may());
  });
  ro.observe(line);
  return () => ro.disconnect();
}
