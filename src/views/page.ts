// The static page frame: the room's light behind everything and two sections in a scrolling box
// — the intro (the hero row: the title, the power lamp, the About button that opens the intro in
// a window on wide screens and the language switch; then the intro text, on the page narrower)
// and the map (the labelled Record / List switch and the views) — with the random-track player
// (and its Filters toggle) and the filter panel beside them. On wide screens CSS lays them out as
// one console — a faceplate down the left with the hero, the switch and the backlight knobs, the
// player and the filters — beside the view; narrower, the player is frozen at the bottom and the
// scrolling box ends above it. Returns the slots other views fill in.
import { lang, otherLang, switchLang } from '../lang';
import { strings } from '../strings';
import { introHtml } from './html';

export interface PageSlots {
  page: HTMLElement;
  /** The scrolling box of the two sections (below 1100 px). */
  scroller: HTMLElement;
  /** The row with the Record / List switch; the backlight knobs join it on wide screens. */
  controls: HTMLElement;
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
    <div class="page at-intro" data-view="record">
      <div class="deck panel" aria-hidden="true"></div>
      <div class="scroller">
        <header class="intro-sec">
          <div class="hero">
            <h1>${strings.hero.title}</h1>
            <div class="hero-keys">
              <i class="pwr" aria-hidden="true"></i>
              <button type="button" class="btn s about-btn" aria-haspopup="dialog" aria-label="${strings.hero.about}">${strings.hero.aboutGlyph}</button>
              <button type="button" class="btn s lang-btn" aria-label="${strings.hero.langLabel}">${strings.hero.lang}</button>
            </div>
          </div>
          <section class="about lead" aria-label="${strings.hero.about}">${introHtml(strings.hero.intro)}</section>
          <button type="button" class="scroll-cue" aria-label="${v.toRecord}">${CHEVRON}<small class="label">${v.scroll}</small></button>
        </header>
        <main class="map-sec" aria-label="${v.mapLabel}">
          <div class="ctl">
            <div class="viewbar">
              <span class="vlabel label" id="view-label">${v.label}</span>
              <div class="slot" role="tablist" aria-labelledby="view-label">
                <button type="button" role="tab" id="tab-record" aria-controls="stage">${v.record}</button>
                <button type="button" role="tab" id="tab-list" aria-controls="listview">${v.list}</button>
                <i class="knob" aria-hidden="true"></i>
              </div>
            </div>
          </div>
          <div class="views">
            <p class="notice" role="status" data-slot="notice" hidden></p>
            <div class="stage" id="stage" role="tabpanel" aria-labelledby="tab-record"></div>
            <div class="listview" id="listview" role="tabpanel" aria-labelledby="tab-list" hidden></div>
          </div>
        </main>
      </div>
      <section class="rplayer panel">
        <button type="button" class="btn ftoggle" aria-expanded="false" aria-controls="filters"></button>
        <div class="rp" data-slot="player"></div>
      </section>
      <div class="fanchor">
        <div class="fpanel panel" id="filters" data-slot="filters" hidden></div>
      </div>
    </div>`;

export function renderPage(root: HTMLElement): PageSlots {
  document.documentElement.lang = lang;
  root.innerHTML = frame();
  root.querySelector('.lang-btn')!.addEventListener('click', () => switchLang(otherLang));
  wireScrollCue(root);
  measureTitle(root.querySelector<HTMLElement>('.hero h1')!);
  const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
  return {
    page: q('.page'),
    scroller: q('.scroller'),
    controls: q('.ctl'),
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
 * The hero title is sized to the room its keys leave (layout.css), which needs its width in em:
 * measured once the fonts are in, so any site name fits.
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
 * While the intro fills most of the screen, `at-intro` on the page keeps the bottom player and the
 * filter sheet out of sight (layout.css), and the scrolling box reaches the bottom.
 */
function wireScrollCue(root: HTMLElement): void {
  const cue = root.querySelector<HTMLElement>('.scroll-cue')!;
  const intro = root.querySelector<HTMLElement>('.intro-sec')!;
  const page = root.querySelector<HTMLElement>('.page')!;
  const scroller = root.querySelector<HTMLElement>('.scroller')!;
  cue.addEventListener('click', () =>
    root.querySelector('.map-sec')!.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  );
  const fade = (): void => {
    cue.classList.toggle('gone', scroller.scrollTop > 24);
    page.classList.toggle(
      'at-intro',
      !WIDE.matches && intro.getBoundingClientRect().bottom > window.innerHeight / 2,
    );
  };
  scroller.addEventListener('scroll', fade, { passive: true });
  window.addEventListener('resize', fade);
  fade();
}

/** From this width the page is one console (layout.css). */
const WIDE = window.matchMedia('(min-width: 1100px)');

/**
 * The backlight knobs sit beside the Record / List switch on wide screens and at the foot of the
 * filter sheet, beside Reset, narrower. Call once the filter panel is mounted.
 */
export function placeDials(slots: PageSlots, dials: HTMLElement): void {
  const put = (): void => {
    const foot = slots.filters.querySelector('.foot') ?? slots.filters;
    (WIDE.matches ? slots.controls : foot).append(dials);
  };
  put();
  WIDE.addEventListener('change', put);
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
