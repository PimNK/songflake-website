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
      'You are looking at my music diary,',
      'which holds mostly my solo recordings.',
      '',
      'I have always wanted to know what lies beneath the sounds and parts of a song I like — or, on the contrary, of one I do not understand.',
      'I wish artists would suggest what to listen for, and why.',
      '',
      'Here I offer a way for artists and listeners to talk:',
      'notes and the story behind each song, right beside it.',
      '',
      'Each song is a snowflake.',
      'Colours come from the main instruments.',
      'Shape is computed from the song’s parameters:',
      '_rhythm,',
      '_melody,',
      '_technique,',
      '_instruments,',
      '_structure.',
      '',
      'Click a snowflake to open the track.',
      'Enjoy.',
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
    complexity: 'Total complexity',
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
      listen:
        'The instruments a track is built around. Pick one to show the tracks that have it, or Select all.',
      complexity: 'Rhythm, melody, technique, instruments and structure, each 1–3, added up: 5–15.',
      year: 'The year a track was recorded. Tracks in progress count as the latest year.',
      status: 'Ready tracks are recorded; tracks in progress are still being worked on.',
    },
  },

  record: {
    canvasLabel:
      'A vinyl record map of tracks: distance from the label is the year. The List view shows the same tracks as tiles.',
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
    close: 'Close',
    listen: 'Main instrument',
    listenInfo:
      "What I'd like you to notice while listening — the parts this track is built around. They also colour the rays of the snowflake.",
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
    notYet: 'not yet',
    total: 'Total complexity',
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
      'Select a snowflake to play the song and read about it.',
      'Or press play here for a random track. ⏭ picks another one.',
      'Narrow the tracks down by style, instrument, complexity and year, or switch the view.',
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
