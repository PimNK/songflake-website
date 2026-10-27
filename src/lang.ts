// The UI language, fixed for the page's lifetime: `?lang=` in the URL, else the visitor's stored
// choice, else the browser's language. Switching stores the choice and reloads the page with it.
export type Lang = 'en' | 'ru';

const KEY = 'songflake.lang';
const LANGS: readonly Lang[] = ['en', 'ru'];
const known = (v: string | null | undefined): Lang | null => LANGS.find((l) => l === v) ?? null;

function stored(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function detect(): Lang {
  // Outside a browser (tests, scripts) the strings are English.
  if (typeof window === 'undefined') return 'en';
  return (
    known(new URLSearchParams(location.search).get('lang')) ??
    known(stored()) ??
    (navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en')
  );
}

export const lang: Lang = detect();

/** The language the switch goes to. */
export const otherLang: Lang = lang === 'ru' ? 'en' : 'ru';

/** Stores the choice (best effort) and reloads in that language; the hash is kept. */
export function switchLang(to: Lang): void {
  try {
    localStorage.setItem(KEY, to);
  } catch {
    // Storage blocked: the URL still carries the choice.
  }
  const url = new URL(location.href);
  url.searchParams.set('lang', to);
  location.replace(url.href);
}
