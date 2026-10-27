// The static page frame: the star sky behind everything and two sections — the intro (the hero
// row: the title, the About button that opens the intro in a window on wide screens and the
// language switch; then About and its text, on the page narrower) and the map
// (the random-track player with the Filters toggle, the filter block — the labelled Record / List
// switch, then the filter panel — and the views). On wide screens CSS lays them out as one left
// column beside the view; narrower, the player is frozen at the bottom. Returns the slots other
// views fill in.
import { drawSky } from '../render/sky';
import { devicePixelRatioCapped } from '../render/snowflake';
import { lang, otherLang, switchLang } from '../lang';
import { strings } from '../strings';

export interface PageSlots {
  page: HTMLElement;
  filterToggle: HTMLButtonElement;
  aboutButton: HTMLButtonElement;
  filters: HTMLElement;
  /** The filter block on wide screens: the Record / List switch and the filter panel. */
  filterBlock: HTMLElement;
  player: HTMLElement;
  tabRecord: HTMLButtonElement;
  tabList: HTMLButtonElement;
  stage: HTMLElement;
  listView: HTMLElement;
  notice: HTMLElement;
}

/** The page markup; CSS places its parts for each width. */
const frame = (v = strings.views): string => `
    <canvas class="sky" aria-hidden="true"></canvas>
    <div class="page" data-view="record">
      <header class="intro-sec">
        <div class="hero">
          <h1>${strings.hero.title}</h1>
          <div class="hero-keys">
            <button type="button" class="pad hero-btn about-btn" aria-haspopup="dialog" aria-label="${strings.hero.about}">${strings.hero.aboutGlyph}</button>
            <button type="button" class="pad hero-btn lang-btn" aria-label="${strings.hero.langLabel}">${strings.hero.lang}</button>
          </div>
        </div>
        <section class="about" aria-labelledby="about-h">
          <h2 class="label" id="about-h">${strings.hero.about}</h2>
          <p class="lead">${strings.hero.intro}</p>
        </section>
        <button type="button" class="scroll-cue" aria-label="${v.toRecord}">${CHEVRON}<small>${v.scroll}</small></button>
      </header>
      <main class="map-sec" aria-label="${v.mapLabel}">
        <div class="rplayer">
          <button type="button" class="ftoggle" aria-expanded="false" aria-controls="filters"></button>
          <div class="rp" data-slot="player"></div>
        </div>
        <div class="fanchor">
          <div class="viewbar">
            <span class="vlabel label" id="view-label">${v.label}</span>
            <div class="vseg tabs" role="tablist" aria-labelledby="view-label">
              <button type="button" role="tab" id="tab-record" aria-controls="stage"><span class="glyph">${v.recordGlyph} </span>${v.record}</button>
              <button type="button" role="tab" id="tab-list" aria-controls="listview"><span class="glyph">${v.listGlyph} </span>${v.list}</button>
            </div>
          </div>
          <div class="fpanel" id="filters" data-slot="filters" hidden></div>
        </div>
        <div class="views">
          <p class="notice" role="status" data-slot="notice" hidden></p>
          <div class="stage" id="stage" role="tabpanel" aria-labelledby="tab-record"></div>
          <div class="listview" id="listview" role="tabpanel" aria-labelledby="tab-list" hidden></div>
        </div>
      </main>
    </div>`;

export function renderPage(root: HTMLElement): PageSlots {
  document.documentElement.lang = lang;
  root.innerHTML = frame();
  root.querySelector('.lang-btn')!.addEventListener('click', () => switchLang(otherLang));
  mountSky(root.querySelector<HTMLCanvasElement>('.sky')!);
  wireScrollCue(root);
  measureTitle(root.querySelector<HTMLElement>('.hero h1')!);
  const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
  return {
    page: q('.page'),
    filterToggle: q('.ftoggle'),
    aboutButton: q('.about-btn'),
    filters: q('[data-slot="filters"]'),
    filterBlock: q('.fanchor'),
    player: q('[data-slot="player"]'),
    tabRecord: q('#tab-record'),
    tabList: q('#tab-list'),
    stage: q('#stage'),
    listView: q('#listview'),
    notice: q('[data-slot="notice"]'),
  };
}

/**
 * The hero title is sized to the room its buttons leave (layout.css), which needs its width in
 * em: measured once the fonts are in, so any site name fits.
 */
function measureTitle(h1: HTMLElement): void {
  void document.fonts.ready.then(() => {
    const range = document.createRange();
    range.selectNodeContents(h1);
    const em = range.getBoundingClientRect().width / parseFloat(getComputedStyle(h1).fontSize);
    if (em > 0) h1.parentElement!.style.setProperty('--title-em', (em * 1.03).toFixed(2));
  });
}

/** A chevron pointing down, to the second section. */
const CHEVRON =
  '<svg width="40" height="40" viewBox="0 0 28 28" aria-hidden="true"><path d="M6 10l8 8 8-8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * Narrow screens: the arrow scrolls to the second section; it fades out once the page moves.
 * While the intro fills most of the screen, `at-intro` on the page keeps the bottom player out of
 * sight (layout.css).
 */
function wireScrollCue(root: HTMLElement): void {
  const cue = root.querySelector<HTMLElement>('.scroll-cue')!;
  const intro = root.querySelector<HTMLElement>('.intro-sec')!;
  const page = root.querySelector<HTMLElement>('.page')!;
  cue.addEventListener('click', () =>
    root.querySelector('.map-sec')!.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  );
  const fade = (): void => {
    cue.classList.toggle('gone', window.scrollY > 24);
    page.classList.toggle(
      'at-intro',
      intro.getBoundingClientRect().bottom > window.innerHeight / 2,
    );
  };
  window.addEventListener('scroll', fade, { passive: true });
  window.addEventListener('resize', fade);
  fade();
}

/** The fixed star sky, redrawn only when the window size changes. */
function mountSky(canvas: HTMLCanvasElement): void {
  const paint = (): void => {
    const dpr = devicePixelRatioCapped();
    const [w, h] = [window.innerWidth, window.innerHeight];
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSky(ctx, w, h);
  };
  paint();
  window.addEventListener('resize', paint);
}

/** Shows one view, marks its tab, and sets the notice. */
export function showView(slots: PageSlots, view: 'record' | 'list', notice: string | null): void {
  const rec = view === 'record';
  slots.page.dataset.view = view;
  slots.stage.hidden = !rec;
  slots.listView.hidden = rec;
  slots.tabRecord.setAttribute('aria-selected', String(rec));
  slots.tabList.setAttribute('aria-selected', String(!rec));
  // Roving tabindex: only the active tab is a Tab stop; ← / → reach the other.
  slots.tabRecord.tabIndex = rec ? 0 : -1;
  slots.tabList.tabIndex = rec ? -1 : 0;
  slots.notice.hidden = !notice;
  slots.notice.textContent = notice ?? '';
}

export function onViewTab(slots: PageSlots, choose: (view: 'record' | 'list') => void): void {
  slots.tabRecord.addEventListener('click', () => choose('record'));
  slots.tabList.addEventListener('click', () => choose('list'));
  // Tablist keys: ← / → move between the two tabs.
  for (const [tab, other, view] of [
    [slots.tabRecord, slots.tabList, 'list'],
    [slots.tabList, slots.tabRecord, 'record'],
  ] as const) {
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      choose(view);
      other.focus();
    });
  }
}
