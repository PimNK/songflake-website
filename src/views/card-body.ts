// The track card's sections (CLAUDE.md §4.3): idea → recording and the story on the left; on the
// right what to listen for (and the band marker), then the turning snowflake beside the radar.
// DOM only; rules come from domain/.
import { AXES, type Song } from '../content/parse';
import type { Bands, Taxonomy } from '../content/taxonomy';
import { rgba } from '../domain/colour';
import { FROST_LINE } from '../domain/ray-colours';
import { flakeOf } from '../domain/snowflake';
import { timeline, type Station } from '../domain/timeline';
import { radarSvg } from '../render/radar';
import { paintSnowflake } from '../render/snowflake';
import { strings } from '../strings';
import { bandRing, esc, turnStyle } from './html';
import { renderMarkdown } from './markdown';

const c = strings.card;
const CARD_FLAKE_RADIUS = 80;

export const leadColour = (song: Song, taxonomy: Taxonomy): string =>
  taxonomy.accents.find((a) => a.id === song.accents[0])?.colour ?? FROST_LINE;

function listenChips(song: Song, taxonomy: Taxonomy): string {
  return song.accents
    .map((id, i) => {
      const a = taxonomy.accents.find((x) => x.id === id);
      if (!a) return '';
      const col = esc(a.colour);
      const lead = i === 0 && song.accents.length > 1 ? `<small>${c.lead}</small>` : '';
      return `<span class="spot-chip" style="color:${col};border-color:${rgba(a.colour, 0.5)};background:${rgba(a.colour, 0.08)}"><i style="background:${col}"></i><span class="name">${esc(a.name)}</span>${lead}</span>`;
    })
    .join('');
}

/** An ⓘ that explains the block on hover or focus. */
const info = (bubble: string): string =>
  `<span class="qi" tabindex="0" aria-label="${c.aboutBlock}">i<span class="bubble" role="tooltip">${bubble}</span></span>`;

const timelineInfo = (): string =>
  (['idea', 'concept', 'ready'] as const)
    .map((k) => `<span class="term"><b>${c[k]}</b> — ${c.timelineInfo[k]}</span>`)
    .join('');

const totalInfo = (): string =>
  AXES.map((a) => `<span class="term"><b>${strings.axes[a]}</b> — ${c.totalInfo[a]}</span>`).join(
    '',
  ) + `<small>${c.totalInfoNote}</small>`;

function bandMarker(song: Song, bands: Bands): string {
  if (song.band === null) return '';
  if (song.band.trim() === '') {
    return `<span class="bandchip" tabindex="0">${bandRing(16)}${c.recordedWithBand}<span class="bubble" role="tooltip"><b>${c.bandUnnamed}</b>${c.bandUnnamedHint}</span></span>`;
  }
  const b = bands[song.band];
  const about = b?.about ? esc(b.about) : c.bandNoAbout;
  const years = b?.years ? `<small>${esc(b.years)}</small>` : '';
  const name = esc(song.band);
  return `<span class="bandchip" tabindex="0">${bandRing(16)}${c.recordedWith} <b>${name}</b><span class="bubble" role="tooltip"><b>${name}</b>${about}${years}</span></span>`;
}

function stations(song: Song, colour: string): string {
  const { stations: st, gaps } = timeline(song.years);
  const fill = (s: Station): string =>
    s.fill === 'hollow' ? 'transparent' : s.fill === 'half' ? rgba(colour, 0.45) : colour;
  const label = { idea: c.idea, concept: c.concept, ready: c.ready };
  const station = (s: Station): string =>
    `<div class="st${s.year === null ? ' missing' : ''}"><i style="border-color:${colour};background:${s.year === null ? 'transparent' : fill(s)}"></i><b>${s.year ?? (s.key === 'ready' ? c.notYet : '—')}</b><span>${label[s.key]}</span></div>`;
  const grad = `linear-gradient(90deg,${rgba(colour, 0.35)},${colour})`;
  const link = (g: (typeof gaps)[number]): string => {
    const text = g.years === null ? '' : g.years === 0 ? c.sameYear : strings.years(g.years);
    return `<div class="link" style="flex-grow:${g.grow};--grad:${grad}"><span>${text}</span></div>`;
  };
  return station(st[0]!) + link(gaps[0]!) + station(st[1]!) + link(gaps[1]!) + station(st[2]!);
}

/** Fills the card's grid for one song. */
export function renderCardBody(
  el: HTMLElement,
  song: Song,
  taxonomy: Taxonomy,
  bands: Bands,
): void {
  const colour = leadColour(song, taxonomy);
  const band = bandMarker(song, bands);
  const story = song.story ? renderMarkdown(song.story) : `<p class="muted">${c.storyEmpty}</p>`;
  el.innerHTML = `
    <div class="mleft">
      <section class="blk"><div class="spot-h"><h3>${c.timeline}</h3>${info(timelineInfo())}</div>
        <div class="stations">${stations(song, colour)}</div></section>
      <section class="blk"><h3>${c.story}</h3><div class="story">${story}</div></section>
    </div>
    <div class="mright">
      <section class="spot" aria-labelledby="spot-h">
        <div class="spot-h"><h3 id="spot-h">${c.listen}</h3>${info(c.listenInfo)}</div>
        <div class="spot-row">${listenChips(song, taxonomy)}</div>
        ${band ? `<div>${band}</div>` : ''}
      </section>
      <div class="spot-h total"><h3>${c.total(song.complexityTotal)}</h3>${info(totalInfo())}</div>
      <div class="flake-radar">
        <div class="flake-clip"><canvas class="turn" style="${turnStyle(song)}"></canvas></div>
        <div class="radar-box">${radarSvg(song.complexity, colour)}</div>
      </div>
    </div>`;
  const flake = flakeOf(song, taxonomy);
  paintSnowflake(el.querySelector('canvas')!, flake.params, flake.colours, CARD_FLAKE_RADIUS);
}
