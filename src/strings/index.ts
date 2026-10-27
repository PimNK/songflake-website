// Every user-visible UI string, in the page's language (src/lang.ts): en.ts and ru.ts.
import { lang } from '../lang';
import { en } from './en';
import { ru } from './ru';

export const strings = lang === 'ru' ? ru : en;
