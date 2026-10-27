# OBYCHNO_

A personal music diary published as a static website. Every track gets an audio
player with pinned notes, a written story, a few facts and a generated snowflake
that is unique to it. Visitors browse the collection as a spinning vinyl record
or as a plain list.

The full contract for building and changing the site is in [CLAUDE.md](CLAUDE.md).
The approved visual reference is [docs/design/regularnik-mockup.html](docs/design/regularnik-mockup.html).

## Quick start

Requires Node 24.

```bash
npm install
npm run dev        # local site with hot reload
```

## Adding a song

Adding a song means adding one folder. Nothing else changes.

```bash
npm run new-song "Winter girl"     # creates songs/winter-girl/index.md from a template
# drop the recording (.mp3, .m4a or .ogg) into songs/winter-girl/
# fill in the frontmatter, pins and story
npm run dev                        # check it looks right
git add songs/winter-girl && git commit -m "Add Winter girl" && git push
```

Audio files go in the song folder (.mp3, .m4a or .ogg, about 192 kbps). If the
repo grows past a few hundred MB, use `audio_url` or Git LFS (CLAUDE.md §2.1).

A brand-new style or instrument goes in `content/taxonomy.yaml`; a band that has
never appeared before goes in `content/bands.yaml`.

## Language

The interface is in English and Russian. The page picks the language from
`?lang=en` / `?lang=ru` in the URL, else the stored choice, else the browser's
language. The EN / RU button in the page header switches it and reloads the
page. UI strings are in `src/strings/` (`en.ts`, `ru.ts`). Song titles, stories,
pins and band texts stay as the author wrote them. To give an instrument a
Russian name, add `ru:` to its line in `content/taxonomy.yaml`.

## What you see while developing

In `npm run dev`, content errors and warnings appear in a panel at the top of
the page. A pin past the end of a recording is warned about there once its audio
loads. Production builds show none of this; `npm run build` fails on errors.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local site with hot reload |
| `npm run new-song "Title"` | Scaffold a song folder from a template |
| `npm run check-content` | Validate all songs without building. Errors fail the command |
| `npm test` | Unit tests, then `check-content` |
| `npm run lint` | ESLint and Prettier check |
| `npm run typecheck` | TypeScript, no output |
| `npm run build` | `check-content`, `tsc --noEmit`, then `vite build` into `dist/` |
| `npm run preview` | Serve `dist/` locally |

## Deployment

`.github/workflows/deploy.yml` runs lint, tests and the build on every push to
`main` and publishes `dist/` to GitHub Pages. In the repository settings, set
**Pages → Source** to **GitHub Actions**. The site uses relative paths and hash
URLs, so it works under any repository name.

### Publishing for the first time

The local repository already exists, on branch `main`.

1. Create a GitHub repository.
2. `git remote add origin <url>` and `git push -u origin main`.
3. In Settings → Pages → Source, choose "GitHub Actions".
4. Each push to `main` then lints, tests, builds and deploys.
