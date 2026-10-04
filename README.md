# Regularnik

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

`npm run new-song` is not available until Phase 1. Until then, create the folder by hand.

```bash
npm run new-song "Winter girl"     # creates songs/winter-girl/index.md from a template
# drop the recording (.mp3, .m4a or .ogg) into songs/winter-girl/
# fill in the frontmatter, pins and story
npm run dev                        # check it looks right
git add songs/winter-girl && git commit -m "Add Winter girl" && git push
```

A brand-new style or instrument goes in `content/taxonomy.yaml`; a band that has
never appeared before goes in `content/bands.yaml`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local site with hot reload |
| `npm run new-song "Title"` | Scaffold a song folder. Declared in `package.json`, but `scripts/new-song.ts` does not exist yet (Phase 1) |
| `npm run check-content` | Validate all songs without building. For now it only checks that each folder has an `index.md` |
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
