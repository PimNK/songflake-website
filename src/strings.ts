// Every user-visible UI string lives here (English). Song titles and stories are the author's.
import type { Axis } from './content/parse';

/** The site's name: the page title and the record's centre label. */
const site = 'OBYCHNO_';

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

export const strings = {
  years: (n: number) => plural(n, 'year'),

  hero: {
    title: site,
    // Shown with its line breaks; «_» opens a list line.
    intro: [
      'You are looking at my music diary:',
      '_my solo recordings,',
      '_collaboration recordings.',
      '',
      'Each song is a snowflake.',
      "It's computed from song parameters:",
      '_rhythm,',
      '_melody,',
      '_technique,',
      '_instruments,',
      '_structure.',
      '',
      'Click a snowflake to open the track.',
      'Check the notes on where to focus your attention.',
    ].join('\n'),
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
    record: 'Record',
    list: 'List',
    recordGlyph: '◉',
    listGlyph: '☰',
    mapLabel: 'Track map',
    toRecord: 'Scroll down to the record',
    toIntro: 'Back to the intro',
  },

  filters: {
    toggle: 'Filters',
    count: (n: number, total: number) => `${n} / ${total}`,
    style: 'Style',
    complexity: 'Total complexity',
    range: (min: number, max: number) => `${min} – ${max}`,
    min: 'min',
    max: 'max',
    listen: 'What to listen for',
    allNone: 'all / none',
    status: 'Status',
    ready: 'Ready',
    inProgress: 'In progress',
    reset: 'Reset filters',
  },

  record: {
    canvasLabel:
      'A vinyl record map of tracks: sectors are styles, distance from the label is the year. The List view shows the same tracks as tiles.',
    tooltip: (style: string, band: boolean, year: string, total: number) =>
      `${style} · ${band ? 'band' : 'solo'} · ${year} · complexity ${total}/15`,
    labelSide: (first: number, last: number) => `SIDE A · ${first} — ${last}`,
    labelTracks: (n: number) => `${plural(n, 'TRACK', 'TRACKS')} · 33⅓ RPM`,
    labelShort: '33⅓ RPM',
    labelName: site,
  },

  list: {
    year: (style: string, year: string) => `${style} · ${year}`,
    inProgress: 'in progress',
    band: 'recorded with a band',
    empty: 'No tracks match these filters. Use “Reset filters” on the panel.',
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
    timelineInfo: {
      idea: 'the main melody or the idea of the song appears.',
      concept: 'the song has a structure for the main instruments.',
      ready: 'the track is recorded and you can listen to it.',
    },
    idea: 'Idea',
    concept: 'Concept',
    ready: 'Ready',
    sameYear: 'same year',
    notYet: 'not yet',
    total: (n: number) => `Total complexity <b>${n}</b> / 15`,
    totalInfo: {
      rhythm: 'how intricate the beat is: meter, syncopation, changes of groove.',
      melody: 'how far the tunes travel: range, leaps, how many lines move at once.',
      technique: 'how hard the parts are to play.',
      instruments: 'how many instruments and layers are in the arrangement.',
      structure: 'how the song is built: from verse–chorus to many sections and turns.',
    } satisfies Record<Axis, string>,
    totalInfoNote: 'Each axis is 1–3; the five together give the total, 5–15.',
    radarLabel: (pairs: [string, number][]) =>
      `Complexity radar: ${pairs.map(([n, v]) => `${n} ${v} of 3`).join(', ')}`,
    notFound: 'Track not found',
  },

  player: {
    label: 'Player',
    play: 'Play',
    pause: 'Pause',
    playGlyph: '▶',
    pauseGlyph: '❚❚',
    noAudio: 'Recording coming soon',
    pinAt: (time: string, text: string) => `Pin at ${time}: ${text}`,
    seek: 'Seek',
    download: '↓ Download',
    downloadLabel: (title: string) => `Download “${title}”`,
    pastEnd: (slug: string, time: string) =>
      `songs/${slug}/index.md: pin at ${time} is past the end of the recording`,
  },

  random: {
    label: 'Random track player',
    idle: '⤮ Plays a random track',
    nowPlaying: 'Now playing',
    paused: 'Paused',
    play: 'Play a random track',
    prev: 'Previous track',
    next: 'Next random track',
    openCard: (title: string) => `Open “${title}”`,
  },

  hints: {
    label: 'How to use this page',
    steps: [
      'Select a snowflake to play the song and read about it.',
      'Or press play here for a random track. ⏭ picks another one.',
      'Narrow the tracks down by style, complexity and instrument.',
    ],
    step: (n: number, total: number) => `${n} / ${total}`,
    next: 'Next',
    done: 'Got it',
    skip: 'Skip',
  },

  overlay: {
    errors: (n: number) => `${plural(n, 'content error')} — these songs are left out`,
    warnings: (n: number) => plural(n, 'content warning'),
    hint: 'Shown in development only. Fix the files and the page reloads.',
    close: 'Close',
  },
} as const;
