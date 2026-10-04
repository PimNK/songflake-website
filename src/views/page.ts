// The static page frame: hero, the map section (filter panel + view switch + views), legend,
// "How to read a snowflake" and footer. Returns the slots other views fill in.
import type { Content } from '../content/load';
import { yearRange } from '../domain/record-layout';
import { strings } from '../strings';

export interface PageSlots {
  filters: HTMLElement;
  tabRecord: HTMLButtonElement;
  tabList: HTMLButtonElement;
  viewNote: HTMLElement;
  stage: HTMLElement;
  listView: HTMLElement;
  legend: HTMLElement;
  howTo: HTMLElement;
  notice: HTMLElement;
}

export function renderPage(root: HTMLElement, content: Content): PageSlots {
  const range = yearRange(content.songs);
  const v = strings.views;
  root.innerHTML = `
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
            <span class="vnote" data-slot="note"></span>
          </div>
          <p class="notice" role="status" data-slot="notice" hidden></p>
          <div class="stage" id="stage" role="tabpanel" aria-labelledby="tab-record"></div>
          <div class="listview" id="listview" role="tabpanel" aria-labelledby="tab-list" hidden></div>
        </div>
      </section>
      <section class="wrap"><div class="legend" data-slot="legend"></div></section>
      <section class="wrap study" data-slot="howto"></section>
    </main>
    <footer class="wrap">${strings.footer}</footer>`;
  const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
  return {
    filters: q('[data-slot="filters"]'),
    tabRecord: q('#tab-record'),
    tabList: q('#tab-list'),
    viewNote: q('[data-slot="note"]'),
    stage: q('#stage'),
    listView: q('#listview'),
    legend: q('[data-slot="legend"]'),
    howTo: q('[data-slot="howto"]'),
    notice: q('[data-slot="notice"]'),
  };
}

/** Shows one view, marks its tab, and sets the hint and the notice. */
export function showView(slots: PageSlots, view: 'record' | 'list', notice: string | null): void {
  const rec = view === 'record';
  slots.stage.hidden = !rec;
  slots.listView.hidden = rec;
  slots.tabRecord.setAttribute('aria-selected', String(rec));
  slots.tabList.setAttribute('aria-selected', String(!rec));
  // Roving tabindex: only the active tab is a Tab stop; ← / → reach the other.
  slots.tabRecord.tabIndex = rec ? 0 : -1;
  slots.tabList.tabIndex = rec ? -1 : 0;
  slots.viewNote.textContent = rec ? strings.views.recordNote : strings.views.listNote;
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
