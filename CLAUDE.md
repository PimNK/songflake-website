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

A style or instrument listed here but used by no song is shown in filters
dimmed, not hidden. A style with no songs still gets a (minimum
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
| `domain/filters.ts` | **pure**: `FilterState` (styles, instruments, complexity range, year range `from` / `to` — inclusive, over `placementYear` (§5.3) — and status; the band is not a filter), `FilterSpace {taxonomy, years}` (what the filters range over; passed to `defaultFilters`, `toQuery`, `fromQuery` and `isDefault`), `matches(song, state, years)`, counts per option, `countMatching(songs, state, years)`, default state from the space, range clamping (`setRange`; `setYears(f, end, value, years)` clamps to the songs' years, `from` ≤ `to`), the filter ⇄ URL-query conversion (`toQuery` / `fromQuery`, keys in §4.5), and `neighbour` (the card's prev/next over the filtered order, wrapping; falls back to the full order when the open song is filtered out) and `nextPlayable` (the next track after a given one in that order, wrapping, that passes a predicate; null when none), both taking `years` | DOM, `location`, hash handling (that is `app/router.ts`, which only wires it) |
| `domain/timeline.ts` | **pure**: the three stations (idea, concept, ready) with their fill, and the gaps between them, proportional to the years with a minimum length for 0 or unknown | DOM |
| `domain/pins.ts` | **pure**: `"m:ss"` ⇄ seconds, sorting, `activePin(pins, t)` (the latest pin passed, kept until the next one), marker position as a fraction of duration | DOM, `<audio>` |
| `domain/waveform.ts` | **pure**: peaks from decoded channels (normalised), about 1 bar per 4 px, resample stored peaks to a given width | DOM, Web Audio, `<audio>` |
| `domain/shuffle.ts` | **pure**: `pickRandom(pool, recent, rand)` (a random item not among the last `avoidCount` played; the random source is passed in), `avoidCount` (about half the pool, never all of it) and `ShuffleHistory` (played tracks with a cursor: `next`, `back`, `push`) | DOM, `Math.random`, `<audio>` |
| `domain/seed.ts` | **pure**: FNV-1a hash of a string (the slug) to [0, 1) and a xorshift generator seeded from it. Anything random-looking is seeded by the slug | `Math.random`, song data, canvas calls |
| `domain/colour.ts` | **pure**: `rgb`, `rgba` and `mix` on `"#rrggbb"` strings | colour values of its own (they come from the taxonomy) |
| `domain/snowflake.ts` | **pure**: `song → SnowflakeParams` — the whole mapping in §5.1, in one place, with the size factor, the line-width and glow rules, the snowflake's own turn (`turnRate`, `turnOffset`, `flakeTurn`, and `turnTiming` for the CSS animation), `paintedSize` (canvas side a static snowflake of radius R needs, halo and glow included), `tileFlake(total, tileRadius)` (a list tile's R, the largest tile canvas `full` and this canvas's `share` of it) and `flakeOf` (params and per-ray colours together, the one call renderers make) | canvas calls |
| `domain/ray-colours.ts` | **pure**: `song → colour per ray` — the rule in §5.2 — and the radial gradient stops | canvas calls |
| `domain/record-layout.ts` | **pure**: equal sector angles, the groove spiral, year → radius, `YEAR_DRIFT`, world ⇄ screen transform for a given zoom/pan/rotation, `rotateBy` (drag turns the disc), `zoomAt`, `clampPan`, the exported `clamp`, `fitScale`, `arcGlyphs` (letter positions for a style name along the rim) with `R_NAME`, `NAME_SPACING` and `NAME_RISE`, which ring step applies at a zoom, the year range and in-progress placement, snowflake size scaling with zoom, spin rate, collision radius (snowflake and title), `visibleTitles` (which titles are drawn), hit radius, and the centre-label text rules: `LABEL_INNER` (0.8), `LABEL_MIN_PX` (5) and `labelLineSize` (shrinks a line to fit, `null` = leave it out) (§5.3) | canvas calls, animation loop, the placement solve |
| `domain/record-solve.ts` | **pure**: `solveLayout` — the placement solver (§5.3), returns `Placement` (x, y) per slug | canvas calls, geometry constants (those are in `record-layout.ts`) |
| `render/snowflake.ts` | drawing `SnowflakeParams` + ray colours on a 2D context at a given size; `paintSnowflake` (sizes a canvas with `paintedSize`, halo and glow included, and draws it); `SpriteCache` (pre-rendered snowflakes for the record, 4 px size buckets) | deciding parameters from song data |
| `render/record.ts` | drawing the vinyl: body, sectors, grooves, sheen, year rings, style names along the rim (no counts), the fading rim glow; also exports the canvas font stacks (`BODY`, `DISPLAY`) and `letterSpacing` | the centre label (that is `render/record-label.ts`), layout maths |
| `render/record-label.ts` | the centre label: paper, ice ring, style arcs, and the fitted text (`drawCentreLabel`) | layout maths (sizes come from `labelLineSize`), the rest of the vinyl |
| `render/record-flakes.ts` | the snowflakes with their titles on the record; draws only the titles `visibleTitles` allows (all on hover); `drawBeat`, the ice glow ring behind the playing track's snowflake (`pulse` on the node) | layout maths, deciding snowflake parameters |
| `render/sky.ts` | the seeded star field drawn on the page's fixed background canvas | layout maths, song data |
| `render/radar.ts` | the five-axis radar as an SVG string; the viewBox is framed tight round the labels so it fills its cell | any chart library |
| `views/record.ts` | the record canvas: DPR sizing, animation loop, composing the input, controls and motion modules, click → card, `setPlaying` (the current track's snowflake swells +16 % every 2.2 s (`PULSE_MS`) with `drawBeat`; held enlarged under reduced motion). Takes only the stage. Mounted once for the page's lifetime: its observers and listeners are never released | layout or drawing maths |
| `views/record-input.ts` | pointer input on the canvas: wheel and pinch zoom anchored at the pointer, drag turns the disc (never pans), hover, click; a drag over 4 px is not a click | layout or drawing maths |
| `views/record-controls.ts` | the stage template (canvas and tooltip element) and the hover tooltip | layout or drawing maths |
| `views/record-motion.ts` | spin state (disc and snowflake turn): always on, except under `prefers-reduced-motion` | layout maths (spin rate comes from `domain/record-layout.ts`) |
| `views/content-overlay.ts` | the dev-only overlay: one panel at the top listing content errors and warnings, each message shown once per page load; also used for the dev «pin past the end» warning (`main.ts` calls it under `import.meta.env.DEV`); messages inserted as text | parsing or validation, production use |
| `views/page.ts` | the static page frame: the star sky canvas (mounts `render/sky.ts`, redrawn on resize), the `.page` with `.intro-sec` (title, the on-page «About» section `.about` (`strings.hero.about`) and the intro from `strings.ts`, both hidden from 1100 px; the `.about-btn` shown from 1100 px (centred in the left column, one Record / List tab wide and `--pad-h` high; `--tab-gap` in `layout.css` is shared with `filters.css`), exposed as `PageSlots.aboutButton`; the page takes no content) and `.map-sec`, `.rplayer` (wraps the Filters toggle, first in the DOM, and the random-player slot `.rp`; the slot is `player`), the bar (`.viewbar`: the «View» label `.vlabel` with the Record / List tabs, which take `aria-labelledby` from it) inside `.fanchor`, before `.fpanel` — from 1100 px it is the top row of the filter block, below 1100 px it stays above the view; the Filters toggle is not in the bar; their order is set by CSS), the scroll cue (`wireScrollCue`: one down arrow with a «scroll» caption at the bottom of the intro, smooth scroll to the map section; fades out once the page is scrolled more than 24 px; the same scroll / resize handler toggles `at-intro` on `.page` while the intro's bottom is below half the window, and `layout.css` then slides the bottom player out and hides the filter sheet), the filter anchor and the view slots; `data-view` on `.page` tells CSS which view is shown; returns the slots other views fill. Also the view switch: `showView` (shows one view, sets `data-view`, marks its tab, sets the notice) and `onViewTab` (tab clicks; roving tabindex, ← / → move between tabs) | filtering, state, drawing maths |
| `views/modal.ts` | `trapFocus` (Tab wraps inside a modal window), shared by the track card and About | everything else |
| `views/about.ts` | `mountAbout(button)`: the About window for wide screens — the About button opens the intro (`strings.hero.about`, `hero.intro`) in a modal using the card's `.modal` / `.sheet` frame (`.about-sheet`, styled in `styles/card.css`); ✕, Esc and backdrop close; focus trapped (`views/modal.ts`) and returned to the button; scroll lock (`body.locked`). Narrower, the intro stays on the page | the intro text (it is in `strings.ts`), card logic |
| `views/seek.ts` | `wireSeek`: seeking on a bar by click / drag and keys (← / → 5 s, Home / End), shared by the card waveform (`views/player.ts`) and the random player's line | audio element, rendering, time parsing |
| `views/html.ts` | the `esc()` helper for author text interpolated into `innerHTML`, `bandRing` (the dashed band ring SVG), `info(bubble)` (the ⓘ with its bubble; `.qi` / `.bubble` CSS is in `styles/base.css`), `SKIP_ICON` (the previous / next glyph, shared by the card and the random player) and `turnStyle` (inline style that starts a snowflake's CSS turn) | anything else |
| `views/list.ts` | the tile grid (`TILE_RADIUS` 40; snowflakes scale with the tile via `tileFlake` and turn via CSS), its empty state, flakes centred in the square box so their centres line up across a row, and `setPlaying` (the `playing` class on the current track's tile: its flake box beats, stronger than a record beat, no ring; held enlarged under reduced motion) | filtering logic |
| `views/filter-panel.ts` | filter controls generated from taxonomy + songs (styles, instruments, complexity and year two-thumb ranges, status): each group has an ⓘ note (`strings.filters.info`); options are drum-machine pads — one size in one grid (`.pads`: 3 columns below 600 px, 4 from 600; `--pad-h` below 1100 is `clamp(44px, 7svh, 52px)`, 42 from), each with a light in the instrument colour (`--led` inline from the taxonomy; ice for styles and status), the checkbox hidden but focusable; complexity and year each one line with two thumbs (a `.dual` of two stacked range inputs, 18 px thumbs, the part between lit via `--lo` / `--hi`; `showDual` sets the values and puts the lower thumb on top when it is in the upper half so it stays reachable; each input has an `aria-label` such as «Total complexity: min»), side by side at all widths (`.franges`, gap 20 px below 600, 28 from; a subgrid shares the heading row so the lines stay level when a heading wraps); 28 px between sections below 1100 px, 22 from; no counts beside options (zero-count options are still dimmed); always open from 1100 px, on the page background (no fill, border or padding); below, a bottom sheet (keeps its fill; `max-height` `calc(100svh - var(--player-room))`, meant to fit without scrolling) above the player opened by the Filters toggle (no `<details>`): a round funnel icon with no count, `aria-expanded`, `aria-label` = `strings.filters.toggleLabel(n, total)`, a dot (`.fdot`) while the filters differ from default (`isDefault`), Esc and outside click closing (§4.2) | filtering logic, hard-coded options |
| `views/track-card.ts` | the modal shell (§4.3): title and ✕, the top row `.mtop` (the player section, laid out like the random player — previous · play / pause · next at the left — and the turning snowflake slot `.mflake` at its right, above the player below 900 px; below 900 px the rows are the keys with the snowflake (96 px) at their right, the waveform line, then the pin note), then `.mgrid` of four equal cells; swipe stepping on touch, `PlayerSlots {play, body}` passed to `CardHooks.player` (no audio: `emptyPlayer()` from `views/player.ts` — same rows, a flat line, «Recording coming soon» in the caption (under the line below 900 px) — and a disabled play button; otherwise a hook to `views/player.ts`), focus return (the trap itself is `trapFocus` from `views/modal.ts`), scroll lock, key handling (Esc, ← / →; arrows ignore modified keys) | the card's sections, audio element management, the focus-trap helper |
| `views/card-body.ts` | `renderCardBody(grid, flakeSlot, song, taxonomy, bands)`: the four equal cells, 2×2 from 900 px — From idea to recording | What to listen for (with the band marker), Story | Total complexity with the radar; the cells have no border, fill or padding (the card's background), and the timeline and the chips / band marker sit right under their headings; only the story scrolls, inside its cell; one column below 900 px. The turning snowflake goes into `flakeSlot`; the ⓘ bubbles | rules (those are in `domain/`), audio |
| `views/markdown.ts` | story Markdown → HTML; raw HTML is shown as text; only http(s), mailto and relative links are kept | anything else |
| `views/player.ts` | the card's player UI, laid out like the random player: the round play / pause button (created in `slots.play`); in `slots.body` the caption `.pstate` («Now playing» / «Paused» / «Press play to listen», `strings.player.ready`) with the active-pin note under it (two lines at most; `.pnote.none` when the song has no pins), then the waveform seek slider (click/drag and keyboard) with a thumb (`--at`) and `m:ss / m:ss` at its right; exports `emptyPlayer`; below 900 px no caption: `.player-blk` and `.pcap` become `display: contents` (`player.css`), the line sits under the keys and the note under the line, two lines reserved when the song has pins; hiding pins past the end of the recording (§4.6); `PlayerHooks` only carry the dev warning | the `<audio>` element, pin markers, a pin list or copy link, time parsing (that is `domain/pins.ts`) |
| `views/playback.ts` | the one shared `<audio>` element; pending positions for songs that are not loaded; per-song waveform and duration cache, falling back to a metadata probe when decoding fails; failures are not cached; the run's `mode` (`order` = started from a card, `shuffle` = started by the random player; set when `play` switches song); `autoAdvance(next(ended, mode), moved)` (when a track ends, play the one the callback picks for the mode and report the move); a finished track's end position is not kept | DOM beyond the audio element, rendering |
| `views/pin-markers.ts` | pin diamonds and popovers (below 900 px the markers only mark: no popover, `pointer-events: none` so a tap seeks the waveform, `tabindex=-1` and `aria-hidden` via the `NARROW` media query, re-rendered by the player on width change); (near either end of the bar they open inwards, by pixel distance); markers under 12 px apart merge; on touch the first tap shows the popover and the second seeks; a merged marker seeks to its first pin | audio, time parsing, grouping maths (that is `domain/pins.ts`) |
| `views/random-player.ts` | the random-track player in the page's controls: `mountRandomPlayer(el, playback, taxonomy, hooks)`: previous · play / pause · next, the playing track's turning snowflake (a button that opens the card; its slot keeps its size when idle), the caption («⤮ Plays a random track», then «Now playing» / «Paused» and the title, which opens the card) and a progress line (a `role=slider` that seeks via `views/seek.ts`) with the time `m:ss / m:ss` at its right. A rAF loop moves only the line; time and `aria-valuenow` follow `timeupdate`. A title too long for its line runs as a ticker (`fitTitle`; a second aria-hidden copy closes the loop; re-fitted on width change by a ResizeObserver; it runs under `prefers-reduced-motion` too). Below 1100 px the bottom player's top row is the Filters toggle (left) · keys · caption and title · the snowflake at the right (46 px, 42 px below 600), not beside the line. Styles in `styles/random-player.css`. Keeps a `ShuffleHistory`; a track started elsewhere joins it. Starts plays with mode `shuffle`; ⏮ steps back, at the history's start it restarts the track | the audio element, the pool rule (main.ts passes `pool()`), pick maths (that is `domain/shuffle.ts`) |
| `views/hints.ts` | the first-visit hints (§4.1): ring and note per step, auto-advance every 6 s (not while the note is hovered), Next / Got it, Skip, Esc, click elsewhere; the seen flag in `localStorage` (`obychno.hints`, best effort) | deciding when the page opens on a card (main.ts does) |
| `app/state.ts` | the single app state (`view`, `filters`, `openSlug`, `cue`, `notice`) and change notifications | DOM |
| `app/router.ts` | URL ⇄ state (§4.5), the history policy (`historyAction`): opening a card or switching views pushes an entry; closing a card that has its own entry goes back; filter changes replace; a malformed or unknown slug gives the «Track not found» notice; an empty hash keeps the starting view and is replaced at start with that view's hash. `startRouter(store, space, known, fitView)` (`space` is the `FilterSpace`; `stateToHash(s, space)` likewise) maps a view to one the screen has (phones: list only), corrects a `#/` URL to `#/list` (replace) and returns `{ refit }`, a re-read of the URL that replaces the entry, never pushes | rendering |
| `app/main.ts` | bootstrap: load content, wire views to state; default view by width (list below 1100 px, record from it); a `PHONE`-based `fitView` for the router (must match the phone breakpoint in `styles/layout.css`) and `router.refit()` on media change; `years = yearRange(songs)` and the `FilterSpace`; the random player's pool (playable tracks matching the filters, all playable ones when none match); auto-advance by mode (`shuffle` → `random.next()`, `order` → `nextPlayable` over the current filters, and moving an open card to the next track); syncing the current track (playing or paused) to `setPlaying`; starting the hints unless a card is open | logic of any kind |
| `strings.ts` | every user-visible UI string (English), including the play / pause glyphs (`strings.player.playGlyph`, `pauseGlyph`), `strings.random` and `strings.hints` | — |

`domain/` and `content/parse.ts` are pure and are where tests live. Views hold
no rules — only wiring and DOM.

**Budgets:** a file over 300 lines or a function over 50 lines is a signal to
split. Say so when you cross it.

---

## 4. Behaviour

### 4.1 Layout and look

- **From 1100 px: one screen.** One left column, top to bottom: the title
  (hero, the site name `site` in `strings.ts`, «OBYCHNO_»); the random-track
  player at the column's full width and bigger than on narrow screens (play
  56 px, skip 46 px, snowflake 76 px; previous · play / pause · next, the
  playing track's turning snowflake — a button that opens the card, its slot
  keeps its size when idle — the caption «⤮ Plays a random track» or «Now
  playing» + the title, which opens the card, and a seekable progress line with
  a thumb and the time `m:ss / m:ss`); the filter block, always open (no
  Filters toggle): a block on the page background (no fill or border) whose top row is the view bar (a
  visible «View» label `.vlabel`, `aria-labelledby` on the tabs, and the
  Record / List tabs); it scrolls inside itself on a low window; then the
  About button, which opens the intro (several lines, «_» opens a list line,
  `--mist`, `white-space: pre-line`) in a window (`views/about.ts`). No «About»
  heading and intro text in the column. Right: the view at full
  height; the list scrolls inside it. No legend, no «How to read a snowflake»
  section, no footer. Text in `strings.ts`.
- **Below 1100 px: two sections**, each at least a screen high — the intro
  (title + text), then the bar and the view. Scrolling snaps to them: mandatory
  in the record view, proximity in the list. The second section holds the bar —
  the «View» label and the Record / List tabs — its left edge aligned with the
  intro. The random player is **fixed at the bottom** of the screen
  (`--player-room`, 104 px plus the safe-area inset), with the Filters toggle (a
  funnel icon) at the left of the player's top row, before the keys, the caption and the snowflake (at the right); it is no longer sticky at
  the top. The scroll cue sits at the bottom of the intro, above the safe area. While the intro fills the screen (its bottom below half the window) the player is slid out and the filter sheet hidden (`at-intro` on `.page`). Under 600 px the tab glyphs are
  hidden and the player's snowflake shrinks to 42 px; under 360 px the skip buttons
  get smaller. Long titles in the player run as a ticker. No horizontal scroll
  anywhere.
- **Phones (below 600 px):** the list only. No Record / List switch and no
  record view; the whole bar is hidden. A `#/` URL is corrected to `#/list` (replace, §4.5). The
  breakpoint in `main.ts` must match `styles/layout.css`.
- **Starting view:** phones and tablets (below 1100 px) open on the List; wide
  screens on the Record.
- **First-visit hints (from 1100 px with hover):** three steps, each a glowing
  ring and a note beside it — a round ring on the record disc (the list when
  that is shown): «Select a snowflake…»; the random player; the filter panel.
  They advance every 6 s (not while the note is hovered); Next / Got it, Skip,
  Esc or a click elsewhere end them. Remembered in `localStorage`
  (`obychno.hints`, best effort). None on narrow screens or when the page opens
  on a card.
- **Scroll cue (below 1100 px):** a down arrow with a «scroll» caption at the
  bottom of the intro scrolls smoothly to the map section. It fades out once
  the page is scrolled more than 24 px and comes back at the top. Hidden from
  1100 px. It bobs gently; under `prefers-reduced-motion` it stays still.
- **Stage height:** the full height of the right column from 1100 px; below,
  `100svh` minus `--bar-room` (64 px) and `--player-room`, at least 360 px.
- **One background** for the page, the record and the list: a radial glow plus
  a fixed star canvas (`render/sky.ts`, mounted by `views/page.ts`). The record
  and the list have no borders or panels; from 1100 px the filter block has no
  fill or border either (§4.2).
- **Track card below 900 px** (`styles/card.css`): a full-height sheet with one
  column. That breakpoint belongs to the card only.
- **Single dark theme.** Tokens in `styles/tokens.css`, values from the mockup:
  `--void #05070f` (page), `--deep #0a1020`, `--panel #0d1428`, `--panel2
  #111a33`, `--line #1c2542`, `--frost #e8eeff` (text), `--mist #8f9aba`
  (secondary), `--ice #a6dcff` (UI accent), `--alert #ff8a80` (content errors in the
  dev overlay), `--grid #2a3558` (radar grid lines). Fonts from Google Fonts:
  **Unbounded** only for the hero «OBYCHNO_» and the record's centre label,
  **Golos Text** for everything else (tabular figures for numbers), each with a
  system fallback. One shared uppercase label style serves all small labels. Style and instrument colours come from
  the taxonomy at runtime, never from CSS.

### 4.2 Filters

| Control | Semantics |
|---|---|
| Style (checkbox) | song's style is checked |
| Total complexity (one line, two thumbs, 5–15) | `min ≤ total ≤ max`; min can never exceed max |
| What to listen for (checkbox + colour dot per instrument, «all / none» toggle) | song has **at least one** checked instrument |
| Year (one line, two thumbs, over `years.ready`) | `from ≤ year ≤ to`, inclusive; an in-progress song counts as the latest year; from can never exceed to |
| Status: Ready / In progress | by derived `status`; hidden while no song is in progress |

The band is not a filter; it drives only the marker and the halo.

From 1100 px the panel is **always open**, with no toggle. Below 1100 px it is
**collapsed by default**: the Filters toggle (a round funnel icon, at the
left of the random player's top row, `aria-expanded`) opens it. The toggle
shows no text count: «N of total tracks shown» is in its `aria-label`
(`strings.filters.toggleLabel`), and a dot shows while the filters differ from
the default. The panel has no header. Each group has an ⓘ note; options show
no counts (an option no song uses is dimmed). «Reset filters» button at the
bottom.
- **Options are pads**, one size in one grid (3 columns below 600 px, 4 from
  600), `clamp(44px, 7svh, 52px)` tall below 1100 px and 42 px from it. Each pad has a light: the
  instrument's colour for instruments (from the taxonomy), ice for styles and
  status. The checkbox is hidden but stays focusable. Status pads are hidden
  while no song is in progress.
- **Ranges** are one line with two thumbs; each thumb is an input with its own
  `aria-label` («Total complexity: min»). Sections are 28 px apart below 1100 px,
  22 px from.
- **Order, at all widths:** Style, What to listen for, then Complexity and
  Year side by side (all widths), then Status, then Reset.
- **From 1100 px** the panel is a block on the page background (no fill, border or padding) in the left column,
  under the random player, with the Record / List switch as its top row. It
  scrolls inside itself on a low window and covers nothing.
- **Below 1100 px** it is a bottom sheet above the player (filled background,
  rounded top, up to the full height above the player, meant to fit without scrolling) with pads at least 44 px high. An outside click
  or Esc closes it. There is no panel floating over the record any more.
- **Esc** closes the sheet (focus returns to the toggle if it was inside the panel);
  not while the track card is open.

Both views reflect the same filter state instantly:
- **Record**: non-matching snowflakes stay in place at ~10 % opacity, without
  label, not hoverable or clickable — the layout never jumps.
- **List**: non-matching tiles are hidden; when nothing matches, an empty state
  says so and points to «Reset filters».
- **Card**: prev / next walk the filtered order.

### 4.3 Track card (modal)

Opened from the record, a tile, or a deep link. Top to bottom:
1. **Header:** title and ✕. No ← / → buttons
   in the header, no eyebrow line.
2. **Top row:** the player with pins (§4.6) and, at its right, the turning
   snowflake (radius 80, shown ~132 px; 96 px at the right of the keys below 900 px). The
   player is laid out like the random player: the transport at the left —
   previous · round play / pause in the lead colour (56 px) · next (skip
   buttons round, 46 px, in the card's background colour) — then the caption,
   the waveform with pins and the time. Below 900 px: the keys with the snowflake at their right, then the waveform line, then the pin note under it (two lines reserved when the song has pins); no Now playing / Paused caption. No audio → a disabled play button, a
   flat line and «Recording coming soon» in the caption (under the line below
   900 px; same rows as with audio).
3. **Four equal cells**, 2×2 from 900 px (one column below). From 900 px the
   card fits the window and has a fixed height (`min(100%, 880px)`), a
   one-line title with an ellipsis (the full title on hover), a fixed-height
   top row, and reserved rows for the chips and the band marker, so stepping
   between tracks moves nothing. Only the story scrolls, inside its cell. The
   cells, in order:
   - **From idea to recording** with an ⓘ, right under the heading: Idea = the main melody or idea
       appears; Concept = the song has a structure for the main instruments;
       Ready = recorded, you can listen. Three stations Idea → Concept → Ready with
       years; dots in the lead colour (hollow, half, full); connecting line
       segments proportional to the years between them (minimum length for 0),
       labelled «1 year» / «same year». No summary sentence. A missing
       `years.concept` shows «—», a missing `years.ready` shows «not yet».
   - **What to listen for** (chips and band marker right under the heading)
     with an ⓘ that explains on hover/focus: «What I'd
       like you to notice while listening — the parts this track is built
       around. They also colour the rays of the snowflake.» Then one chip per
       instrument (colour dot with glow, display name), the first marked
       *lead* when there are several. Then the **band marker**: a dashed ring
       icon (same as the snowflake's halo) and «Recorded with **Vita Brevis**»,
       with name, description and years from `bands.yaml` on hover/focus;
       `band: ""` → «Recorded with a band» and a hint that the name is not filled
       in; no band → no band marker at all.
   - **Story** — the Markdown body (raw HTML disabled).
   - the **«Total complexity N / 15»** heading, in the same style as What to
     listen for, with its ⓘ explaining each axis (`strings.card.totalInfo`),
     and the **radar** of the five axes (scale 0–3, grid rings at 1/2/3,
     polygon in the lead colour, axis labels with values), filling its cell.
     No mapping legend in the card.

The snowflake in the top row turns slowly on its own axis as on the record
(static under `prefers-reduced-motion`); it is no longer beside the radar.

Closing: ✕, Esc, click on the backdrop, browser Back. ← / → keys = prev / next.
On touch, swiping left / right on the card steps to the next / previous track
(≥ 60 px, mostly horizontal; not when the swipe starts on the waveform). The
card blocks the browser's horizontal back gesture but keeps pinch-zoom.
Focus is trapped while open and returned to the element that opened it. Page
scroll is locked while open.

**Playback continues when the card closes.** One `<audio>` element exists for
the whole page; the random player (§4.1) shows what is playing and opens its
card. There is no mini-player. Opening another card does not stop the current
track until its own play is pressed.

### 4.4 List

Responsive grid of tiles (auto-fill `minmax(132px, 1fr)`, `minmax(112px, 1fr)` from 1100 px, exactly 6 per row from 1280 px), display order (§2.1). Each
tile is one button that opens the card: small snowflake, title,
«Style · year» (or «in progress»), a row of instrument colour dots and the
dashed band ring when recorded with a band. The snowflake radius is 40 px ×
the size factor from `complexityTotal` (`tileFlake`), scaled with the tile and
centred in a square flake box right above the title, so snowflake centres and
titles line up across a row. The current track's tile (`playing`, also while
paused) beats: its flake box scales to 1.22 and back every 2.2 s with a drop
shadow, no ring (§5.3). Tile snowflakes turn on their own axis by a CSS
animation: timing from `turnTiming` in `domain/snowflake.ts`, applied as an
inline style by `turnStyle` in `views/html.ts`; off under
`prefers-reduced-motion`. Tiles sit on the page background.

### 4.5 URL

The hash holds what is worth sharing:
- `#/` record, `#/list` list. An empty hash keeps the starting view (§4.1) and
  is replaced at start with that view's hash. On a phone (below 600 px) `#/`
  is replaced with `#/list`
- `#/song/<slug>` an open card over the last view
- `#/song/<slug>?t=2:15` card with the player cued there (no autoplay —
  browsers block it). The router parses and emits it; the UI no longer
  produces such links
- filters as a query only when they differ from the default:
  `#/list?style=Progressive,Ambient&min=9&status=ready`

  Filter keys (`domain/filters.ts`, `toQuery` / `fromQuery`):

  | Key | Value |
  |---|---|
  | `style` | checked styles, comma-separated |
  | `listen` | checked instrument ids, comma-separated |
  | `min`, `max` | complexity range, 5–15 |
  | `from`, `to` | year range, inclusive, within the songs' years |
  | `status` | `ready`, `in-progress` or `none` |

  An empty `style=` or `listen=` means none checked. Unknown values are ignored.

Browser Back closes an open card before it changes views. Opening a card or
switching views pushes a history entry; closing a card that has its own entry
goes back, so Back never reopens it; a card opened by a deep link has no such
entry, so closing it replaces; filter changes replace the current entry. An unknown slug
opens the view with a short «Track not found» notice, never a broken modal.

### 4.6 Player and pins

- Card player layout (like the random player): round play/pause button in the
  lead colour (in the transport at the left, §4.3); a caption («Now playing» /
  «Paused» / «Press play to listen») with the active-pin note under it (two
  lines at most); then the waveform with a thumb and the time `m:ss / m:ss` at
  its right. The random player's progress line seeks too (click,
  drag, ← / → 5 s, Home / End), like the card's waveform.
- **When a track ends**, what follows depends on who started the run. Started
  from a card: the next track with a recording in the card's order (filtered,
  wrapping); an open card on the finished track follows to it. Started by the
  random player: another random track, avoiding about half the pool most
  recently played; ⏮ steps back through the random history, and at its start
  restarts the track; ⏭ after a step back replays the history while its tracks
  still match the filters. Resuming with the random player's play makes the
  run a random one, whoever started the track. Random picks come from playable tracks matching the
  filters, or all playable tracks when none match. A finished track starts from
  the top next time.
- **Waveform seek bar**: bars from the real audio (decode on first open with
  Web Audio, reduce to ~1 bar per 4 px, cache per song in memory); played part
  in the lead colour, the rest `--frost` at ~22 %. Click/drag seeks. If decoding
  fails, a plain progress bar.
- **Pin markers** above the bar: small white diamond with a hairline down
  through the waveform, at `at / duration`. Each is a button with an
  `aria-label` carrying time and text. Hover/focus shows a popover with time and
  text; click seeks there and plays. On touch: first tap shows the popover,
  second seeks. Below 900 px markers only mark: no popover, taps seek the
  waveform, out of the tab order. Markers closer than ~12 px merge into one whose popover lists
  both. Popovers near either end of the bar open inwards (decided by pixel
  distance).
- **Active-pin note** under the caption during playback: the most recent pin
  passed, shown until the next pin is reached (no time limit); seeking updates it.
- There is no pin list and no copy link: the markers and the note are the whole
  pin UI.
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
  whole thing is fitted so the disc plus the style names on its rim, with
  16 px of room outside `R_NAME`, fill the stage (`fitScale`: (min side / 2 − 16)
  / `R_NAME` px per unit at zoom 1).
- **Year → radius** is linear between the first and the last `years.ready` in
  the data (both derived, not hard-coded). In-progress songs (no `years.ready`)
  are placed at the latest year.
- **Sectors** — one per style, in taxonomy order, clockwise from the top;
  all sectors the same width. Sector
  boundaries follow the **groove spiral** `θ = u + 0.85 · ln(r / 300)` and fade
  out before the edge; each sector has a faint tint (stronger towards the rim)
  and a **rim band that is a soft glow in the style colour** at the edge. Style names run along the rim, following its curve, in the
  style colour, at `R_NAME` = 1.035 × `R_DISC`, letter by letter (`arcGlyphs`).
  On the lower half they hang from the circle so they stay upright. They turn
  with the disc. No «N tracks» under them.
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
  own. They always turn; under `prefers-reduced-motion`, nothing moves. The
  loop does no drawing while the record is hidden (List view, off-screen, tab
  hidden).
- **Playing track:** the current track's snowflake pulses, also while paused.
  On the record it swells by 16 % over 2.2 s with a soft ice glow ring
  (`drawBeat`); in the list the tile's flake box beats harder over the same
  2.2 s (scale 1.22 with a drop-shadow; no ring). Under `prefers-reduced-motion` it is held enlarged (1.16),
  with no beat. A playing track that the filters leave out gets no glow ring on
  the record; it stays at ~10 %.
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
