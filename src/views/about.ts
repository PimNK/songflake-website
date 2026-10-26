// The About window (wide screens): the About button in the left column opens the intro in a modal
// like the track card's. ✕, Esc and a click on the backdrop close it; focus is trapped while open
// and returned to the button; page scroll is locked. Narrower, the intro is on the page itself.
import { strings } from '../strings';
import { trapFocus } from './modal';

export function mountAbout(button: HTMLButtonElement): void {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'about-title');
  modal.innerHTML = `
    <article class="sheet about-sheet">
      <header class="mhead">
        <h2 id="about-title">${strings.hero.about}</h2>
        <button class="btn" type="button" data-close aria-label="${strings.card.close}">✕</button>
      </header>
      <p class="lead">${strings.hero.intro}</p>
    </article>`;
  document.body.append(modal);
  const sheet = modal.querySelector<HTMLElement>('.sheet')!;

  const close = (): void => {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('locked');
    button.focus({ preventScroll: true });
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
