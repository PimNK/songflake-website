// The About window (wide screens): the About button in the left column opens the intro in a modal
// like the track card's. ✕, Esc and a click on the backdrop close it; focus is trapped while open
// and returned to the button; page scroll is locked; `closed` runs after (main.ts starts the
// hints then). Narrower, the intro is on the page itself.
import { strings } from '../strings';
import { CLOSE_ICON, introHtml } from './html';
import { trapFocus } from './modal';

export function mountAbout(button: HTMLButtonElement, closed: () => void): void {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'about-title');
  modal.innerHTML = `
    <article class="sheet panel about-sheet">
      <button class="btn s x" type="button" data-close aria-label="${strings.card.close}">${CLOSE_ICON}</button>
      <h2 class="label" id="about-title">${strings.hero.about}</h2>
      <div class="lead">${introHtml(strings.hero.intro)}</div>
    </article>`;
  document.body.append(modal);
  const sheet = modal.querySelector<HTMLElement>('.sheet')!;

  const close = (): void => {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('locked');
    button.focus({ preventScroll: true });
    closed();
  };
  button.addEventListener('click', () => {
    modal.hidden = false;
    document.body.classList.add('locked');
    modal.querySelector<HTMLElement>('[data-close]')!.focus({ preventScroll: true });
  });
  modal.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t === modal || t.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'Tab') trapFocus(e, sheet);
  });
}
