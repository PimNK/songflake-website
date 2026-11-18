// The English UI strings; ru.ts has the same shape. Song titles and stories are the author's.
import type { Axis } from '../content/parse';

/** The site's name: the page title and the record's centre label. */
export const site = 'SONGFLAKE';

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

export const en = {
  aboutBlock: 'About this block',

  hero: {
    title: site,
    about: 'About',
    // The About button's face; `about` is its accessible name and the window's title.
    aboutGlyph: '?',
    // The language switch shows the current language.
    lang: 'EN',
    langLabel: 'Language: English. Switch to Russian',
    // Shown with its line breaks; «_» opens a list line.
    intro: [
      'This is where I share my music.',
      '',
      'Every time I play someone a track, I want to tell them a lot about it and point out certain moments.',
      'Spotify, SoundCloud, Yandex Music and other services give no way to do that.',
      'So I had to invent my own.',
      'The story of a track and notes right beside each piece.',
      '',
      'Each song is shown as a snowflake pattern.',
      'Its colour depends on the main instruments.',
      'Its shape is set by the song’s parameters:',
      '_rhythm,',
      '_melody,',
      '_technique,',
      '_instruments,',
      '_structure.',
      '',
      'SONGFLAKE.',
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
    mapLabel: 'Track map',
    toRecord: 'Scroll down to the tracks',
    scroll: 'scroll',
  },

  filters: {
    toggleLabel: (n: number, total: number) => `Filters: ${n} of ${total} tracks shown`,
    style: 'Style',
    complexity: 'Complexity',
    range: (min: number, max: number) => `${min} – ${max}`,
    min: 'min',
    max: 'max',
    year: 'Year',
    from: 'from',
    to: 'to',
    listen: 'Main instrument',
    all: 'Select all',
    status: 'Status',
    ready: 'Ready',
    inProgress: 'In progress',
    reset: 'Reset filters',
    info: {
      style: 'The genre a track leans to.',
      listen: 'The instruments that carry the main parts of a track.',
      complexity:
        'The sum of relative complexity points over rhythm, melody, technique, instruments and structure.',
      year: 'The year a track was recorded.',
      status: 'Ready tracks are recorded; tracks in progress are still being worked on.',
    },
  },

  record: {
    canvasLabel: 'A record of the tracks; the List view shows the same tracks.',
    labelSide: (first: number, last: number) => `SIDE A · ${first} — ${last}`,
    labelTracks: (n: number) => `${plural(n, 'TRACK', 'TRACKS')} · 33⅓ RPM`,
    labelShort: '33⅓ RPM',
    labelName: site,
  },

  list: {
    year: (style: string, year: string) => `${style} · ${year}`,
    inProgress: 'in progress',
    empty: 'No tracks match these filters. Use “Reset filters” on the panel.',
  },

  card: {
    prev: 'Previous track',
    next: 'Next track',
    listen: 'Main instrument',
    listenInfo: 'The instrument parts that form the core. They set the colours of the snowflake.',
    style: 'Style',
    story: 'Story',
    storyEmpty: 'The story of this track is still to be written.',
    timeline: 'Years',
    timelineInfo: {
      idea: 'only the melody or the idea of the song.',
      concept: 'the structure of the piece and the parts of the main instruments.',
      ready: 'the track is recorded.',
    },
    idea: 'Idea',
    concept: 'Concept',
    ready: 'Ready',
    notYet: 'not yet',
    total: 'Complexity',
    totalInfoNote: 'Complexity points relative to the other tracks.',
    totalInfo: {
      rhythm: 'how intricate the rhythm is: changes of meter, transitions.',
      melody: 'how far the tunes travel: range, leaps, how many lines move at once.',
      technique: 'how hard the parts are to play.',
      instruments: 'the number of instruments and layers in the arrangement.',
      structure: 'how the song is built: from verse–chorus to many sections and turns.',
    } satisfies Record<Axis, string>,
    complexityLabel: (total: number, pairs: [string, number][]) =>
      `Complexity ${total} of 15: ${pairs.map(([n, v]) => `${n} ${v} of 3`).join(', ')}`,
    totalOf: (total: number) => `${total}/15`,
    notFound: 'Track not found',
  },

  player: {
    label: 'Player',
    play: 'Play',
    pause: 'Pause',
    noAudio: 'Recording coming soon',
    ready: 'Press play to listen',
    pinAt: (time: string, text: string) => `Pin at ${time}: ${text}`,
    seek: 'Seek',
    volume: 'Volume',
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
    card: 'Open the track card',
    toList: 'Back to the tracks',
  },

  backlight: {
    brightness: 'Backlight brightness',
    tone: 'Backlight colour: from cold to warm',
    cold: 'cold',
    neutral: 'neutral',
    warm: 'warm',
  },

  hints: {
    label: 'How to use this page',
    steps: [
      'Select a snowflake to listen to the song.',
      'Or press ▶ here to play a random track.',
      'Apply filters to show only certain tracks.',
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
};

export type Strings = typeof en;
