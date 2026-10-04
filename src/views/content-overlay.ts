// Development only: content errors and warnings shown over the page instead of crashing it.
import { strings } from '../strings';

export function showContentOverlay(errors: readonly string[], warnings: readonly string[]): void {
  if (!errors.length && !warnings.length) return;
  const box = document.createElement('aside');
  box.className = 'content-overlay';
  box.setAttribute('role', 'alert');
  const section = (title: string, items: readonly string[], kind: string): string =>
    items.length
      ? `<h2 class="${kind}">${title}</h2><ul>${items.map(() => `<li><pre></pre></li>`).join('')}</ul>`
      : '';
  box.innerHTML = `
    <button type="button" class="btn">${strings.overlay.close}</button>
    ${section(strings.overlay.errors(errors.length), errors, 'err')}
    ${section(strings.overlay.warnings(warnings.length), warnings, 'warn')}
    <p>${strings.overlay.hint}</p>`;
  // Messages are set as text: they quote the author's files verbatim.
  const pres = box.querySelectorAll('pre');
  [...errors, ...warnings].forEach((msg, i) => {
    if (pres[i]) pres[i].textContent = msg;
  });
  box.querySelector('button')?.addEventListener('click', () => box.remove());
  document.body.append(box);
}
