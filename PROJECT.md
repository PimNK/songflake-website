# PROJECT.md — SONGFLAKE (music diary)

Project-specific facts for `AGENTS.md` (the portable rules). The deep contract
is **`CLAUDE.md`**: read the section you are touching before changing
behaviour. Precedence: `CLAUDE.md` > this file > `AGENTS.md`.

A personal music diary published as a static website. Every song is one folder
under `songs/`; the site derives everything else (counts, filters, sorting,
record layout, the snowflake). Two views behind one switch — a spinning vinyl
record (canvas) and a list of tiles — plus a filter panel, a random player and
a track card. UI in English and Russian.

## Instruction files

| File | Role |
|---|---|
| `CLAUDE.md` | the deep spec and review standard. §0 the one-folder rule · §1 architecture · §2 content model · §3 module map (full ownership table) · §4 behaviour · §5 visual system · §6 out of scope · §7 definition of done · §8 working rules · §9 commands |
| `README.md` | human quick start and deployment |
| `docs/design/restyle/` | the approved visual reference («Ночная дека»): open `d-night.html` and `d-night-mobile.html` in a browser before building any view |
| `docs/adr/` | accepted decisions; `docs/adr/README.md` gives the format |
| `.claude/` | Claude Code's own setup (hooks, agent briefs). **Hooks do not run under OpenCode** — run the checks yourself; never edit this folder from OpenCode |

`docs/design/regularnik-mockup.html` is kept for page structure only; its look
is superseded by the restyle, and the mockup's demo-only parts (CLAUDE.md
§4.7) must not be carried over. `docs/source/songs.xlsx` is an archive:
`songs/` folders are the source of truth, never regenerate them from it.

## Stack

- Node ≥ 24, Vite + TypeScript (strict + `noUncheckedIndexedAccess`),
  **vanilla DOM, no UI framework**. Runtime dependencies limited to `yaml`,
  `marked`, `zod` — adding one needs a reason in the reply. No chart library.
- Budgets (ESLint warns at the same numbers): 300 lines per TS file, 50 per
  function — tighter than the 400 in `AGENTS.md`; this repo's numbers win.
- No server, no database, no API, no env vars, no `.env` file. Output is the
  static site in `dist/` (generated — never hand-edit), deployed to GitHub
  Pages by `.github/workflows/deploy.yml` on push to `main`. Publishing a song
  is: add folder → commit → push. Never push unless asked.

## Module map (summary; the full ownership table is CLAUDE.md §3)

```
songs/<slug>/index.md        frontmatter facts + the story (§2.1); audio.mp3 optional
content/taxonomy.yaml        styles, instruments, colours — the only other author-edited file
src/content/                 reading and validating songs (the import.meta.glob calls live in load.ts)
src/domain/                  pure logic: filters, pins, shuffle, timeline, levels, snowflake, record layout
src/render/                  canvas drawing: snowflake, record, levels
src/views/                   DOM wiring: record, list, filter panel, track card, players
src/app/                     state, URL router, bootstrap
src/lang.ts, src/strings/    page language and every UI string (en.ts, ru.ts — same shape)
scripts/                     new-song.ts (scaffold), check-content.ts (validate)
tests/                       vitest, offline, no DOM
```

New code goes to the module that owns it; if nothing fits, propose a new module
and update the map (CLAUDE.md §3) in the same change.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (default port 5173); new song folders appear live |
| `npm run new-song "Title"` | scaffold `songs/<slug>/index.md` from the template |
| `npm run check-content` | validate every song; errors fail the command |
| `npm test` | vitest, then `check-content` |
| `npx vitest run tests/parse.test.ts` | one test file (run the focused file first) |
| `npx vitest run -t "name"` | one test by name |
| `npm run lint` | ESLint + Prettier check |
| `npm run format` | Prettier write + ESLint fix — the Claude Code format hook does NOT run here |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | `check-content` → `tsc --noEmit` → `vite build` into `dist/` |
| `npm run preview` | serve `dist/` locally |

The suite runs offline: no network, no keys, no services, no DOM.

Definition of done: CLAUDE.md §7 — lint, typecheck, `npm test`, `npm run build`
+ `preview`, checked at 375 px and desktop against the restyle mockups, the
one-folder rule intact, the `new-song` template still agreeing with §2.1,
`CLAUDE.md` updated, the replaced code path deleted.

## Hard invariants (from CLAUDE.md — the reviewer checks each one)

1. **One folder per song (§0):** adding a song touches only `songs/<slug>/`
   (plus `content/taxonomy.yaml` for a brand-new style or instrument). No song
   list, ID or counter anywhere in code, HTML or config; songs are discovered
   only by the two `import.meta.glob` calls in `src/content/load.ts` and by
   `scripts/check-content.ts`.
2. **Taxonomy is the single source (§2.2):** no style, instrument or colour
   hard-coded in `src/`, CSS or HTML; filter pads and lists are generated from
   `content/taxonomy.yaml` plus the songs.
3. **Pure core (§1, §3):** `src/domain/` and `src/content/parse.ts` hold no
   DOM, canvas, `import.meta.glob` or file-system code. Views are wiring.
4. **Derived, never stored (§2.1):** `complexityTotal`, `status`, `excerpt`,
   `storyRu`, `audioSrc`, display order. No manual numbering.
5. **Content errors fail the build (§2.4):** never ship a site that silently
   drops a broken song; warnings are listed, not swallowed.
6. **Strings (§3):** every user-visible UI string lives in `src/strings/`
   (`en.ts`, `ru.ts`, same shape; tests pin key parity and plural forms). Song
   titles and style names are never translated.
7. **Content is the author's (§8):** never edit a song's text, title or
   numbers to make code work; report suspected typos instead.
8. **Out of scope (§6):** the 3D pyramid view, a CMS, comments, accounts,
   lyrics as a separate field, photos, other languages, sort controls —
   propose before building.

## Pipeline under OpenCode

implement (`fullstack`) → `reviewer` → `doc-writer`; `architect` first when a
change adds a module, moves the content model (song fields, taxonomy) or the
URL/query contract, or reverses a visual-system or ADR decision. No hooks run
under OpenCode: `npm run format`, lint, typecheck and test are your own
responsibility, and nobody re-runs them for you. Commit closes a phase
(CLAUDE.md §8, the config asks for confirmation); pushing publishes the site —
never without being asked.

Browser verification for UI work: `npm run dev` plus the Playwright or
Chrome DevTools MCP (configured in `opencode.json`); exercise the change at
375 px and at ≥ 1100 px and check the console.

## Known limits

- The `<!-- ru -->` story marker is recognised on any line, also inside a code
  fence — a known limit (CLAUDE.md §2.1).
- A pin past the end of the recording is only warned about in the dev overlay.
- A leftover `band:` key in a song is a warning: bands were dropped (§2.3).
- `npm run lint` warns (does not fail) on budget crossings — report them, do
  not silence them.
