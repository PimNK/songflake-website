// The track card's sections (CLAUDE.md §4.3): five cells, in this order (the phone's; wide cards
// place them by grid areas) — the story, the years (a scale with icicles), the style (a lit pad),
// the main instrument (lit pads), complexity (the five axes as rows of lamps, and X/15) — and the
// turning snowflake, which sits in the player's display. DOM only; rules come from domain/.
import { AXES, type Song } from '../content/parse';
import type { Taxonomy } from '../content/taxonomy';
import { FROST_LINE } from '../domain/ray-colours';
import { flakeOf } from '../domain/snowflake';
import { timeline, type Station } from '../domain/timeline';
import { paintSnowflake } from '../render/snowflake';
import { strings } from '../strings';
import { axisLamps, esc, info, turnStyle } from './html';
import { renderMarkdown } from './markdown';

const c = strings.card;
const CARD_FLAKE_RADIUS = 80;

export const leadColour = (song: Song, taxonomy: Taxonomy): string =>
  taxonomy.accents.find((a) => a.id === song.accents[0])?.colour ?? FROST_LINE;

/** One lit pad per instrument, as in the filter panel, its light in the instrument's colour. */
function listenPads(song: Song, taxonomy: Taxonomy): string {
  return song.accents
    .map((id) => {
      const a = taxonomy.accents.find((x) => x.id === id);
      if (!a) return '';
      return `<span class="pad lit" style="--led:${esc(a.colour)}"><i></i><span>${esc(a.name)}</span></span>`;
    })
    .join('');
}

const timelineInfo = (): string =>
  (['idea', 'concept', 'ready'] as const)
    .map((k) => `<span class="term"><b>${c[k]}</b> — ${c.timelineInfo[k]}</span>`)
    .join('');

const totalInfo = (): string =>
  `<small>${c.totalInfoNote}</small>` +
  AXES.map((a) => `<span class="term"><b>${strings.axes[a]}</b> — ${c.totalInfo[a]}</span>`).join(
    '',
  );

/**
 * A scale with the three stations hanging from it as icicles (idea, concept in the middle, ready),
 * the part reached lit; under each its name and year.
 */
function stations(song: Song): string {
  const { stations: st, lit } = timeline(song.years);
  const label = { idea: c.idea, concept: c.concept, ready: c.ready };
  const pos = (s: Station): string => `--at:${(s.at * 100).toFixed(2)}%`;
  const icicles = st
    .map((s) => `<i class="yic${s.year === null ? ' off' : ''}" style="${pos(s)}"></i>`)
    .join('');
  const marks = st
    .map((s) => {
      const year = s.year ?? (s.key === 'ready' ? c.notYet : '—');
      return `<div class="ymk ${s.key}${s.year === null ? ' missing' : ''}" style="${pos(s)}"><span class="label">${label[s.key]}</span><span class="yr">${year}</span></div>`;
    })
    .join('');
  return `<div class="ytrack" style="--lit:${(lit * 100).toFixed(2)}%">${icicles}</div><div class="ymarks">${marks}</div>`;
}

const heading = (text: string, note = ''): string =>
  `<div class="ch"><h3>${text}</h3>${note}</div>`;

/** The five axes as rows of three lamps, as in the record's tooltip, with X/15 under them. */
function complexity(song: Song): string {
  const label = c.complexityLabel(
    song.complexityTotal,
    AXES.map((a) => [strings.axes[a], song.complexity[a]]),
  );
  return `<div class="tax cplx" role="img" aria-label="${esc(label)}">${axisLamps(song.complexity)}<span class="chip ctotal">${c.totalOf(song.complexityTotal)}</span></div>`;
}

/** Fills the card's cells and its snowflake slot for one song. */
export function renderCardBody(
  grid: HTMLElement,
  flakeSlot: HTMLElement,
  song: Song,
  taxonomy: Taxonomy,
): void {
  const colour = leadColour(song, taxonomy);
  const story = song.story ? renderMarkdown(song.story) : `<p>${c.storyEmpty}</p>`;
  grid.style.setProperty('--lead', colour);
  grid.innerHTML = `
    <section class="cell story-cell">${heading(c.story)}<div class="story">${story}</div></section>
    <section class="cell time-cell">${heading(c.timeline, info(timelineInfo()))}
      <div class="years">${stations(song)}</div></section>
    <section class="cell style-cell">${heading(c.style)}
      <div class="lpads"><span class="pad lit"><i></i><span>${esc(song.style)}</span></span></div></section>
    <section class="cell listen-cell">${heading(c.listen, info(c.listenInfo, true))}
      <div class="lpads">${listenPads(song, taxonomy)}</div></section>
    <section class="cell total-cell">${heading(c.total, info(totalInfo(), true))}
      ${complexity(song)}</section>`;
  flakeSlot.innerHTML = `<canvas class="turn" style="${turnStyle(song)}"></canvas>`;
  const flake = flakeOf(song, taxonomy);
  paintSnowflake(
    flakeSlot.querySelector('canvas')!,
    flake.params,
    flake.colours,
    CARD_FLAKE_RADIUS,
  );
}
