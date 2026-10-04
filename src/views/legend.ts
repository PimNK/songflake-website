// The three-column legend under the record, and "How to read a snowflake": rows drawn with the
// same rendering code from synthetic songs — not images.
import { AXES, type Axis } from '../content/parse';
import type { Taxonomy } from '../content/taxonomy';
import type { YearRange } from '../domain/record-layout';
import { flakeOf, sampleComplexity } from '../domain/snowflake';
import { paintSnowflake } from '../render/snowflake';
import { strings } from '../strings';
import { esc } from './html';

const rows = (items: [string, string][]): string =>
  `<ul>${items.map(([k, v]) => `<li><span>${k}</span><span>${v}</span></li>`).join('')}</ul>`;

export function renderLegend(el: HTMLElement, taxonomy: Taxonomy, range: YearRange): void {
  const l = strings.legend;
  const swatches = taxonomy.accents
    .map((a) => `<span><i style="background:${esc(a.colour)}"></i>${esc(a.name)}</span>`)
    .join('');
  el.innerHTML = `
    <div><h3>${l.record}</h3>${rows(l.recordRows(range.first, range.last))}</div>
    <div><h3>${l.snowflake}</h3>${rows(l.snowflakeRows)}</div>
    <div><h3>${l.colour}</h3>${rows(l.colourRows)}<div class="sw">${swatches}</div></div>`;
}

const SAMPLE_RADIUS = 34;

export function renderHowTo(el: HTMLElement, taxonomy: Taxonomy): void {
  const h = strings.howTo;
  // Up to three instruments from the taxonomy, so the sample shows rays taking turns.
  const accents = taxonomy.accents.slice(0, 3).map((a) => a.id);
  const sample = (axis: Axis | null, value: number, band: boolean) => {
    const complexity = sampleComplexity(axis ? { [axis]: value } : {});
    return flakeOf({ complexity, accents, band: band ? '' : null }, taxonomy);
  };
  const row = (
    name: string,
    note: string,
    cells: { flake: ReturnType<typeof sample>; caption: string }[],
  ) => {
    const tr = document.createElement('div');
    tr.className = 'howto-row';
    tr.innerHTML = `<div class="howto-name"><b>${name}</b><small>${note}</small></div><div class="trio"></div>`;
    const trio = tr.querySelector('.trio')!;
    for (const { flake, caption } of cells) {
      const fig = document.createElement('figure');
      const canvas = document.createElement('canvas');
      paintSnowflake(canvas, flake.params, flake.colours, SAMPLE_RADIUS);
      const cap = document.createElement('figcaption');
      cap.textContent = caption;
      fig.append(canvas, cap);
      trio.append(fig);
    }
    return tr;
  };
  el.innerHTML = `
    <header><div class="kicker">${h.kicker}</div><h2>${h.title}</h2><p class="lead">${h.intro}</p></header>
    <div class="howto"></div>`;
  const grid = el.querySelector('.howto')!;
  for (const axis of AXES) {
    const cells = [1, 2, 3].map((v) => ({ flake: sample(axis, v, false), caption: String(v) }));
    grid.append(row(strings.axes[axis], h.rows[axis], cells));
  }
  grid.append(
    row(h.band, h.bandRow, [
      { flake: sample(null, 2, false), caption: h.solo },
      { flake: sample(null, 2, true), caption: h.withBand },
    ]),
  );
}
