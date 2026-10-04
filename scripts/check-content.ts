// Validates every song folder. Runs before `vite build` and inside `npm test`.
// Phase 0: only checks that each folder under songs/ has an index.md.
// Full validation through src/content/parse.ts arrives with the content pipeline.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const songsDir = join(import.meta.dirname, '..', 'songs');
const slugs = readdirSync(songsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const missing = slugs.filter((slug) => !existsSync(join(songsDir, slug, 'index.md')));
for (const slug of missing) console.error(`songs/${slug}/: no index.md`);

console.log(`check-content: ${slugs.length} song folders, ${missing.length} errors`);
process.exit(missing.length > 0 ? 1 : 0);
