// Taxonomy (styles, instruments and their colours): schema and validation.
// The YAML file is the only place these names and colours exist (CLAUDE.md §2.2).
import { z } from 'zod';

const colour = z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: 'must be a colour like "#ff8a65"' });

const taxonomySchema = z.object({
  styles: z.array(z.string().min(1)).min(1),
  accents: z.record(
    z.string(),
    z.object({ name: z.string().min(1), ru: z.string().min(1).optional(), colour }),
  ),
});

export interface Accent {
  id: string;
  name: string;
  /** The Russian display name; the English `name` when absent. */
  ru?: string;
  colour: string;
}

export interface Taxonomy {
  /** In file order: order in the filters and clockwise round the record. */
  styles: string[];
  /** In file order. */
  accents: Accent[];
}

function describe(error: z.ZodError): string {
  return error.issues
    .map((i) => `  ${i.path.map(String).join('.') || '(root)'}: ${i.message}`)
    .join('\n');
}

/** Validates parsed taxonomy YAML. Throws with every problem listed. */
export function toTaxonomy(raw: unknown, file = 'content/taxonomy.yaml'): Taxonomy {
  const parsed = taxonomySchema.safeParse(raw);
  if (!parsed.success) throw new Error(`${file}:\n${describe(parsed.error)}`);
  const { styles, accents } = parsed.data;
  return {
    styles,
    accents: Object.entries(accents).map(([id, a]) => ({ id, ...a })),
  };
}
