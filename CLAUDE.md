# CLAUDE.md — OBYCHNO_ (music diary)

A personal music diary published as a static website: every track gets an
audio player with pinned notes, a written story, a few facts (style, what to
listen for, band or solo, how it matured over the years) and a **generated
snowflake** that is unique to that track. Visitors browse the collection in
two views behind one switch:

1. **Record** — a spinning vinyl record. Style sectors, distance from the label
   = the year the track was finished, every track a snowflake pressed into it.
   Zoomable and draggable.
2. **List** — a plain, scannable grid of track tiles.

Both views share one filter panel and open the same track card.

**The visual reference is `docs/design/regularnik-mockup.html`.** Open it in a
browser before building any view: the record, the snowflake, the colours, the
filter panel, the card and the list are all there and approved. It is a single
throwaway file, not code to copy wholesale — reimplement it along the module map
in §3. Its demo-only parts are listed in §4.7 and must not be carried over.
Where this file and the mockup differ, this file wins: the author's later
changes (page frame, record placement and interaction, card order) supersede
the mockup.

**UI language: English.** Every user-visible string lives in `src/strings.ts`.
Song titles and stories are the author's and stay in whatever language they are
written in (e.g. «На луну»).

The rest of this file is the contract for building and changing the site.
Anything it does not cover: choose the simplest option, and say which one you
chose and why.

---

## 0. The one rule that shapes everything

**Adding a song means adding one folder. Nothing else changes.**

```
songs/velotrack/
  index.md     ← facts in the frontmatter, the story in the body
  audio.mp3    ← the recording (optional — no file means "no recording yet")
```

No list of songs exists anywhere in code, HTML or config. No ID to assign, no
counter to bump, no filter to extend, no image to export. The site discovers
song folders at build time, validates them, and derives everything else:
counts, filter lists, sorting, the record layout, the snowflake, the radar, the
timeline.

If a feature would force the author to touch a second file when adding a
song, the design is wrong. Find another way or raise it before building.

The **only** other files the author ever edits are `content/taxonomy.yaml`
(a brand-new style or instrument, §2.2) and `content/bands.yaml` (a band that
has never appeared before, §2.3).

Every decision below follows from this rule. When in doubt, re-read it.

---

## 1. Architecture

```
songs/                       content — one folder per song (§2), 22 already imported
  <slug>/index.md
  <slug>/audio.mp3
content/
  taxonomy.yaml              styles, instruments and their colours (§2.2)
  bands.yaml                 band descriptions for the band marker (§2.3)
docs/
  design/regularnik-mockup.html   approved visual reference (see above)
  source/songs.xlsx               the original spreadsheet, corrected; archive only
src/
  content/                   reading and validating songs
  domain/                    pure logic: filters, pins, snowflake params, record layout and placement
  render/                    drawing: snowflake (canvas), record (canvas), star sky (canvas), radar (SVG)
  views/                     DOM: record, list, filter panel, track card, player
  app/                       state, URL router, bootstrap
  strings.ts                 every UI string (English)
  styles/                    CSS; tokens in styles/tokens.css
scripts/
  new-song.ts                scaffolds a song folder (§2.5)
  check-content.ts           validates every song; part of `build` and `test`
tests/                       vitest unit tests (*.test.ts) for content/parse.ts and domain/; fixtures.ts holds shared sample songs and sampleComplexity
public/                      favicon and nothing else
```

**Stack:** Vite + TypeScript, **vanilla DOM — no UI framework**. The site is
two views, a panel and a modal; a framework would be more code than the app.
Runtime dependencies are limited to `yaml` (frontmatter), `marked` (the story's
Markdown) and `zod` (schema). No chart library: the radar is ~60 lines of SVG.
Adding a runtime dependency needs a reason in the reply.

**Output is a static site** (`dist/`) deployable to any static host. No server,
no database, no API. Default deployment: GitHub Pages via a GitHub Actions
workflow on push to `main`, so publishing a song is *add folder → commit → push*.

**Discovery mechanism:** `import.meta.glob('/songs/*/index.md', { query: '?raw',
eager: true })` and `import.meta.glob('/songs/*/*.{mp3,m4a,ogg}', { query:
'?url', eager: true })`. Vite resolves these at build time and picks up new
folders in dev without a restart. This is the *only* place the song list is
assembled.

---

## 2. Content model

### 2.1 A song folder

The folder name is the song's **slug**: lowercase, `a-z0-9-`, unique. It is the
song's identity — in URLs, in the DOM, as the seed for anything random-looking.
Renaming a folder changes the song's URL; that is acceptable and expected to be
rare.

`index.md`:

```markdown
---
title: "Destination"
style: Alternative
accents: [Vox, Bass]
band: "Vita Brevis"
complexity:
  rhythm: 1
  melody: 2
  technique: 1
  instruments: 2
  structure: 2
years:
  idea: 2010
  concept: 2010
  ready: 2011
pins:
  - at: "0:42"
    text: "The bass line the whole song was built on"
---

The first song we wrote in Vita Brevis and one of our hits. The song was
written around a bass line.
```

| Field | Required | Type | Rules |
|---|---|---|---|
| `title` | yes | string | Always quoted. Titles like `98` must stay strings, never numbers |
| `style` | yes | string | Must be a style in `taxonomy.yaml` |
| `accents` | yes | list of strings | 1+ items, each an instrument in `taxonomy.yaml`. Shown as **What to listen for**; the first one is the *lead* |
| `band` | no | string | Name of the band that recorded it. Absent = solo. `""` = recorded with a band whose name is not filled in yet (**warning**, the card says so). A name missing from `bands.yaml` is a warning too |
| `complexity.*` | yes | int 1–3 each | five axes: `rhythm`, `melody`, `technique`, `instruments`, `structure` |
| `years.idea` | yes | int | |
| `years.concept` | no | int | ≥ `idea` |
| `years.ready` | no | int | ≥ `concept` (or `idea`). Absent = **in progress** |
| `pins` | no | list of `{at, text}` | Notes pinned to moments of the recording (§4.6). `at` is `"m:ss"` or `"h:mm:ss"`, always quoted; `text` is plain text, one or two sentences. Order does not matter. Requires audio |
| `audio_url` | no | URL | Use instead of a local file when the audio is hosted elsewhere |
| `hidden` | no | boolean | `true` keeps the song out of the build — a draft |

The **body** is the story, in Markdown. It may be empty; the card then shows a
neutral placeholder from `strings.ts`.

**Derived, never stored** (computed in `src/content/`):
- `complexityTotal` = sum of the five axes (5–15)
- `status` = `ready` / `in-progress` from `years.ready`
- `excerpt` = first sentence of the body, for tooltips
- `audioSrc` = local file URL, else `audio_url`, else none
- `pins` parsed to seconds and sorted
- display order: `years.ready` descending, in-progress first, ties by title

Do not add a stored field for anything that can be derived. In particular:
**no manual numbering** — a number would have to be reassigned whenever an
older song is added.

**Audio:** at most one audio file per folder (`.mp3`, `.m4a` or `.ogg`), any
name. Two files in one folder is a validation error. Keep files reasonable
(≈ 192 kbps MP3); if the repo grows past a few hundred MB, move audio to
external hosting via `audio_url` or Git LFS — a content decision, not a code
change.

### 2.2 Taxonomy — `content/taxonomy.yaml`

```yaml
styles:            # order here = order in filters and clockwise round the record
  - Alternative
  - Progressive
  - Electronic
  - Ambient

style_colours:     # sector tint, rim band, labels
  Alternative: "#ff8a65"
  Progressive: "#b39dff"
  Electronic:  "#4dd8ff"
  Ambient:     "#9be7b9"

accents:           # id → display name + colour; the only place these exist
  Guitar:   { name: Guitar,      colour: "#ff9100" }
  Vox:      { name: Vocals,      colour: "#00e5ff" }
  Keys:     { name: Keys,        colour: "#d500f9" }
  Drums:    { name: Drums,       colour: "#ff1744" }
  Bass:     { name: Bass,        colour: "#00e676" }
  Flute:    { name: Flute,       colour: "#ffee58" }
  Electric: { name: Electronics, colour: "#2979ff" }
```

Filter checkboxes, chips, ray colours and record sectors are
**generated from this file plus the songs**. Nothing in HTML, CSS or TS
hard-codes a style name, an instrument or a colour. Adding one line here and
using it in a song is the whole of introducing a new instrument or style.

A style or instrument listed here but used by no song is shown in filters with
a count of 0 — dimmed, not hidden. A style with no songs still gets a (minimum
width) sector on the record.

### 2.3 Bands — `content/bands.yaml`

```yaml
Vita Brevis:
  years: "2010 – 2012"
  about: "One or two sentences shown on hover over the band marker."
```

A song names its band in `index.md`; the description lives here once, so five
songs by one band do not repeat the same paragraph.

### 2.4 Validation

`src/content/parse.ts` is **pure**: `(slug, rawMarkdown, audioFiles, taxonomy,
bands) → Song | ContentError[]`. It is used by the browser loader
(`src/content/load.ts`) and by `scripts/check-content.ts`, which runs **before**
`vite build` and inside `npm test`.

**A content error fails the build.** Never ship a site that silently drops a
broken song. Each error names the file, the field and the fix:

```
songs/velotrack/index.md: style "Progresive" is not in content/taxonomy.yaml
  known styles: Alternative, Progressive, Electronic, Ambient
songs/98/index.md: years.concept (2019) is earlier than years.idea (2021)
songs/lady/: two audio files (lady.mp3, lady-v2.mp3) — keep one
songs/dd/index.md: pins[1].at "2.15" is not a time — write it as "2:15"
songs/shine/index.md: pins present but the song has no audio
```

Pin rules: `at` parses as `m:ss` / `h:mm:ss` with seconds < 60; `text` is
non-empty; no two pins share an `at`; a song with pins has audio. `text` over
200 characters is a **warning**. A pin past the end of the recording can only be
detected once audio loads: dev overlay warning, silently skipped in production.

**Warnings** (build passes, listed in the output): unknown frontmatter keys
(say which known field it resembles), `band: ""`, a band missing from
`bands.yaml`. In `npm run dev`, errors and warnings show in an overlay rather
than crashing the page.

### 2.5 Adding a song — the author's whole workflow

```bash
npm run new-song "Winter girl"     # creates songs/winter-girl/index.md from a template
# drop the recording into songs/winter-girl/
# fill in the frontmatter, pins and story
npm run dev                        # check it looks right
git add songs/winter-girl && git commit -m "Add Winter girl" && git push
```

`new-song` derives the slug from the title (transliterating Cyrillic and
stripping diacritics and apostrophes: «На луну» → `na-lunu`, «Bésame» →
`besame`, «Frog's dancing» → `frogs-dancing`), refuses to overwrite an existing
folder, and writes a template with every required field present and commented
hints for the optional ones. The template is the documentation — it must stay
in sync with §2.1.

### 2.6 Where the 22 existing songs came from

`songs/` was generated once from `docs/source/songs.xlsx` (spelling already
corrected by the author). The spreadsheet is an archive now — **the folders are
the source of truth**; never regenerate them from it. Songs marked as band
recordings whose band is not known yet carry `band: ""` (see §2.1).

---

## 3. Module map

One responsibility per module. New code goes where this table says; if nothing
fits, propose a new module and update this table in the same change.

| Module | Owns | Must NOT contain |
|---|---|---|
| `content/parse.ts` | **pure**: frontmatter split, YAML parse, zod schema, cross-field rules, derived fields, errors and warnings | DOM, `import.meta.glob`, file system |
| `content/load.ts` | the two `import.meta.glob` calls, taxonomy and bands import, handing raw input to `parse.ts`, dropping `hidden` songs | validation rules |
| `content/taxonomy.ts` | taxonomy and bands zod schemas, the `Taxonomy` / `Band` types, `toTaxonomy` / `toBands` validators | hard-coded names or colours, lookups |
| `content/slug.ts` | **pure**: the slug pattern and `slugify` (Cyrillic transliteration, diacritics and apostrophes stripped), shared by `parse.ts` and `scripts/new-song.ts` | DOM, file system, validation of anything but the slug |
| `domain/filters.ts` | **pure**: `FilterState`, `matches(song, state)`, counts per option, `countMatching(songs, state)`, default state from taxonomy, range clamping, the filter ⇄ URL-query conversion (`toQuery` / `fromQuery`, keys in §4.5), and `neighbour` (the card's prev/next over the filtered order, wrapping; falls back to the full order when the open song is filtered out) | DOM, `location`, hash handling (that is `app/router.ts`, which only wires it) |
| `domain/timeline.ts` | **pure**: the three stations (idea, concept, ready) with their fill, and the gaps between them, proportional to the years with a minimum length for 0 or unknown | DOM |
| `domain/pins.ts` | **pure**: `"m:ss"` ⇄ seconds, sorting, `activePin(pins, t)`, marker position as a fraction of duration | DOM, `<audio>` |
| `domain/waveform.ts` | **pure**: peaks from decoded channels (normalised), about 1 bar per 4 px, resample stored peaks to a given width | DOM, Web Audio, `<audio>` |
| `domain/seed.ts` | **pure**: FNV-1a hash of a string (the slug) to [0, 1) and a xorshift generator seeded from it. Anything random-looking is seeded by the slug | `Math.random`, song data, canvas calls |
| `domain/colour.ts` | **pure**: `rgb`, `rgba` and `mix` on `"#rrggbb"` strings | colour values of its own (they come from the taxonomy) |
| `domain/snowflake.ts` | **pure**: `song → SnowflakeParams` — the whole mapping in §5.1, in one place, with the size factor, the line-width and glow rules, the snowflake's own turn (`turnRate`, `turnOffset`, `flakeTurn`, and `turnTiming` for the CSS animation) and `flakeOf` (params and per-ray colours together, the one call renderers make) | canvas calls |
| `domain/ray-colours.ts` | **pure**: `song → colour per ray` — the rule in §5.2 — and the radial gradient stops | canvas calls |
| `domain/record-layout.ts` | **pure**: equal sector angles, the groove spiral, year → radius, `YEAR_DRIFT`, world ⇄ screen transform for a given zoom/pan/rotation, `rotateBy` (drag turns the disc), `zoomAt`, `clampPan`, the exported `clamp`, which ring step applies at a zoom, the year range and in-progress placement, snowflake size scaling with zoom, spin rate, collision radius (snowflake and title), `visibleTitles` (which titles are drawn), hit radius, and the centre-label text rules: `LABEL_INNER` (0.8), `LABEL_MIN_PX` (5), `labelLineSize` (shrinks a line to fit, `null` = leave it out) and `clampToStage` (keeps a style name inside the stage near ×1) (§5.3) | canvas calls, animation loop, the placement solve |
| `domain/record-solve.ts` | **pure**: `solveLayout` — the placement solver (§5.3), returns `Placement` (x, y) per slug | canvas calls, geometry constants (those are in `record-layout.ts`) |
| `render/snowflake.ts` | drawing `SnowflakeParams` + ray colours on a 2D context at a given size; `paintSnowflake` (sizes a canvas for a static snowflake, halo and glow included, and draws it); `SpriteCache` (pre-rendered snowflakes for the record, 4 px size buckets) | deciding parameters from song data |
| `render/record.ts` | drawing the vinyl: body, sectors, grooves, sheen, year rings, sector names, the fading rim glow; also exports the canvas font stacks (`MONO`, `DISPLAY`) and `letterSpacing` | the centre label (that is `render/record-label.ts`), layout maths |
| `render/record-label.ts` | the centre label: paper, ice ring, style arcs, and the fitted text (`drawCentreLabel`) | layout maths (sizes come from `labelLineSize`), the rest of the vinyl |
| `render/record-flakes.ts` | the snowflakes with their titles on the record; draws only the titles `visibleTitles` allows (all on hover) | layout maths, deciding snowflake parameters |
| `render/sky.ts` | the seeded star field drawn on the page's fixed background canvas | layout maths, song data |
| `render/radar.ts` | the five-axis radar as an SVG string | any chart library |
| `views/record.ts` | the record canvas: DPR sizing, animation loop, composing the input, controls and motion modules, click → card. Takes the stage and the spin segment (a slot from `views/page.ts`). Mounted once for the page's lifetime: its observers and listeners are never released | layout or drawing maths |
| `views/record-input.ts` | pointer input on the canvas: wheel and pinch zoom anchored at the pointer, drag turns the disc (never pans), hover, click; a drag over 4 px is not a click | layout or drawing maths |
| `views/record-controls.ts` | the stage DOM around the canvas, filling the Play / Pause segment in the page's bar (two buttons, `aria-pressed`), the hover tooltip | layout or drawing maths |
| `views/record-motion.ts` | spin state (disc and snowflake turn), reduced motion | layout maths (spin rate comes from `domain/record-layout.ts`) |
| `views/content-overlay.ts` | the dev-only overlay: one panel at the top listing content errors and warnings, each message shown once per page load; also used for the dev «pin past the end» warning (`main.ts` calls it under `import.meta.env.DEV`); messages inserted as text | parsing or validation, production use |
| `views/page.ts` | the static page frame: the star sky canvas (mounts `render/sky.ts`, redrawn on resize), hero (the title and intro from `strings.ts`; the page takes no content), the map section with the bar (view switch, Filters toggle, Play / Pause slot), the filter anchor and the view slots; `data-view` on the pane tells CSS which view is shown; returns the slots other views fill. Also the view switch: `showView` (shows one view, sets `data-view`, shows or hides the Play / Pause slot, marks its tab, sets the notice) and `onViewTab` (tab clicks; roving tabindex, ← / → move between tabs) | filtering, state, drawing maths |
| `views/html.ts` | the `esc()` helper for author text interpolated into `innerHTML`, `bandRing` (the dashed band ring SVG) and `turnStyle` (inline style that starts a snowflake's CSS turn) | anything else |
| `views/list.ts` | the tile grid (snowflakes turn via CSS) and its empty state | filtering logic |
| `views/filter-panel.ts` | filter controls generated from taxonomy + counts, as a dropdown panel opened by the Filters toggle (no `<details>`): `aria-expanded`, the «N / total» on the toggle, Esc and outside-click closing (§4.2) | filtering logic, hard-coded options |
| `views/track-card.ts` | the modal shell (§4.3): title and ← → ✕, the player slot («Recording coming soon» when there is no audio, otherwise a hook to `views/player.ts`), focus trap and focus return, scroll lock, key handling (Esc, ← / →; arrows ignore modified keys) | the card's sections, audio element management |
| `views/card-body.ts` | the card sections: what to listen for with the band marker, idea → recording, story, the turning snowflake with radar; the ⓘ bubbles | rules (those are in `domain/`), audio |
| `views/markdown.ts` | story Markdown → HTML; raw HTML is shown as text; only http(s), mailto and relative links are kept | anything else |
| `views/player.ts` | the card's player UI: play/pause, time, waveform seek slider (click/drag and keyboard), the Download link, active-pin note, pin list with copy link, hiding pins past the end of the recording (§4.6) | the `<audio>` element, pin markers, the mini-player, time parsing (that is `domain/pins.ts`) |
| `views/playback.ts` | the one shared `<audio>` element; pending positions for songs that are not loaded; per-song waveform and duration cache, falling back to a metadata probe when decoding fails; failures are not cached | DOM beyond the audio element, rendering |
| `views/pin-markers.ts` | pin diamonds and popovers (near either end of the bar they open inwards); markers under 12 px apart merge; on touch the first tap shows the popover and the second seeks; a merged marker seeks to its first pin | audio, time parsing, grouping maths (that is `domain/pins.ts`) |
| `views/mini-player.ts` | the bottom bar shown while a track plays and its card is closed: title (opens the card), play/pause, close, pin ticks on the progress line | the audio element, waveform |
| `app/state.ts` | the single app state (`view`, `filters`, `openSlug`, `cue`, `notice`) and change notifications | DOM |
| `app/router.ts` | URL ⇄ state (§4.5), `songHash` (the shareable card-at-time hash used by copy link) and the history policy (`historyAction`): opening a card or switching views pushes an entry; closing a card that has its own entry goes back; filter changes replace; a malformed or unknown slug gives the «Track not found» notice | rendering |
| `app/main.ts` | bootstrap: load content, wire views to state | logic of any kind |
| `strings.ts` | every user-visible UI string (English) | — |

`domain/` and `content/parse.ts` are pure and are where tests live. Views hold
no rules — only wiring and DOM.

**Budgets:** a file over 300 lines or a function over 50 lines is a signal to
split. Say so when you cross it.

---

## 4. Behaviour

### 4.1 Layout and look

- Hero: the site name (`site` in `strings.ts`, «OBYCHNO_») as the title and a
  one-paragraph intro. No eyebrow line. Text in `strings.ts`.
- Below it, the map section runs the **full page width** — no left column.
  Above the view, one bar aligned right, all three parts in the same segmented
  style: the **◉ Record / ☰ List** switch, a **Filters N / total** toggle (§4.2),
  and a **Play / Pause** segment (record view only, §5.3). That is the whole
  page: no view hint, no legend, no «How to read a snowflake» section, no footer.
- **Stage height:** `max(420px, 100svh − 64px)`; under 900 px about square,
  `min(100svh − 64px, 100vw + 40px)`.
- **One background** for the page, the record and the list: a radial glow plus
  a fixed star canvas (`render/sky.ts`, mounted by `views/page.ts`). The record
  and the list have no borders or panels; the filter panel and the bar's
  segments are translucent blocks on that background.
- **Mobile (< 900 px)**: one column; in List view the filter panel stacks above
  the tiles. Under 600 px the Play / Pause segment shows icons only. No
  horizontal scroll anywhere. The track card becomes a full-height sheet with
  one column.
- **Single dark theme.** Tokens in `styles/tokens.css`, values from the mockup:
  `--void #05070f` (page), `--deep #0a1020`, `--panel #0d1428`, `--panel2
  #111a33`, `--line #1c2542`, `--frost #e8eeff` (text), `--mist #8f9aba`
  (secondary), `--ice #a6dcff` (UI accent), `--alert #ff8a80` (content errors in the
  dev overlay), `--grid #2a3558` (radar grid lines). Fonts from Google Fonts:
  **Unbounded** (display), **Golos Text** (body), **JetBrains Mono** (labels,
  numbers), each with a system fallback. Style and instrument colours come from
  the taxonomy at runtime, never from CSS.

### 4.2 Filters

| Control | Semantics |
|---|---|
| Style (checkbox + colour dot + count) | song's style is checked |
| Total complexity (min / max sliders, 5–15) | `min ≤ total ≤ max`; min can never exceed max |
| What to listen for (checkbox + colour dot per instrument, «all / none» toggle) | song has **at least one** checked instrument |
| Recorded: With a band / Solo (with counts) | by `band` present / absent |
| Status: Ready / In progress | by derived `status`; hidden while no song is in progress |

The panel is **collapsed by default on every screen**. The Filters toggle in
the bar (`aria-expanded`) opens it; the toggle carries the counter «N / total»,
the panel has no header. «Reset filters» button at the bottom.
- **Over the record** the panel floats, anchored at the right under the bar,
  opening left and down; it covers part of the record. A click outside closes it.
- **In List view** it is a sticky column beside the tiles, so it never covers
  the list; under 900 px it stacks above the list.
- **Esc** closes it (focus returns to the toggle if it was inside the panel);
  not while the track card is open.

Both views reflect the same filter state instantly:
- **Record**: non-matching snowflakes stay in place at ~10 % opacity, without
  label, not hoverable or clickable — the layout never jumps.
- **List**: non-matching tiles are hidden; when nothing matches, an empty state
  says so and points to «Reset filters».
- **Card**: prev / next walk the filtered order.

### 4.3 Track card (modal)

Opened from the record, a tile, or a deep link. Top to bottom:
1. **Title** and ← / → / ✕. No eyebrow line.
2. **Player with pins**, full width (§4.6). No audio → a quiet «Recording
   coming soon» line instead of the bar.
3. Two columns (one on mobile):
   - left:
     - **What to listen for** with an ⓘ that explains on hover/focus: «What I'd
       like you to notice while listening — the parts this track is built
       around. They also colour the rays of the snowflake.» Then one chip per
       instrument (colour dot with glow, display name), the first marked
       *lead* when there are several. Then the **band marker**: a dashed ring
       icon (same as the snowflake's halo) and «Recorded with **Vita Brevis**»,
       with name, description and years from `bands.yaml` on hover/focus;
       `band: ""` → «Recorded with a band» and a hint that the name is not filled
       in; no band → a muted «Solo recording» chip.
     - **From idea to recording** with an ⓘ: Idea = the main melody or idea
       appears; Concept = the song has a structure for the main instruments;
       Ready = recorded, you can listen. Three stations Idea → Concept → Ready with
       years; dots in the lead colour (hollow, half, full); connecting line
       segments proportional to the years between them (minimum length for 0),
       labelled «1 year» / «same year». No summary sentence. A missing
       `years.concept` shows «—», a missing `years.ready` shows «not yet».
     - **Story** — the Markdown body (raw HTML disabled), under the timeline.
   - right: the **snowflake** large, turning slowly on its own axis as on the
     record (static under `prefers-reduced-motion`), and directly beneath it the
     **radar** of the five axes (scale 0–3, grid rings at 1/2/3, polygon in the
     lead colour, axis labels with values) and «Total complexity N / 15» with an
     ⓘ explaining each axis (`strings.card.totalInfo`). No mapping legend in
     the card.

Closing: ✕, Esc, click on the backdrop, browser Back. ← / → keys = prev / next.
Focus is trapped while open and returned to the element that opened it. Page
scroll is locked while open.

**Playback continues when the card closes.** One `<audio>` element exists for
the whole page; when something is playing, a slim mini-player bar stays pinned
to the bottom (title, play/pause, close). Opening another card does not stop
the current track until its own play is pressed.

### 4.4 List

Responsive grid of tiles (`minmax(132px, 1fr)`), display order (§2.1). Each
tile is one button that opens the card: small snowflake, title,
«Style · year» (or «in progress»), a row of instrument colour dots and the
dashed band ring when recorded with a band. The snowflake radius is 32 px ×
the size factor from `complexityTotal`, drawn in a fixed-height box so titles
line up across tiles. Tile snowflakes turn on their own axis by a CSS
animation: timing from `turnTiming` in `domain/snowflake.ts`, applied as an
inline style by `turnStyle` in `views/html.ts`; off under
`prefers-reduced-motion`. Tiles sit on the page background.

### 4.5 URL

The hash holds what is worth sharing:
- `#/` record, `#/list` list
- `#/song/<slug>` an open card over the last view
- `#/song/<slug>?t=2:15` card with the player cued there (no autoplay —
  browsers block it). Each pin in the pin list has a «copy link» action
  producing this URL
- filters as a query only when they differ from the default:
  `#/list?style=Progressive,Ambient&min=9&band=solo`

  Filter keys (`domain/filters.ts`, `toQuery` / `fromQuery`):

  | Key | Value |
  |---|---|
  | `style` | checked styles, comma-separated |
  | `listen` | checked instrument ids, comma-separated |
  | `min`, `max` | complexity range, 5–15 |
  | `band` | `band`, `solo` or `none` |
  | `status` | `ready`, `in-progress` or `none` |

  An empty `style=` or `listen=` means none checked. Unknown values are ignored.

Browser Back closes an open card before it changes views. Opening a card or
switching views pushes a history entry; closing a card that has its own entry
goes back, so Back never reopens it; a card opened by a deep link has no such
entry, so closing it replaces; filter changes replace the current entry. An unknown slug
opens the view with a short «Track not found» notice, never a broken modal.

### 4.6 Player and pins

- Round play/pause button in the lead colour; `m:ss / m:ss` time, with a
  **Download** link next to it (file named `<title>.<ext>`; only with audio).
- **Waveform seek bar**: bars from the real audio (decode on first open with
  Web Audio, reduce to ~1 bar per 4 px, cache per song in memory); played part
  in the lead colour, the rest `--frost` at ~22 %. Click/drag seeks. If decoding
  fails, a plain progress bar.
- **Pin markers** above the bar: small white diamond with a hairline down
  through the waveform, at `at / duration`. Hover/focus shows a popover with
  time and text; click seeks there and plays. On touch: first tap shows the
  popover, second seeks. Markers closer than ~12 px merge into one whose popover
  lists both. Popovers near either end of the bar open inwards.
- **Active-pin note** under the bar during playback: the most recent pin
  passed, shown until the next pin or ~8 s; seeking updates it.
- **Pin list** under the player: `0:42  text`, each a button that seeks and
  plays — the accessible form of the markers.
- In the mini-player the markers are ticks on its thin progress line.
- A `?t=` cue never jumps a track that is already playing, and switching
  tracks keeps the previous track's position.

### 4.7 Demo-only parts of the mockup — do not carry over

The mockup simulates what does not exist yet: playback is a timer with no
sound, durations are invented, the waveform is pseudo-random, every song has
two «Example pin» notes, and band names / the Vita Brevis description are
hard-coded drafts. The real site uses audio files, `pins` and `band` from
`index.md`, and `bands.yaml`.

---

## 5. Visual system

### 5.1 The snowflake

Each song's snowflake is a **pure function of its data** — the same song always
draws the same snowflake. The mapping lives in `domain/snowflake.ts`; drawing
lives in `render/snowflake.ts` (reference: `gV2` in the mockup).

| Song data | Visual parameter |
|---|---|
| `structure` 1/2/3 | number of rays: 4 / 6 / 8, first ray pointing up |
| `rhythm` 1/2/3 | forks at the ray tip: single tip / one fork / fork that forks again (each fork ±0.55 rad, ×0.62 length) |
| `melody` 1/2/3 | the main ray is a gentle wave: amplitude 0 / 0.035 R / 0.06 R, 1.5 / 2.5 periods, growing with √t so it starts straight at the centre |
| `technique` 1/2/3 | offshoots from the middle of each ray: none / two (±0.78 rad from the local tangent) / two, each with one further offshoot turning outward |
| `instruments` 1/2/3 | 1 / 2 / 3 inner polygon rings (same order as the rays), frost at ~35 % |
| `band` present | dashed white halo at 1.12 R |
| `complexityTotal` | size on the record and in the list |

Main ray length depends on rhythm (0.82 / 0.58 / 0.47 R) so deeper forks fit.
**Every line has the same thin width** (`max(0.6, 0.021 R)`) — the rings, the
rays, the forks, the offshoots — otherwise the pattern clogs at small sizes.
Tips get a small dot; the centre a white dot. A soft glow (`shadowBlur ≈ 0.06
R`, capped) in each ray's colour.

### 5.2 Colour of the rays

- Each ray belongs to **one instrument from `accents`**; instruments take turns
  round the flake: ray *i* gets `accents[i mod n]`. When the rays do not divide
  evenly, the lead gets the extra one.
- Each ray is drawn with a **radial gradient from the centre**: frosted white
  near the centre (lead colour mixed ~88 % with white), ~45 % white at 0.3 R,
  pure colour from ~0.72 R to the tip. One gradient per colour, centred on the
  flake, so forks and offshoots share it.
- Rings and halo are neutral frost, never instrument colours.

### 5.3 The record

The record view is a canvas drawn every frame from `domain/record-layout.ts`
and `domain/record-solve.ts` (reference: `drawRecord` in the mockup; the
placement and the interaction below supersede it). The stars are the page
background (§4.1), not part of the stage.

- **World units:** grooves from radius 300 (the year of the earliest song) to
  1000 (the latest); the disc edge at 1070; the paper label radius ≈ 186. The
  whole thing is fitted so the disc plus outside labels fill the stage (≈ min
  side / 2 / 1300 px per unit at zoom 1).
- **Year → radius** is linear between the first and the last `years.ready` in
  the data (both derived, not hard-coded). In-progress songs (no `years.ready`)
  are placed at the latest year.
- **Sectors** — one per style, in taxonomy order, clockwise from the top;
  all sectors the same width (the song count is still shown). Sector
  boundaries follow the **groove spiral** `θ = u + 0.85 · ln(r / 300)` and fade
  out before the edge; each sector has a faint tint (stronger towards the rim)
  and a **rim band that is a soft glow in the style colour** at the edge. Style name and «N tracks» sit outside the disc at ~1.17×
  the edge radius, never touching it; near ×1 the names are kept inside the
  stage (`clampToStage`).
- **Vinyl:** near-black body with no outline — it fades into the page at the edge; ~110 concentric grooves at
  2–5 % white; a **fixed sheen** (two soft light wedges in a conic gradient
  that do **not** rotate with the disc); a smooth run-out ring before the label.
  The **centre label** spins with the disc: dark blue paper, a thin ice ring,
  four short arcs in the style colours at the sectors' mid-angles, **«OBYCHNO_»**
  in the display face, «SIDE A · first — last year» and «N TRACKS · 33⅓ RPM» (only
  the short line when the label is small), black spindle hole. Every text line
  is fitted inside 0.8 × the label radius (`labelLineSize`); a line that would
  need less than 5 px is left out, so text never crosses the label's edge.
- **Placement and no overlaps:** each song sits at its exact year radius.
  Songs of one style and year spread evenly along the groove spiral between the
  sector borders: the k-th of n at (k + 1) / (n + 1), so a lone song sits
  mid-sector and a column of songs repeats the border shape. A relaxation then
  pushes overlapping songs apart, mostly along the groove, the earlier one
  counterclockwise, with radial drift capped at `YEAR_DRIFT` = 0.45 year, so
  different years never swap order. The collision radius covers the snowflake
  **and its title** (≈ max(1.3 × flake radius, half the label width)). Solve
  once per viewport size, not per frame. Titles that would collide with another
  title or snowflake are hidden (`visibleTitles`); they appear when zooming in
  or on hover.
- **Zoom and rotation:** wheel / pinch, ×1 to ×8, anchored at the pointer or
  pinch centre. Dragging turns the disc round its centre (`rotateBy`); it never
  pans. Pan comes only from zoom anchoring and is zero at ×1. No + − Reset
  buttons, no zoom readout. Snowflakes grow as `zoom^0.45` — slower than the
  map — so zooming only ever adds space between them. A drag over 4 px is not a
  click.
- **Year rings** (brighter grooves with labels): every **5 years** below ×1.7,
  every **3 years** below ×3, **every year** from ×3. Rings and labels are quiet: thin,
  faint lines and a small chip. Labels sit along the line from the disc centre
  towards the middle of the viewport, so they stay visible when zoomed in.
- **Motion:** the disc rotates slowly (≈ 0.03 rad/s, divided by `zoom^1.5` so a
  zoomed-in region does not drift away); each snowflake also turns slowly on its
  own. A **Play / Pause** segment in the page's bar (two buttons, `aria-pressed`; shown in the record view only) starts and stops both. Under `prefers-reduced-motion`, nothing moves. The
  loop does no drawing while the record is hidden (List view, off-screen, tab
  hidden).
- **Hover:** the snowflake grows ×1.18, its title brightens, a tooltip shows
  title, style · band/solo · year · complexity. **Click** opens the card. On
  touch, tap opens the card directly.
- **Accessibility:** the canvas has an `aria-label` that points to the List
  view, which is the accessible equivalent. All controls are keyboard operable
  with a visible focus ring.

---

## 6. Explicitly out of scope (for now)

The 3D pyramid view. A CMS or admin page. Comments, likes, accounts. Lyrics as
a separate field (they can go in the story). Photos/covers. Multiple UI
languages (strings are centralised so this stays cheap later). Sort controls in
the list.

Each of these is a deliberate omission; propose it before building it.

---

## 7. Definition of Done

A change is done when all of these hold — state which you verified and which
you skipped:

- [ ] `npm run lint`, `npm run typecheck` clean
- [ ] `npm test` passes — includes `check-content` over the real `songs/`
- [ ] `npm run build` succeeds and `npm run preview` shows the change
- [ ] checked at 375 px and at desktop width, against the mockup
- [ ] **adding a song still touches exactly one folder** — if the change
      added any per-song bookkeeping elsewhere, it is not done
- [ ] the `new-song` template and §2.1 still agree
- [ ] this file is updated if behaviour, a field, the visual rules or the
      module map changed
- [ ] the code path that was replaced is deleted, not kept beside the new one

## 8. Working rules

- **Content is the author's, not yours.** Never edit a song's text, title or
  numbers to make code work or to fix spelling unless asked. Report suspected
  typos instead.
- **Pure core, thin views.** Rules live in `domain/` and `content/parse.ts`
  and are unit-tested (vitest). Views are wiring.
- **Replacement, not accretion.** No `_old`/`_v2`, no commented-out code.
- **No hard-coded content.** A song title, style, instrument, band name or
  colour appearing in `src/` is a bug.
- **Commit at the end of every development phase, never push unless asked.**
  A phase is closed in this order: §7 checks green → `reviewer` agent → fix
  its findings → `doc-writer` agent → one commit on `main` whose message names
  the phase. No commits mid-phase unless asked.

## 9. Commands

```bash
npm install
npm run dev              # local site with hot reload; new song folders appear live
npm run new-song "Title" # scaffold a song folder
npm run check-content    # validate all songs without building
npm test                 # vitest + check-content
npm run lint && npm run typecheck
npm run build            # check-content, tsc --noEmit, then vite build → dist/
npm run preview          # serve dist/ locally
```
