// Development only: content errors and warnings shown over the page instead of crashing it.
// One panel collects every message; each message is shown once per page load.
import { strings } from '../strings';

const shown = new Set<string>();
const errors: string[] = [];
const warnings: string[] = [];
let box: HTMLElement | null = null;

function render(): void {
  if (!box) {
    box = document.createElement('aside');
    box.className = 'content-overlay';
    box.setAttribute('role', 'alert');
    document.body.append(box);
  }
  const section = (title: string, items: readonly string[], kind: string): string =>
    items.length
      ? `<h2 class="${kind}">${title}</h2><ul>${items.map(() => '<li><pre></pre></li>').join('')}</ul>`
      : '';
  box.innerHTML = `
    <button type="button" class="tbtn">${strings.overlay.close}</button>
    ${section(strings.overlay.errors(errors.length), errors, 'err')}
    ${section(strings.overlay.warnings(warnings.length), warnings, 'warn')}
    <p>${strings.overlay.hint}</p>`;
  // Messages are set as text: they quote the author's files verbatim.
  const pres = box.querySelectorAll('pre');
  [...errors, ...warnings].forEach((msg, i) => {
    if (pres[i]) pres[i].textContent = msg;
  });
  box.querySelector('button')!.addEventListener('click', () => {
    box?.remove();
    box = null;
    errors.length = 0;
    warnings.length = 0;
  });
}

export function showContentOverlay(
  newErrors: readonly string[],
  newWarnings: readonly string[],
): void {
  const fresh = (m: string): boolean => !shown.has(m) && Boolean(shown.add(m));
  const e = newErrors.filter(fresh);
  const w = newWarnings.filter(fresh);
  if (!e.length && !w.length) return;
  errors.push(...e);
  warnings.push(...w);
  render();
}
