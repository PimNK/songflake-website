// Pure: content in a given UI language. Russian takes the author's Russian text where there is
// one (instrument `ru`, the story after `<!-- ru -->`, pin `text_ru`) and the
// original otherwise; styles and titles are never translated. The Russian fields are dropped, so
// views only ever read `name`, `story` and `text`.
import type { Lang } from '../lang';
import { firstSentence, type Song } from './parse';
import type { Taxonomy } from './taxonomy';

export function localTaxonomy(t: Taxonomy, lang: Lang): Taxonomy {
  return {
    ...t,
    accents: t.accents.map(({ ru, ...a }) => ({ ...a, name: lang === 'ru' ? (ru ?? a.name) : a.name })),
  };
}

export function localSong({ storyRu, ...song }: Song, lang: Lang): Song {
  const story = lang === 'ru' ? (storyRu ?? song.story) : song.story;
  return {
    ...song,
    story,
    excerpt: firstSentence(story),
    pins: song.pins.map(({ textRu, ...p }) => ({
      ...p,
      text: lang === 'ru' ? (textRu ?? p.text) : p.text,
    })),
  };
}
