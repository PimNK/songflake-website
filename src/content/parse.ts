// Pure: one song folder's raw input → a Song, or the errors that stop the build (CLAUDE.md §2.4).
// No DOM, no import.meta.glob, no file system — used by content/load.ts and scripts/check-content.ts.
import { parseDocument } from 'yaml';
import { z } from 'zod';
import { parseTime, sortPins, suggestTime, type Pin } from '../domain/pins';
import { SLUG_PATTERN } from './slug';
import type { Bands, Taxonomy } from './taxonomy';

export const AXES = ['rhythm', 'melody', 'technique', 'instruments', 'structure'] as const;
export type Axis = (typeof AXES)[number];
export type Complexity = Record<Axis, number>;

/** A pin with its optional Russian text (`text_ru`). */
export interface SongPin extends Pin {
  textRu?: string;
}

export interface Song {
  slug: string;
  title: string;
  style: string;
  /** Instrument ids; the first is the lead. */
  accents: string[];
  /** `null` = solo; `""` = recorded with a band whose name is not filled in yet. */
  band: string | null;
  complexity: Complexity;
  complexityTotal: number;
  years: { idea: number; concept?: number; ready?: number };
  status: 'ready' | 'in-progress';
  /** The story, Markdown. */
  story: string;
  /** The Russian story: the body after the `<!-- ru -->` line, when there is one. */
  storyRu?: string;
  excerpt: string;
  audioSrc: string | null;
  pins: SongPin[];
}

export interface AudioFile {
  name: string;
  url: string;
}

export type ParseResult =
  | { ok: true; song: Song; hidden: boolean; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

export const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'ogg'] as const;
export const PIN_TEXT_WARN_LENGTH = 200;
/** The line in the body after which the Russian story goes. */
export const RU_MARKER = '<!-- ru -->';
const RU_LINE = /^[ \t]*<!--\s*ru\s*-->[ \t]*$/m;

const KNOWN_KEYS = [
  'title', 'style', 'accents', 'band', 'complexity', 'years', 'pins', 'audio_url', 'hidden',
];

const levelMsg = { error: 'must be 1, 2 or 3' };
const level = z.number(levelMsg).int(levelMsg).min(1, levelMsg).max(3, levelMsg);
const yearMsg = { error: 'must be a year like 2021' };
const year = z.number(yearMsg).int(yearMsg).min(1900, yearMsg).max(2100, yearMsg);

const frontmatterSchema = z.object({
  title: z.string({ error: 'must be a quoted string, e.g. title: "98"' }).min(1),
  style: z.string({ error: 'is required — one style from content/taxonomy.yaml' }),
  accents: z.array(z.string(), { error: 'must be a list of instruments from content/taxonomy.yaml, e.g. [A, B]' }).min(1),
  band: z.string({ error: 'must be a quoted band name, or "" if not known yet' }).optional(),
  complexity: z.object(Object.fromEntries(AXES.map((a) => [a, level])) as Record<Axis, typeof level>),
  years: z.object({ idea: year, concept: year.optional(), ready: year.optional() }),
  pins: z
    .array(
      z.object({
        at: z.string({ error: 'must be a quoted time, e.g. at: "2:15"' }),
        text: z.string({ error: 'must be text' }),
        text_ru: z.string({ error: 'must be text' }).optional(),
      }),
    )
    .optional(),
  audio_url: z.url({ error: 'must be a full URL' }).optional(),
  hidden: z.boolean({ error: 'must be true or false' }).optional(),
});
type Frontmatter = z.infer<typeof frontmatterSchema>;

export function parseSong(
  slug: string,
  raw: string,
  audioFiles: readonly AudioFile[],
  taxonomy: Taxonomy,
  bands: Bands,
): ParseResult {
  const file = `songs/${slug}/index.md`;
  const errors: string[] = [];
  const warnings: string[] = [];
  const fail = (): ParseResult => ({ ok: false, errors, warnings });

  if (!SLUG_PATTERN.test(slug)) {
    errors.push(`songs/${slug}/: folder name must be lowercase a-z, 0-9 and dashes`);
  }
  if (audioFiles.length > 1) {
    const names = audioFiles.map((f) => f.name).join(', ');
    errors.push(`songs/${slug}/: ${audioFiles.length === 2 ? 'two' : audioFiles.length} audio files (${names}) — keep one`);
  }

  const read = readFrontmatter(file, raw, errors, warnings);
  if (!read) return fail();
  const { fm, body } = read;
  const audioSrc = audioFiles[0]?.url ?? fm.audio_url ?? null;

  errors.push(...checkTaxonomy(file, fm, taxonomy));
  errors.push(...checkYears(file, fm.years));
  const pins = checkPins(file, fm.pins ?? [], audioSrc !== null, errors, warnings);
  warnings.push(...checkBand(file, fm.band, bands));
  if (errors.length) return fail();

  const parts = body.split(RU_LINE);
  if (parts.length > 2) errors.push(`${file}: the story has ${parts.length - 1} "${RU_MARKER}" lines — keep one`);
  if (errors.length) return fail();

  const complexityTotal = AXES.reduce((sum, a) => sum + fm.complexity[a], 0);
  const story = parts[0]!.trim();
  const storyRu = parts[1]?.trim();
  if (storyRu === '') {
    warnings.push(`${file}: nothing after "${RU_MARKER}" — the Russian page shows the story above it`);
  }
  const song: Song = {
    slug,
    title: fm.title,
    style: fm.style,
    accents: fm.accents,
    band: fm.band ?? null,
    complexity: fm.complexity,
    complexityTotal,
    years: fm.years,
    status: fm.years.ready === undefined ? 'in-progress' : 'ready',
    story,
    ...(storyRu ? { storyRu } : {}),
    excerpt: firstSentence(story),
    audioSrc,
    pins,
  };
  return { ok: true, song, hidden: fm.hidden === true, warnings };
}

/** Frontmatter YAML → schema-checked fields; pushes errors and returns null when unusable. */
function readFrontmatter(
  file: string,
  raw: string,
  errors: string[],
  warnings: string[],
): { fm: Frontmatter; body: string } | null {
  const split = splitFrontmatter(raw);
  if (!split) {
    errors.push(`${file}: no frontmatter — the file must start with a --- block`);
    return null;
  }
  const doc = parseDocument(split.yaml);
  if (doc.errors.length) {
    errors.push(...doc.errors.map((e) => `${file}: YAML error — ${e.message.split('\n')[0]}`));
    return null;
  }
  const data: unknown = doc.toJS() ?? {};
  if (data && typeof data === 'object') warnings.push(...unknownKeys(file, Object.keys(data)));
  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    errors.push(...parsed.error.issues.map((i) => `${file}: ${pathOf(i.path)} ${i.message}`));
    return null;
  }
  return { fm: parsed.data, body: split.body };
}

function splitFrontmatter(raw: string): { yaml: string; body: string } | null {
  const m = /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/.exec(raw);
  return m ? { yaml: m[1]!, body: m[2]! } : null;
}

function pathOf(path: readonly PropertyKey[]): string {
  return path
    .map((p, i) => (typeof p === 'number' ? `[${p}]` : `${i ? '.' : ''}${String(p)}`))
    .join('');
}

function unknownKeys(file: string, keys: string[]): string[] {
  return keys
    .filter((k) => !KNOWN_KEYS.includes(k))
    .map((k) => {
      const near = KNOWN_KEYS.map((known) => ({ known, d: distance(k, known) })).sort(
        (a, b) => a.d - b.d,
      )[0]!;
      const hint = near.d <= Math.max(2, Math.floor(k.length / 3)) ? ` — did you mean "${near.known}"?` : '';
      return `${file}: unknown field "${k}"${hint}`;
    });
}

function checkTaxonomy(file: string, fm: Frontmatter, taxonomy: Taxonomy): string[] {
  const out: string[] = [];
  if (!taxonomy.styles.includes(fm.style)) {
    out.push(
      `${file}: style "${fm.style}" is not in content/taxonomy.yaml\n` +
        `  known styles: ${taxonomy.styles.join(', ')}`,
    );
  }
  const ids = taxonomy.accents.map((a) => a.id);
  fm.accents.forEach((a, i) => {
    if (!ids.includes(a)) {
      out.push(
        `${file}: accents[${i}] "${a}" is not in content/taxonomy.yaml\n` +
          `  known instruments: ${ids.join(', ')}`,
      );
    }
  });
  const dupes = fm.accents.filter((a, i) => fm.accents.indexOf(a) !== i);
  if (dupes.length) out.push(`${file}: accents lists "${dupes[0]}" twice`);
  return out;
}

function checkYears(file: string, y: Frontmatter['years']): string[] {
  const out: string[] = [];
  if (y.concept !== undefined && y.concept < y.idea) {
    out.push(`${file}: years.concept (${y.concept}) is earlier than years.idea (${y.idea})`);
  }
  if (y.ready !== undefined) {
    const [name, prev] = y.concept !== undefined ? ['concept', y.concept] : ['idea', y.idea];
    if (y.ready < prev) {
      out.push(`${file}: years.ready (${y.ready}) is earlier than years.${name} (${prev})`);
    }
  }
  return out;
}

function checkPins(
  file: string,
  raw: NonNullable<Frontmatter['pins']>,
  hasAudio: boolean,
  errors: string[],
  warnings: string[],
): SongPin[] {
  if (raw.length && !hasAudio) errors.push(`${file}: pins present but the song has no audio`);
  const pins: SongPin[] = [];
  const seen = new Map<number, number>();
  raw.forEach((p, i) => {
    const at = parseTime(p.at);
    const text = p.text.trim();
    const textRu = p.text_ru?.trim();
    if (at === null) {
      const fix = suggestTime(p.at);
      const hint = fix ? ` — write it as "${fix}"` : ' — write it as "m:ss" or "h:mm:ss"';
      errors.push(`${file}: pins[${i}].at "${p.at}" is not a time${hint}`);
    } else if (seen.has(at)) {
      errors.push(`${file}: pins[${i}].at "${p.at}" is the same moment as pins[${seen.get(at)}]`);
    } else {
      seen.set(at, i);
    }
    if (!text) errors.push(`${file}: pins[${i}].text is empty`);
    if (textRu === '') errors.push(`${file}: pins[${i}].text_ru is empty — fill it in or leave it out`);
    for (const [key, t] of [['text', text], ['text_ru', textRu]] as const) {
      if (t && t.length > PIN_TEXT_WARN_LENGTH) {
        warnings.push(
          `${file}: pins[${i}].${key} is ${t.length} characters — keep it to one or two sentences`,
        );
      }
    }
    if (at !== null && text) pins.push(textRu ? { at, text, textRu } : { at, text });
  });
  return sortPins(pins);
}

function checkBand(file: string, band: string | undefined, bands: Bands): string[] {
  if (band === undefined) return [];
  if (band.trim() === '') {
    return [`${file}: band is "" — the card will say "Recorded with a band" until it is filled in`];
  }
  return bands[band] ? [] : [`${file}: band "${band}" is not in content/bands.yaml`];
}

/** First sentence of the story as plain text, for tooltips. */
export function firstSentence(markdown: string): string {
  const plain = markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const m = /^.*?[.!?…](?=\s|$)/u.exec(plain);
  return m ? m[0] : plain;
}

/** Display order: in progress first, then most recently finished, ties by title. */
export function displayOrder(songs: readonly Song[]): Song[] {
  return [...songs].sort(
    (a, b) =>
      (b.years.ready ?? Infinity) - (a.years.ready ?? Infinity) ||
      a.title.localeCompare(b.title),
  );
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length]!;
}
