import type { Song } from '../src/content/parse';
import type { Bands, Taxonomy } from '../src/content/taxonomy';

export const taxonomy: Taxonomy = {
  styles: ['Alternative', 'Progressive', 'Electronic', 'Ambient'],
  styleColours: {
    Alternative: '#ff8a65',
    Progressive: '#b39dff',
    Electronic: '#4dd8ff',
    Ambient: '#9be7b9',
  },
  accents: [
    { id: 'Guitar', name: 'Guitar', colour: '#ff9100' },
    { id: 'Vox', name: 'Vocals', colour: '#00e5ff' },
    { id: 'Keys', name: 'Keys', colour: '#d500f9' },
    { id: 'Bass', name: 'Bass', colour: '#00e676' },
  ],
};

export const bands: Bands = { 'Vita Brevis': { name: 'Vita Brevis', years: '2010 – 2012' } };

export function md(frontmatter: string, body = 'A story. With two sentences.'): string {
  return `---\n${frontmatter.trim()}\n---\n\n${body}\n`;
}

export const valid = `
title: "Destination"
style: Alternative
accents: [Vox, Bass]
band: "Vita Brevis"
complexity: { rhythm: 1, melody: 2, technique: 1, instruments: 2, structure: 2 }
years: { idea: 2010, concept: 2010, ready: 2011 }
`;

let n = 0;
/** A synthetic song for domain tests; override any field. */
export function song(over: Partial<Song> = {}): Song {
  n++;
  const complexity = over.complexity ?? {
    rhythm: 2,
    melody: 2,
    technique: 2,
    instruments: 2,
    structure: 2,
  };
  return {
    slug: `song-${n}`,
    title: `Song ${n}`,
    style: 'Alternative',
    accents: ['Guitar'],
    band: null,
    complexity,
    complexityTotal: Object.values(complexity).reduce((a, b) => a + b, 0),
    years: { idea: 2015, ready: 2016 },
    status: 'ready',
    story: '',
    excerpt: '',
    audioSrc: null,
    pins: [],
    ...over,
  };
}
