// Validates every song folder with the same rules the site uses (src/content/parse.ts).
// Runs before `vite build` and inside `npm test`. Any error exits with code 1.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { AUDIO_EXTENSIONS, parseSong } from '../src/content/parse.ts';
import { toBands, toTaxonomy } from '../src/content/taxonomy.ts';

const root = join(import.meta.dirname, '..');
const read = (path: string): string => readFileSync(join(root, path), 'utf8');

export function checkContent(): {
  songs: number;
  hidden: number;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  let taxonomy, bands;
  try {
    taxonomy = toTaxonomy(parseYaml(read('content/taxonomy.yaml')));
    bands = toBands(parseYaml(read('content/bands.yaml')));
  } catch (e) {
    return { songs: 0, hidden: 0, errors: [(e as Error).message], warnings };
  }

  const songsDir = join(root, 'songs');
  const slugs = existsSync(songsDir)
    ? readdirSync(songsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
    : [];

  let songs = 0;
  let hidden = 0;
  for (const slug of slugs) {
    const dir = join(songsDir, slug);
    if (!existsSync(join(dir, 'index.md'))) {
      errors.push(`songs/${slug}/: no index.md — run npm run new-song or add one`);
      continue;
    }
    const audio = readdirSync(dir)
      .filter((f) => (AUDIO_EXTENSIONS as readonly string[]).includes(extname(f).slice(1)))
      .map((name) => ({ name, url: name }));
    const result = parseSong(slug, read(`songs/${slug}/index.md`), audio, taxonomy, bands);
    warnings.push(...result.warnings);
    if (!result.ok) errors.push(...result.errors);
    else if (result.hidden) hidden++;
    else songs++;
  }
  return { songs, hidden, errors, warnings };
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const { songs, hidden, errors, warnings } = checkContent();
  for (const w of warnings) console.warn(`warning: ${w}`);
  for (const e of errors) console.error(`error: ${e}`);
  const drafts = hidden ? `, ${hidden} hidden` : '';
  console.log(
    `check-content: ${songs} songs${drafts}, ${errors.length} errors, ${warnings.length} warnings`,
  );
  process.exit(errors.length ? 1 : 0);
}
