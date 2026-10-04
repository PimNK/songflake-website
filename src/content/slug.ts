// Song slugs: the folder name is the song's identity (CLAUDE.md §2.1).
// Pure — shared by parse.ts (validation) and scripts/new-song.ts (scaffolding).

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya', і: 'i', ї: 'yi', є: 'ye', ґ: 'g',
};

/** «На луну» → `na-lunu`, «Bésame» → `besame`, «Frog's dancing» → `frogs-dancing`. */
export function slugify(title: string): string {
  const lower = title.toLowerCase();
  const latin = [...lower].map((ch) => CYRILLIC[ch] ?? ch).join('');
  return latin
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // diacritics
    .replace(/['’‘`ʼ]/g, '') // apostrophes vanish rather than split words
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
