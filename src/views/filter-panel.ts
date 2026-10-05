// Filter controls generated from the taxonomy and the counts (CLAUDE.md §4.2), in a panel that
// the Filters toggle opens and closes (closed by default). No filtering logic: every change goes
// through domain/filters.ts and back to the store.
import type { Content } from '../content/load';
import {
  COMPLEXITY_MAX,
  COMPLEXITY_MIN,
  countOptions,
  defaultFilters,
  setRange,
  toggle,
  type FilterState,
} from '../domain/filters';
import { strings } from '../strings';
import { esc } from './html';

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

const option = (o: Option): string => `
  <label class="fopt${o.count ? '' : ' zero'}">
    <input type="checkbox" data-kind="${o.kind}" data-id="${esc(o.id)}">
    ${o.colour ? `<i style="background:${esc(o.colour)}"></i>` : ''}<span>${esc(o.label)}</span>
    <span class="n">${o.count}</span>
  </label>`;

function template(content: Content): string {
  const { taxonomy, songs } = content;
  const c = countOptions(songs, taxonomy);
  const styles = taxonomy.styles.map((s) =>
    option({
      kind: 'style',
      id: s,
      label: s,
      count: c.styles[s] ?? 0,
      colour: taxonomy.styleColours[s],
    }),
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
  const range = (end: 'min' | 'max') =>
    `<label>${f[end]}<input type="range" data-range="${end}" min="${COMPLEXITY_MIN}" max="${COMPLEXITY_MAX}" step="1"></label>`;
  return `
      <div class="fbody">
        <div class="fgroup"><div class="flabel">${f.style}</div><div class="flist">${styles.join('')}</div></div>
        <div class="fgroup"><div class="flabel">${f.complexity} <b data-range-label></b></div>
          <div class="range">${range('min')}${range('max')}</div></div>
        <div class="fgroup"><div class="flabel">${f.listen} <button type="button" data-all>${f.allNone}</button></div>
          <div class="fgrid">${accents.join('')}</div></div>
        <div class="fgroup"><div class="flabel">${f.recorded}</div><div class="flist">
          ${option({ kind: 'band', id: 'band', label: f.withBand, count: c.band })}
          ${option({ kind: 'band', id: 'solo', label: f.solo, count: c.solo })}</div></div>
        <div class="fgroup" ${c.inProgress ? '' : 'hidden'}><div class="flabel">${f.status}</div><div class="flist">
          ${option({ kind: 'status', id: 'ready', label: f.ready, count: c.ready })}
          ${option({ kind: 'status', id: 'inProgress', label: f.inProgress, count: c.inProgress })}</div></div>
        <button type="button" class="btn freset" data-reset>${f.reset}</button>
      </div>`;
}

function isChecked(filters: FilterState, kind: string, id: string): boolean {
  if (kind === 'style') return filters.styles.has(id);
  if (kind === 'accent') return filters.accents.has(id);
  if (kind === 'band') return id === 'band' ? filters.band : filters.solo;
  return id === 'ready' ? filters.ready : filters.inProgress;
}

function withOption(filters: FilterState, kind: string, id: string, on: boolean): FilterState {
  if (kind === 'style') return { ...filters, styles: toggle(filters.styles, id, on) };
  if (kind === 'accent') return { ...filters, accents: toggle(filters.accents, id, on) };
  if (kind === 'band') return { ...filters, [id === 'band' ? 'band' : 'solo']: on };
  return { ...filters, [id === 'ready' ? 'ready' : 'inProgress']: on };
}

/**
 * The toggle shows «Filters N / total». Esc closes the panel (focus returns to the toggle when
 * it was inside); over the record a click outside closes it too. In the List view the panel is
 * a column beside the tiles, so it stays until toggled.
 */
function wireToggle(toggle: HTMLButtonElement, el: HTMLElement): void {
  const isOpen = (): boolean => toggle.getAttribute('aria-expanded') === 'true';
  const setOpen = (open: boolean): void => {
    el.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!isOpen()));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isOpen() || document.body.classList.contains('locked')) return;
    const inside = el.contains(document.activeElement);
    setOpen(false);
    if (inside) toggle.focus();
  });
  document.addEventListener('pointerdown', (e) => {
    const t = e.target as Node;
    const overRecord = el.closest<HTMLElement>('[data-view]')?.dataset.view === 'record';
    if (isOpen() && overRecord && !el.contains(t) && !toggle.contains(t)) setOpen(false);
  });
}

export function mountFilterPanel(
  el: HTMLElement,
  toggle: HTMLButtonElement,
  content: Content,
  current: () => FilterState,
  onChange: (filters: FilterState) => void,
): FilterPanel {
  el.innerHTML = template(content);
  toggle.innerHTML = `${f.toggle} <span class="count" data-count></span>`;
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
    if (end) onChange(setRange(current(), end, Number(input.value)));
  });
  el.querySelector('[data-all]')!.addEventListener('click', () => {
    const all = current().accents.size < allAccents.length;
    onChange({ ...current(), accents: new Set(all ? allAccents : []) });
  });
  el.querySelector('[data-reset]')!.addEventListener('click', () => {
    onChange(defaultFilters(content.taxonomy));
  });

  return {
    update(filters, matching) {
      toggle.querySelector('[data-count]')!.textContent = f.count(matching, total);
      el.querySelector('[data-range-label]')!.textContent = f.range(filters.min, filters.max);
      el.querySelectorAll<HTMLInputElement>('input[data-kind]').forEach((input) => {
        input.checked = isChecked(filters, input.dataset.kind!, input.dataset.id!);
      });
      el.querySelectorAll<HTMLInputElement>('input[data-range]').forEach((input) => {
        input.value = String(input.dataset.range === 'min' ? filters.min : filters.max);
      });
    },
  };
}
