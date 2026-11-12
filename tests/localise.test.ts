import { describe, expect, it } from 'vitest';
import { localSong, localTaxonomy } from '../src/content/localise';
import { song, taxonomy } from './fixtures';

const ruSong = song({
  story: 'An English story. More.',
  storyRu: 'Русская история. Ещё.',
  pins: [
    { at: 5, text: 'Bass', textRu: 'Бас' },
    { at: 9, text: 'Drums' },
  ],
});

describe('localSong', () => {
  it('takes the Russian story, excerpt and pin text on the Russian page', () => {
    const s = localSong(ruSong, 'ru');
    expect(s.story).toBe('Русская история. Ещё.');
    expect(s.excerpt).toBe('Русская история.');
    expect(s.pins).toEqual([
      { at: 5, text: 'Бас' },
      { at: 9, text: 'Drums' },
    ]);
    expect(s).not.toHaveProperty('storyRu');
  });

  it('keeps the original text on the English page, and when no Russian is written', () => {
    const s = localSong(ruSong, 'en');
    expect(s.story).toBe('An English story. More.');
    expect(s.pins.map((p) => p.text)).toEqual(['Bass', 'Drums']);
    expect(localSong(song({ story: 'Only English.' }), 'ru').story).toBe('Only English.');
  });
});

describe('localTaxonomy', () => {
  it('names instruments by their ru name on the Russian page; styles stay', () => {
    const t = {
      ...taxonomy,
      accents: [{ id: 'Bass', name: 'Bass', ru: 'Бас', colour: '#00e676' }],
    };
    expect(localTaxonomy(t, 'ru').accents).toEqual([
      { id: 'Bass', name: 'Бас', colour: '#00e676' },
    ]);
    expect(localTaxonomy(t, 'en').accents[0]!.name).toBe('Bass');
    expect(localTaxonomy(t, 'ru').styles).toEqual(taxonomy.styles);
  });
});
