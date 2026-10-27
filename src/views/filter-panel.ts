// Filter controls generated from the taxonomy, the songs' years and the counts (CLAUDE.md §4.2).
// Options are pads of one size in one grid, each with a light (the instrument's colour). Each group
// has an ⓘ note. From 1100 px the panel is always open under the player; narrower, it is a sheet
// above the bottom player, opened by the player's funnel toggle (closed by default).
// No filtering logic: every change goes through domain/filters.ts and back to the store.
import type { Content } from '../content/load';
import {
  COMPLEXITY_MAX,
  COMPLEXITY_MIN,
  countOptions,
  defaultFilters,
  isDefault,
  setRange,
  setYears,
  toggle,
  type FilterSpace,
  type FilterState,
} from '../domain/filters';
import { strings } from '../strings';
import { esc, info } from './html';

export interface FilterPanel {
  update(filters: FilterState, matching: number): void;
}

const f = strings.filters;

interface Option {
  kind: string;
  id: string;
  label: string;
  count: number;
  colour?: string;
}

// A pad: its light takes the instrument's colour (ice for the rest). No count is shown; an
// option no song carries is dimmed.
const option = (o: Option): string => `
  <label class="fopt pad${o.count ? '' : ' zero'}"${o.colour ? ` style="--led:${esc(o.colour)}"` : ''}>
    <input type="checkbox" data-kind="${o.kind}" data-id="${esc(o.id)}">
    <i></i><span>${esc(o.label)}</span>
  </label>`;

/** A funnel: the Filters toggle's icon (the word is its accessible name). */
const FUNNEL =
  '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4.5h14l-5.4 6.3v4.6l-3.2 1.6v-6.2z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';

/** A group's heading: its name with an ⓘ note, then whatever goes at its right. */
const label = (name: string, note: string, right = ''): string =>
  `<div class="flabel"><span class="fname">${name} ${info(note)}</span>${right}</div>`;

/**
 * One line with two thumbs, e.g. complexity min / max or years from / to: two range inputs over
 * one track; the part between the thumbs is lit (--lo / --hi, set in update).
 */
const range = (
  key: 'range' | 'years',
  name: string,
  ends: readonly ('min' | 'max' | 'from' | 'to')[],
  lo: number,
  hi: number,
): string =>
  `<div class="dual" data-dual="${key}">${ends
    .map(
      (end) =>
        `<input type="range" data-${key}="${end}" aria-label="${name}: ${f[end]}" min="${lo}" max="${hi}" step="1">`,
    )
    .join('')}</div>`;

function template(content: Content, space: FilterSpace): string {
  const { taxonomy, songs } = content;
  const { years } = space;
  const c = countOptions(songs, taxonomy);
  // Styles carry no colour dot here: they would read as instrument colours.
  const styles = taxonomy.styles.map((s) =>
    option({ kind: 'style', id: s, label: s, count: c.styles[s] ?? 0 }),
  );
  const accents = taxonomy.accents.map((a) =>
    option({
      kind: 'accent',
      id: a.id,
      label: a.name,
      count: c.accents[a.id] ?? 0,
      colour: a.colour,
    }),
  );
  const all = `<button type="button" data-all>${f.allNone}</button>`;
  return `
      <div class="fbody">
        <div class="fgroup">${label(f.style, f.info.style)}<div class="pads">${styles.join('')}</div></div>
        <div class="fgroup">${label(f.listen, f.info.listen, all)}
          <div class="pads">${accents.join('')}</div></div>
        <div class="franges">
          <div class="fgroup">${label(f.complexity, f.info.complexity, '<b data-range-label></b>')}
            ${range('range', f.complexity, ['min', 'max'], COMPLEXITY_MIN, COMPLEXITY_MAX)}</div>
          <div class="fgroup">${label(f.year, f.info.year, '<b data-years-label></b>')}
            ${range('years', f.year, ['from', 'to'], years.first, years.last)}</div>
        </div>
        <div class="fgroup" ${c.inProgress ? '' : 'hidden'}>${label(f.status, f.info.status)}<div class="pads">
          ${option({ kind: 'status', id: 'ready', label: f.ready, count: c.ready })}
          ${option({ kind: 'status', id: 'inProgress', label: f.inProgress, count: c.inProgress })}</div></div>
        <button type="button" class="freset" data-reset>${f.reset}</button>
      </div>`;
}

function isChecked(filters: FilterState, kind: string, id: string): boolean {
  if (kind === 'style') return filters.styles.has(id);
  if (kind === 'accent') return filters.accents.has(id);
  return id === 'ready' ? filters.ready : filters.inProgress;
}

function withOption(filters: FilterState, kind: string, id: string, on: boolean): FilterState {
  if (kind === 'style') return { ...filters, styles: toggle(filters.styles, id, on) };
  if (kind === 'accent') return { ...filters, accents: toggle(filters.accents, id, on) };
  return { ...filters, [id === 'ready' ? 'ready' : 'inProgress']: on };
}

/** From this width the panel is always open and the toggle is not shown (CSS). */
const WIDE = window.matchMedia('(min-width: 1100px)');

/**
 * Narrow screens: the toggle (in the bottom player) is a funnel that opens the sheet; a dot on it
 * says the filters are set. Esc or a click outside closes it (Esc returns focus to the toggle
 * when it was inside).
 */
function wireToggle(toggle: HTMLButtonElement, el: HTMLElement): void {
  const isOpen = (): boolean => toggle.getAttribute('aria-expanded') === 'true';
  const setOpen = (open: boolean): void => {
    el.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };
  setOpen(WIDE.matches);
  WIDE.addEventListener('change', () => setOpen(WIDE.matches));
  toggle.addEventListener('click', () => setOpen(!isOpen()));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || WIDE.matches || !isOpen()) return;
    if (document.body.classList.contains('locked')) return;
    const inside = el.contains(document.activeElement);
    setOpen(false);
    if (inside) toggle.focus();
  });
  document.addEventListener('pointerdown', (e) => {
    const t = e.target as Node;
    if (isOpen() && !WIDE.matches && !el.contains(t) && !toggle.contains(t)) setOpen(false);
  });
}

/** Sets a two-thumb line's values, the lit part between them, and which thumb is on top. */
function showDual(dual: HTMLElement, filters: FilterState): void {
  const [low, high] = [...dual.querySelectorAll('input')] as [HTMLInputElement, HTMLInputElement];
  const key = (i: HTMLInputElement): 'min' | 'max' | 'from' | 'to' =>
    (i.dataset.range ?? i.dataset.years) as 'min' | 'max' | 'from' | 'to';
  const [lo, hi] = [Number(low.min), Number(low.max)];
  const at = (v: number): string => `${hi > lo ? ((v - lo) / (hi - lo)) * 100 : 0}%`;
  low.value = String(filters[key(low)]);
  high.value = String(filters[key(high)]);
  dual.style.setProperty('--lo', at(filters[key(low)]));
  dual.style.setProperty('--hi', at(filters[key(high)]));
  // Both thumbs at the top end: the lower one must stay reachable, so it goes on top.
  low.classList.toggle('top', filters[key(low)] > (lo + hi) / 2);
}

export function mountFilterPanel(
  el: HTMLElement,
  toggle: HTMLButtonElement,
  content: Content,
  space: FilterSpace,
  current: () => FilterState,
  onChange: (filters: FilterState) => void,
): FilterPanel {
  el.innerHTML = template(content, space);
  toggle.innerHTML = `${FUNNEL}<span class="fdot" hidden></span>`;
  wireToggle(toggle, el);
  const total = content.songs.length;
  const allAccents = content.taxonomy.accents.map((a) => a.id);

  el.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.dataset.kind) {
      onChange(withOption(current(), input.dataset.kind, input.dataset.id!, input.checked));
    }
  });
  el.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    const end = input.dataset.range as 'min' | 'max' | undefined;
    const year = input.dataset.years as 'from' | 'to' | undefined;
    if (end) onChange(setRange(current(), end, Number(input.value)));
    if (year) onChange(setYears(current(), year, Number(input.value), space.years));
  });
  el.querySelector('[data-all]')!.addEventListener('click', () => {
    const all = current().accents.size < allAccents.length;
    onChange({ ...current(), accents: new Set(all ? allAccents : []) });
  });
  el.querySelector('[data-reset]')!.addEventListener('click', () => {
    onChange(defaultFilters(space));
  });

  return {
    update(filters, matching) {
      toggle.setAttribute('aria-label', f.toggleLabel(matching, total));
      toggle.querySelector<HTMLElement>('.fdot')!.hidden = isDefault(filters, space);
      el.querySelector('[data-range-label]')!.textContent = f.range(filters.min, filters.max);
      el.querySelector('[data-years-label]')!.textContent = f.range(filters.from, filters.to);
      el.querySelectorAll<HTMLInputElement>('input[data-kind]').forEach((input) => {
        input.checked = isChecked(filters, input.dataset.kind!, input.dataset.id!);
      });
      el.querySelectorAll<HTMLElement>('[data-dual]').forEach((dual) => showDual(dual, filters));
    },
  };
}
