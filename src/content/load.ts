// The only place the song list is assembled: Vite discovers song folders at build time.
// Validation rules live in parse.ts; this file only gathers raw input and hands it over.
import { parse as parseYaml } from 'yaml';
import bandsRaw from '/content/bands.yaml?raw';
import taxonomyRaw from '/content/taxonomy.yaml?raw';
import { displayOrder, parseSong, type AudioFile, type Song } from './parse';
import { toBands, toTaxonomy, type Bands, type Taxonomy } from './taxonomy';

const indexFiles = import.meta.glob<string>('/songs/*/index.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const audioUrls = import.meta.glob<string>('/songs/*/*.{mp3,m4a,ogg}', {
  query: '?url',
  import: 'default',
  eager: true,
});

export interface Content {
  /** Visible songs in display order. */
  songs: Song[];
  taxonomy: Taxonomy;
  bands: Bands;
  errors: string[];
  warnings: string[];
}

const slugOf = (path: string): string => path.split('/')[2] ?? '';

const EMPTY_TAXONOMY: Taxonomy = { styles: [], styleColours: {}, accents: [] };

export function loadContent(): Content {
  let taxonomy: Taxonomy;
  let bands: Bands;
  try {
    taxonomy = toTaxonomy(parseYaml(taxonomyRaw));
    bands = toBands(parseYaml(bandsRaw));
  } catch (e) {
    // The build fails on this in check-content; in dev it reaches the overlay instead of crashing.
    const message = (e as Error).message;
    return { songs: [], taxonomy: EMPTY_TAXONOMY, bands: {}, errors: [message], warnings: [] };
  }

  const audioBySlug = new Map<string, AudioFile[]>();
  for (const [path, url] of Object.entries(audioUrls)) {
    const list = audioBySlug.get(slugOf(path)) ?? [];
    list.push({ name: path.split('/').pop() ?? path, url });
    audioBySlug.set(slugOf(path), list);
  }

  const songs: Song[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const [path, raw] of Object.entries(indexFiles)) {
    const slug = slugOf(path);
    const result = parseSong(slug, raw, audioBySlug.get(slug) ?? [], taxonomy, bands);
    warnings.push(...result.warnings);
    if (!result.ok) errors.push(...result.errors);
    else if (!result.hidden) songs.push(result.song);
  }
  return { songs: displayOrder(songs), taxonomy, bands, errors, warnings };
}
