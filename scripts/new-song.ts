// Scaffolds songs/<slug>/index.md from the title (CLAUDE.md §2.5).
// The template is the author's documentation: it must stay in sync with the §2.1 field table.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { AXES, RU_MARKER } from '../src/content/parse.ts';
import { slugify } from '../src/content/slug.ts';
import { toTaxonomy, type Taxonomy } from '../src/content/taxonomy.ts';

/** A complete index.md: required fields filled with valid placeholders, optional ones as hints. */
export function songTemplate(title: string, taxonomy: Taxonomy, year: number): string {
  const styles = taxonomy.styles.join(', ');
  const accents = taxonomy.accents.map((a) => a.id).join(', ');
  const line = (code: string, hint?: string): string =>
    hint ? `${code.padEnd(28)}# ${hint}` : code;
  return [
    '---',
    line(`title: ${JSON.stringify(title)}`),
    line(`style: ${taxonomy.styles[0]}`, `one of: ${styles}`),
    line(
      `accents: [${taxonomy.accents[0]?.id}]`,
      `1+ of: ${accents} — "What to listen for"; the first is the lead`,
    ),
    line(
      '# band: "Band name"',
      'who recorded it (described in content/bands.yaml); leave out for solo, "" if not known yet',
    ),
    line('complexity:', 'each 1, 2 or 3'),
    ...AXES.map((a) => `  ${a}: 2`),
    'years:',
    `  idea: ${year}`,
    line(`  # concept: ${year}`, 'when the shape was settled; not before idea'),
    line(`  # ready: ${year}`, 'when it was finished; leave out while in progress'),
    line('# pins:', 'moments of the recording; needs an audio file in this folder'),
    line('#   - at: "0:42"', '"m:ss" or "h:mm:ss", always quoted'),
    line('#     text: "What happens at this moment"', 'plain text, one or two sentences'),
    line('#     text_ru: "Что происходит в этот момент"', 'optional: the note on the Russian page'),
    line('# audio_url: "https://…"', 'instead of a local file, when the audio is hosted elsewhere'),
    line('# hidden: true', 'keep the song out of the build — a draft'),
    '# The story goes below the closing ---, in Markdown. Optional: a Russian version after a',
    `# line ${RU_MARKER} at the end of the story.`,
    '---',
    '',
  ].join('\n');
}

function main(): void {
  const title = process.argv.slice(2).join(' ').trim();
  if (!title) {
    console.error('usage: npm run new-song "Song title"');
    process.exit(1);
  }
  const slug = slugify(title);
  if (!slug) {
    console.error(`cannot make a folder name from "${title}" — use letters or digits`);
    process.exit(1);
  }
  const root = join(import.meta.dirname, '..');
  const dir = join(root, 'songs', slug);
  if (existsSync(dir)) {
    console.error(`songs/${slug}/ already exists — choose another title or edit that folder`);
    process.exit(1);
  }
  const taxonomy = toTaxonomy(parseYaml(readFileSync(join(root, 'content/taxonomy.yaml'), 'utf8')));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.md'), songTemplate(title, taxonomy, new Date().getFullYear()));
  console.log(`created songs/${slug}/index.md`);
  console.log(
    'next: drop the recording into that folder, fill in the facts and the story below the ---',
  );
}

if (process.argv[1] && import.meta.filename === process.argv[1]) main();
