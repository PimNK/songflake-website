// The real songs/ folder and the new-song template, through the same parser the site uses.
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import { parseSong } from '../src/content/parse';
import { toBands, toTaxonomy } from '../src/content/taxonomy';
import { checkContent } from '../scripts/check-content';
import { songTemplate } from '../scripts/new-song';

const taxonomy = toTaxonomy(parseYaml(readFileSync('content/taxonomy.yaml', 'utf8')));
const bands = toBands(parseYaml(readFileSync('content/bands.yaml', 'utf8')));

describe('content', () => {
  it('every song in songs/ is valid', () => {
    const result = checkContent();
    expect(result.errors).toEqual([]);
    expect(result.songs).toBeGreaterThan(0);
  });

  it('the new-song template parses as a valid in-progress song', () => {
    const r = parseSong(
      'winter-girl',
      songTemplate('Winter girl', taxonomy, 2026),
      [],
      taxonomy,
      bands,
    );
    expect(r.ok ? [] : r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.ok && r.song).toMatchObject({
      title: 'Winter girl',
      status: 'in-progress',
      story: '',
    });
  });

  it('the template mentions every field of CLAUDE.md §2.1', () => {
    const t = songTemplate('X', taxonomy, 2026);
    for (const field of [
      'title:',
      'style:',
      'accents:',
      'band:',
      'complexity:',
      'rhythm:',
      'melody:',
      'technique:',
      'instruments:',
      'structure:',
      'idea:',
      'concept:',
      'ready:',
      'pins:',
      'at:',
      'text:',
      'audio_url:',
      'hidden:',
    ]) {
      expect(t).toContain(field);
    }
  });

  it('a titled song with quotes survives the template', () => {
    const r = parseSong('x', songTemplate('Say "hi"', taxonomy, 2026), [], taxonomy, bands);
    expect(r.ok && r.song.title).toBe('Say "hi"');
  });
});
