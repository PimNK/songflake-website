// The static page frame: the star sky behind everything, the hero, and the map section (filter
// panel + view switch + views). Returns the slots other views fill in.
import type { Content } from '../content/load';
import { yearRange } from '../domain/record-layout';
import { drawSky } from '../render/sky';
import { devicePixelRatioCapped } from '../render/snowflake';
import { strings } from '../strings';

export interface PageSlots {
  filters: HTMLElement;
  tabRecord: HTMLButtonElement;
  tabList: HTMLButtonElement;
  stage: HTMLElement;
  listView: HTMLElement;
  notice: HTMLElement;
}

export function renderPage(root: HTMLElement, content: Content): PageSlots {
  const range = yearRange(content.songs);
  const v = strings.views;
  root.innerHTML = `
    <canvas class="sky" aria-hidden="true"></canvas>
    <header class="wrap hero">
      <div class="eyebrow">${strings.hero.eyebrow(content.songs.length, range.first, range.last)}</div>
      <h1>${strings.hero.title}</h1>
      <p class="lead">${strings.hero.intro}</p>
    </header>
    <main>
      <section class="wrap map" aria-label="${v.mapLabel}">
        <div data-slot="filters"></div>
        <div class="pane">
          <div class="viewbar">
            <div class="vseg" role="tablist" aria-label="${v.label}">
              <button type="button" role="tab" id="tab-record" aria-controls="stage">${v.record}</button>
              <button type="button" role="tab" id="tab-list" aria-controls="listview">${v.list}</button>
            </div>
          </div>
          <p class="notice" role="status" data-slot="notice" hidden></p>
          <div class="stage" id="stage" role="tabpanel" aria-labelledby="tab-record"></div>
          <div class="listview" id="listview" role="tabpanel" aria-labelledby="tab-list" hidden></div>
        </div>
      </section>
    </main>`;
  mountSky(root.querySelector<HTMLCanvasElement>('.sky')!);
  const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
  return {
    filters: q('[data-slot="filters"]'),
    tabRecord: q('#tab-record'),
    tabList: q('#tab-list'),
    stage: q('#stage'),
    listView: q('#listview'),
    notice: q('[data-slot="notice"]'),
  };
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
