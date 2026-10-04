# CLAUDE.md — Regularnik (music diary)

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
  domain/                    pure logic: filters, pins, snowflake params, record layout
  render/                    drawing: snowflake (canvas), record (canvas), radar (SVG)
  views/                     DOM: record, list, filter panel, track card, player
  app/                       state, URL router, bootstrap
  strings.ts                 every UI string (English)
  styles/                    CSS; tokens in styles/tokens.css
scripts/
  new-song.ts                scaffolds a song folder (§2.5)
  check-content.ts           validates every song; part of `build` and `test`
tests/                       vitest unit tests (*.test.ts) for content/parse.ts and domain/
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

Filter checkboxes, legends, chips, ray colours and record sectors are
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
| `domain/filters.ts` | **pure**: `FilterState`, `matches(song, state)`, counts per option, default state from taxonomy, range clamping, and the filter ⇄ URL-query conversion (`toQuery` / `fromQuery`, keys in §4.5) | DOM, `location`, hash handling (that is `app/router.ts`, which only wires it) |
| `domain/pins.ts` | **pure**: `"m:ss"` ⇄ seconds, sorting, `activePin(pins, t)`, marker position as a fraction of duration | DOM, `<audio>` |
| `domain/seed.ts` | **pure**: FNV-1a hash of a string (the slug) to [0, 1) and a xorshift generator seeded from it. Anything random-looking is seeded by the slug | `Math.random`, song data, canvas calls |
| `domain/colour.ts` | **pure**: `rgb`, `rgba` and `mix` on `"#rrggbb"` strings | colour values of its own (they come from the taxonomy) |
| `domain/snowflake.ts` | **pure**: `song → SnowflakeParams` — the whole mapping in §5.1, in one place, with the size factor, the line-width and glow rules, `sampleComplexity` (synthetic complexity for the «How to read» rows) and `flakeOf` (params and per-ray colours together, the one call renderers make) | canvas calls |
| `domain/ray-colours.ts` | **pure**: `song → colour per ray` — the rule in §5.2 — and the radial gradient stops | canvas calls |
| `domain/record-layout.ts` | **pure**: sector angles, the groove spiral, year → radius, the collision solve, world ⇄ screen transform for a given zoom/pan/rotation, which ring step applies at a zoom, the year range and in-progress placement, snowflake size scaling with zoom, spin rate, collision radius (snowflake and title), per-flake turn, hit radius (§5.3) | canvas calls, animation loop |
| `render/snowflake.ts` | drawing `SnowflakeParams` + ray colours on a 2D context at a given size; `paintSnowflake` (sizes a canvas for a static snowflake, halo and glow included, and draws it); `SpriteCache` (pre-rendered snowflakes for the record, 4 px size buckets) | deciding parameters from song data |
| `render/record.ts` | drawing the vinyl: body, sectors, grooves, sheen, year rings, centre label, sector names; also exports the canvas font stacks (`MONO`, `DISPLAY`) | layout maths |
| `render/record-flakes.ts` | the seeded star field behind the stage, and the snowflakes with their titles on the record | layout maths, deciding snowflake parameters |
| `render/radar.ts` | the five-axis radar as an SVG string | any chart library |
| `views/record.ts` | the record canvas: DPR sizing, animation loop, composing the input, controls and motion modules, click → card. Mounted once for the page's lifetime: its observers and listeners are never released | layout or drawing maths |
| `views/record-input.ts` | pointer input on the canvas: wheel and pinch zoom, drag to pan, hover, click; a drag over 4 px is not a click | layout or drawing maths |
| `views/record-controls.ts` | the stage DOM around the canvas, the Pause / Spin and zoom buttons with the readout, the hover tooltip | layout or drawing maths |
| `views/record-motion.ts` | spin state, frame-rate-independent easing of button zoom and reset, reduced motion | layout maths (spin rate and zoom limits come from `domain/record-layout.ts`) |
| `views/content-overlay.ts` | the dev-only overlay that lists content errors and warnings (`main.ts` calls it under `import.meta.env.DEV`); messages inserted as text | parsing or validation, production use |
| `views/page.ts` | the static page frame: hero, map section, legend and how-to slots, footer; returns the slots other views fill | filtering, state, drawing |
| `views/legend.ts` | the legend under the record and the «How to read a snowflake» rows, drawn from synthetic songs | hard-coded song data, mapping rules |
| `views/html.ts` | the `esc()` helper for author text interpolated into `innerHTML` | anything else |
| `views/list.ts` | the tile grid and its empty state | filtering logic |
| `views/filter-panel.ts` | filter controls generated from taxonomy + counts; collapsible on mobile | filtering logic, hard-coded options |
| `views/track-card.ts` | the modal (§4.3), focus trap, Esc/backdrop/Back closing, prev/next | audio element management |
| `views/player.ts` | the one shared `<audio>` element, waveform seek bar, pin markers, active-pin note, pin list, mini-player (§4.6) | time parsing (that is `domain/pins.ts`) |
| `app/state.ts` | the single app state (filters, view, open song) and change notifications | DOM |
| `app/router.ts` | URL ⇄ state (§4.5) | rendering |
| `app/main.ts` | bootstrap: load content, wire views to state | logic of any kind |
| `strings.ts` | every user-visible UI string (English) | — |

`domain/` and `content/parse.ts` are pure and are where tests live. Views hold
no rules — only wiring and DOM.

**Budgets:** a file over 300 lines or a function over 50 lines is a signal to
split. Say so when you cross it.

---

## 4. Behaviour

### 4.1 Layout and look

- Hero: eyebrow «Music diary · N tracks · first year — last year» (derived),
  title, one-paragraph intro. Text in `strings.ts`.
- Below it: **filter panel on the left (≈ 290 px), view on the right**. Above
  the view, a segmented switch **◉ Record / ☰ List** and a short hint for the
  active view. Under the record, a three-column legend: the record, the
  snowflake, the colour.
- Then a section **How to read a snowflake**: one row per parameter at levels
  1 / 2 / 3 with the others at 2, plus a band row (solo / band). Generated from
  the same drawing code with a synthetic song — not images.
- **Mobile (< 900 px)**: one column; the filter panel is a collapsible block
  above the view, collapsed by default, its header showing «N / total». No
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

Counter «N / total» in the panel header; «Reset filters» button at the bottom.
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
     - **Story** — the Markdown body (raw HTML disabled).
     - **From idea to recording** — three stations Idea → Concept → Ready with
       years; dots in the lead colour (hollow, half, full); connecting line
       segments proportional to the years between them (minimum length for 0),
       labelled «1 year» / «same year». No summary sentence.
   - right: the **snowflake** large and static, and directly beneath it the
     **radar** of the five axes (scale 0–3, grid rings at 1/2/3, polygon in the
     lead colour, axis labels with values) and «Total complexity N / 15». No
     mapping legend in the card.

Closing: ✕, Esc, click on the backdrop, browser Back. ← / → keys = prev / next.
Focus is trapped while open and returned to the element that opened it. Page
scroll is locked while open.

**Playback continues when the card closes.** One `<audio>` element exists for
the whole page; when something is playing, a slim mini-player bar stays pinned
to the bottom (title, play/pause, close). Opening another card does not stop
the current track until its own play is pressed.

### 4.4 List

Responsive grid of tiles (`minmax(132px, 1fr)`), display order (§2.1). Each
tile is one button that opens the card: small static snowflake, title,
«Style · year» (or «in progress»), a row of instrument colour dots and the
dashed band ring when recorded with a band.

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

Browser Back closes an open card before it changes views. An unknown slug
opens the view with a short «Track not found» notice, never a broken modal.

### 4.6 Player and pins

- Round play/pause button in the lead colour; `m:ss / m:ss` time.
- **Waveform seek bar**: bars from the real audio (decode on first open with
  Web Audio, reduce to ~1 bar per 4 px, cache per song in memory); played part
  in the lead colour, the rest `--frost` at ~22 %. Click/drag seeks. If decoding
  fails, a plain progress bar.
- **Pin markers** above the bar: small white diamond with a hairline down
  through the waveform, at `at / duration`. Hover/focus shows a popover with
  time and text; click seeks there and plays. On touch: first tap shows the
  popover, second seeks. Markers closer than ~12 px merge into one whose popover
  lists both.
- **Active-pin note** under the bar during playback: the most recent pin
  passed, shown until the next pin or ~8 s; seeking updates it.
- **Pin list** under the player: `0:42  text`, each a button that seeks and
  plays — the accessible form of the markers.
- In the mini-player the markers are ticks on its thin progress line.

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
(reference: `drawRecord`, `solve` in the mockup).

- **World units:** grooves from radius 300 (the year of the earliest song) to
  1000 (the latest); the disc edge at 1070; the paper label radius ≈ 186. The
  whole thing is fitted so the disc plus outside labels fill the stage (≈ min
  side / 2 / 1300 px per unit at zoom 1).
- **Year → radius** is linear between the first and the last `years.ready` in
  the data (both derived, not hard-coded). In-progress songs (no `years.ready`)
  are placed at the latest year.
- **Sectors** — one per style, in taxonomy order, clockwise from the top;
  angular width proportional to the number of songs, with a minimum share
  (~14 % before normalising) so a small style stays usable. Sector boundaries
  follow the **groove spiral** `θ = u + 0.85 · ln(r / 300)`; each sector has a
  faint tint (stronger towards the rim) and a thick **rim band in the style
  colour** at the edge. Style name and «N tracks» sit outside the disc at ~1.17×
  the edge radius, never touching it.
- **Vinyl:** near-black body with a thin light edge; ~110 concentric grooves at
  2–5 % white; a **fixed sheen** (two soft light wedges in a conic gradient
  that do **not** rotate with the disc); a smooth run-out ring before the label.
  The **centre label** spins with the disc: dark blue paper, a thin ice ring,
  four short arcs in the style colours at the sectors' mid-angles, **«REGULARNIK»**
  in the display face, «SIDE A · first — last year» and «N TRACKS · 33⅓ RPM» (only
  the short line when the label is small), black spindle hole.
- **Placement and no overlaps:** each song starts at its year radius inside its
  sector, then a relaxation pushes overlapping songs apart. The collision radius
  covers the snowflake **and its title** (≈ max(1.3 × flake radius, half the
  label width)). Constraints each iteration: stay inside the sector (angular
  margin), stay within ±1.7 years of the true radius, spring back towards it.
  Solve once per viewport size, not per frame.
- **Zoom and pan:** wheel / pinch / «+ − Reset» buttons, ×1 to ×8, zoom anchored
  at the cursor or pinch centre; drag to pan, clamped so the disc cannot be lost.
  Snowflakes grow as `zoom^0.45` — slower than the map — so zooming only ever
  adds space between them. A drag over 4 px is not a click.
- **Year rings** (brighter grooves with labels): every **5 years** below ×1.7,
  every **3 years** below ×3, **every year** from ×3. Labels sit on a dark chip
  along the line from the disc centre towards the middle of the viewport, so
  they stay visible when zoomed in. A readout shows «×2.4 · rings every 3
  years».
- **Motion:** the disc rotates slowly (≈ 0.03 rad/s, divided by `zoom^1.5` so a
  zoomed-in region does not drift away); each snowflake also turns slowly on its
  own. «Pause / Spin» button. Under `prefers-reduced-motion`, nothing moves. The
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
