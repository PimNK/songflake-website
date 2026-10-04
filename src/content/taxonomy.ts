// Taxonomy (styles, instruments, colours) and bands: schemas and validation.
// The YAML files are the only place these names and colours exist (CLAUDE.md §2.2, §2.3).
import { z } from 'zod';

const colour = z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: 'must be a colour like "#ff8a65"' });

const taxonomySchema = z.object({
  styles: z.array(z.string().min(1)).min(1),
  style_colours: z.record(z.string(), colour),
  accents: z.record(z.string(), z.object({ name: z.string().min(1), colour })),
});

const bandsSchema = z.record(
  z.string(),
  z.object({ years: z.string().optional(), about: z.string().optional() }).nullable(),
);

export interface Accent {
  id: string;
  name: string;
  colour: string;
}

export interface Taxonomy {
  /** In file order: order in the filters and clockwise round the record. */
  styles: string[];
  styleColours: Record<string, string>;
  /** In file order. */
  accents: Accent[];
}

export interface Band {
  name: string;
  years?: string;
  about?: string;
}

export type Bands = Record<string, Band>;

function describe(error: z.ZodError): string {
  return error.issues
    .map((i) => `  ${i.path.map(String).join('.') || '(root)'}: ${i.message}`)
    .join('\n');
}

/** Validates parsed taxonomy YAML. Throws with every problem listed. */
export function toTaxonomy(raw: unknown, file = 'content/taxonomy.yaml'): Taxonomy {
  const parsed = taxonomySchema.safeParse(raw);
  if (!parsed.success) throw new Error(`${file}:\n${describe(parsed.error)}`);
  const { styles, style_colours, accents } = parsed.data;
  const missing = styles.filter((s) => !style_colours[s]);
  if (missing.length) {
    throw new Error(`${file}: style_colours has no colour for ${missing.join(', ')}`);
  }
  return {
    styles,
    styleColours: style_colours,
    accents: Object.entries(accents).map(([id, a]) => ({ id, name: a.name, colour: a.colour })),
  };
}

/** Validates parsed bands YAML. Throws with every problem listed. */
export function toBands(raw: unknown, file = 'content/bands.yaml'): Bands {
  const parsed = bandsSchema.safeParse(raw ?? {});
  if (!parsed.success) throw new Error(`${file}:\n${describe(parsed.error)}`);
  return Object.fromEntries(
    Object.entries(parsed.data).map(([name, b]) => [name, { name, ...(b ?? {}) }]),
  );
}
