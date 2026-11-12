// The track card's sections (CLAUDE.md §4.3): four cells — idea → recording (three indicator
// lamps), the main instrument (lit pads), the story, total complexity with the radar — and the
// turning snowflake, which sits in the player's display. DOM only; rules come from domain/.
import { AXES, type Song } from '../content/parse';
import type { Taxonomy } from '../content/taxonomy';
import { FROST_LINE } from '../domain/ray-colours';
import { flakeOf } from '../domain/snowflake';
import { timeline, type Gap, type Station } from '../domain/timeline';
import { radarSvg } from '../render/radar';
import { paintSnowflake } from '../render/snowflake';
import { strings } from '../strings';
import { esc, info, turnStyle } from './html';
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
  AXES.map((a) => `<span class="term"><b>${strings.axes[a]}</b> — ${c.totalInfo[a]}</span>`).join(
    '',
  ) + `<small>${c.totalInfoNote}</small>`;

/** Three lamps — hollow, half, full — with the years; the lines between them as long as the years. */
function stations(song: Song): string {
  const { stations: st, gaps } = timeline(song.years);
  const label = { idea: c.idea, concept: c.concept, ready: c.ready };
  const station = (s: Station): string => {
    const missing = s.year === null;
    const year = s.year ?? (s.key === 'ready' ? c.notYet : '—');
    return `<div class="st${missing ? ' missing' : ''}"><i class="lamp ${missing ? 'off' : s.fill}"></i><span class="label">${label[s.key]}</span><span class="chip">${year}</span></div>`;
  };
  const link = (g: Gap): string => {
    const kind = g.years === null ? ' none' : g.years === 0 ? ' zero' : '';
    return `<div class="link${kind}" style="flex-grow:${g.grow}"><i></i></div>`;
  };
  return station(st[0]!) + link(gaps[0]!) + station(st[1]!) + link(gaps[1]!) + station(st[2]!);
}

const heading = (text: string, note = ''): string =>
  `<div class="ch"><h3>${text}</h3>${note}</div>`;

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
    <section class="cell">${heading(c.timeline, info(timelineInfo()))}
      <div class="stations">${stations(song)}</div></section>
    <section class="cell">${heading(c.listen, info(c.listenInfo, true))}
      <div class="lpads">${listenPads(song, taxonomy)}</div></section>
    <section class="cell story-cell">${heading(c.story)}<div class="story">${story}</div></section>
    <section class="cell total-cell">${heading(c.total, info(totalInfo(), true))}
      <div class="radar-box">${radarSvg(song.complexity, colour)}</div></section>`;
  flakeSlot.innerHTML = `<canvas class="turn" style="${turnStyle(song)}"></canvas>`;
  const flake = flakeOf(song, taxonomy);
  paintSnowflake(
    flakeSlot.querySelector('canvas')!,
    flake.params,
    flake.colours,
    CARD_FLAKE_RADIUS,
  );
}
