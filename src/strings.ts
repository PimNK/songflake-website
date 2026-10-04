// Every user-visible UI string lives here (English). Song titles and stories are the author's.
import type { Axis } from './content/parse';

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

export const strings = {
  siteTitle: 'Regularnik',
  tracks: (n: number) => plural(n, 'track'),
  years: (n: number) => plural(n, 'year'),

  hero: {
    eyebrow: (n: number, first: number, last: number) =>
      `Music diary · ${plural(n, 'track')} · ${first === last ? first : `${first} — ${last}`}`,
    title: 'Regularnik',
    intro:
      'Every track I have recorded, pressed into one record. Each one is a snowflake computed from how it was made: rhythm, melody, technique, instruments and structure. The further from the label, the later it was finished. Click a snowflake to open the track, or switch to the list.',
  },

  axes: {
    rhythm: 'Rhythm',
    melody: 'Melody',
    technique: 'Technique',
    instruments: 'Instruments',
    structure: 'Structure',
  } satisfies Record<Axis, string>,

  views: {
    label: 'View',
    record: '◉ Record',
    list: '☰ List',
    recordNote: 'sectors · styles  ·  distance · year',
    listNote: 'newest first',
    mapLabel: 'Track map',
  },

  filters: {
    title: 'Filter the record',
    count: (n: number, total: number) => `${n} / ${total}`,
    style: 'Style',
    complexity: 'Total complexity',
    range: (min: number, max: number) => `${min} – ${max}`,
    min: 'min',
    max: 'max',
    listen: 'What to listen for',
    allNone: 'all / none',
    recorded: 'Recorded',
    withBand: 'With a band',
    solo: 'Solo',
    status: 'Status',
    ready: 'Ready',
    inProgress: 'In progress',
    reset: 'Reset filters',
  },

  record: {
    canvasLabel:
      'A vinyl record map of tracks: sectors are styles, distance from the label is the year. The List view shows the same tracks as tiles.',
    hint: 'scroll or pinch to zoom · drag to move · click a snowflake',
    pause: 'Pause',
    spin: 'Spin',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    reset: 'Reset',
    readout: (zoom: number, step: number) =>
      `×${zoom.toFixed(1)} · rings every ${plural(step, 'year')}`,
    tooltip: (style: string, band: boolean, year: string, total: number) =>
      `${style} · ${band ? 'band' : 'solo'} · ${year} · complexity ${total}/15`,
    labelSide: (first: number, last: number) => `SIDE A · ${first} — ${last}`,
    labelTracks: (n: number) => `${plural(n, 'TRACK')} · 33⅓ RPM`,
    labelShort: '33⅓ RPM',
    labelName: 'REGULARNIK',
  },

  list: {
    year: (style: string, year: string) => `${style} · ${year}`,
    inProgress: 'in progress',
    band: 'recorded with a band',
    empty: 'No tracks match these filters. Use “Reset filters” on the panel.',
  },

  legend: {
    record: 'The record',
    snowflake: 'The snowflake',
    colour: 'The colour',
    recordRows: (first: number, last: number): [string, string][] => [
      ['Sector', 'style; wider when it holds more tracks'],
      ['Distance', `year finished — the label is ${first}, the edge is ${last}`],
      ['Zoom', 'rings every 5 years → 3 years → 1 year'],
      ['Size', 'total complexity, 5–15'],
      ['Faded', 'hidden by the filters'],
    ],
    snowflakeRows: [
      ['Structure', '4 / 6 / 8 rays'],
      ['Rhythm', 'forks at the tip, 1 / 2 / 3 levels deep'],
      ['Melody', 'a wave along the main ray'],
      ['Technique', 'offshoots mid-ray: none / two / branching'],
      ['Instruments', 'inner rings: 1 / 2 / 3'],
      ['Band', 'dashed halo'],
    ] as [string, string][],
    colourRows: [
      ['Ray', 'one instrument to listen for; they take turns round the flake'],
      ['Gradient', 'frost at the centre → pure colour at the tip'],
    ] as [string, string][],
  },

  howTo: {
    kicker: 'Form',
    title: 'How to read a snowflake',
    intro:
      'Each row moves one parameter from 1 to 3 while the others stay at 2. The last row shows the dashed halo of a track recorded with a band.',
    rows: {
      rhythm: 'forks at the tip',
      melody: 'a gentle wave along the main ray',
      technique: 'offshoots from the middle of each ray',
      instruments: 'inner rings',
      structure: 'number of rays',
    } satisfies Record<Axis, string>,
    band: 'Band',
    bandRow: 'dashed halo',
    solo: 'solo',
    withBand: 'band',
  },

  card: {
    prev: 'Previous track',
    next: 'Next track',
    close: 'Close',
    listen: 'What to listen for',
    listenInfo:
      "What I'd like you to notice while listening — the parts this track is built around. They also colour the rays of the snowflake.",
    aboutBlock: 'About this block',
    lead: 'lead',
    recordedWith: 'Recorded with',
    recordedWithBand: 'Recorded with a band',
    bandUnnamed: 'Band not named yet',
    bandUnnamedHint: 'The name of the band is not filled in yet.',
    bandNoAbout: 'No description yet.',
    soloRecording: 'Solo recording',
    story: 'Story',
    storyEmpty: 'The story of this track is still to be written.',
    timeline: 'From idea to recording',
    idea: 'Idea',
    concept: 'Concept',
    ready: 'Ready',
    sameYear: 'same year',
    notYet: 'not yet',
    total: (n: number) => `Total complexity <b>${n}</b> / 15`,
    radarLabel: (pairs: [string, number][]) =>
      `Complexity radar: ${pairs.map(([n, v]) => `${n} ${v} of 3`).join(', ')}`,
    notFound: 'Track not found',
  },

  player: {
    label: 'Player',
    play: 'Play',
    pause: 'Pause',
    noAudio: 'Recording coming soon',
    pinAt: (time: string, text: string) => `Pin at ${time}: ${text}`,
    pins: 'Pinned notes',
    copyLink: 'Copy link',
    copied: 'Link copied',
    seek: 'Seek',
    mini: 'Now playing',
    closeMini: 'Stop and close the player',
    pastEnd: (slug: string, time: string) =>
      `songs/${slug}/index.md: pin at ${time} is past the end of the recording`,
  },

  overlay: {
    errors: (n: number) => `${plural(n, 'content error')} — these songs are left out`,
    warnings: (n: number) => plural(n, 'content warning'),
    hint: 'Shown in development only. Fix the files and the page reloads.',
    close: 'Close',
  },

  footer: 'Music diary. Every snowflake is computed from the track it belongs to.',
} as const;
