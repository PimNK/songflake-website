# CLAUDE.md — SONGFLAKE (music diary)

A personal music diary published as a static website: every track gets an
audio player with pinned notes, a written story, a few facts (style, what to
listen for, how it matured over the years) and a **generated
snowflake** that is unique to that track. Visitors browse the collection in
two views behind one switch:

1. **Record** — a spinning vinyl record. Distance from the label
   = the year the track was finished, every track a snowflake pressed into it.
   Zoomable and draggable.
2. **List** — a plain, scannable grid of track tiles.

Both views share one filter panel and open the same track card.

**The visual reference is the «Ночная дека» (night deck) restyle in
`docs/design/restyle/`:** `d-night.html` (wide), `d-night-mobile.html` (below
1100 px), `card.js` (the track card) and `night.js` (the theme). Open them in a
browser before building any view: the console, the record, the snowflake, the
filter panel, the card and the list are all there and approved. They are
throwaway files, not code to copy wholesale — reimplement them along the module
map in §3. The older `docs/design/regularnik-mockup.html` is kept for the page
structure and the behaviour it shows; its look is superseded. Its demo-only parts
(§4.7) must not be carried over. Where this file and a mockup differ, this file
wins: the author's later changes (page frame, record placement and interaction,
card order) supersede them. In particular the record has no style sectors, no
style colours and no style names on the rim, and there are no bands.

**UI language: English and Russian.** Every user-visible string lives in
`src/strings/` (`en.ts`, `ru.ts`, same shape). The language is fixed per page
load (`src/lang.ts`): `?lang=` in the URL, else the stored choice
(`localStorage` `songflake.lang`), else the browser's language (`ru*` → Russian,
otherwise English). A language switch in the hero stores the choice and reloads.
Not translated: style names, song titles, the record's centre label (it reuses
the English text), the dev overlay, glyphs. Song titles are the author's and stay
as written (e.g. «На луну»). Stories and pin notes are the author's too; each
may have an optional Russian version in the same folder (§2.1). Without one, the
Russian page shows the original.

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

The **only** other file the author ever edits is `content/taxonomy.yaml`
(a brand-new style or instrument, §2.2).

Every decision below follows from this rule. When in doubt, re-read it.

---

## 1. Architecture

```
songs/                       content — one folder per song (§2)
  <slug>/index.md
  <slug>/audio.mp3
content/
  taxonomy.yaml              styles, instruments and their colours (§2.2)
docs/
  design/restyle/            approved visual reference, «Ночная дека» (see above)
  design/regularnik-mockup.html   the earlier mockup: page structure only
  source/songs.xlsx               the original spreadsheet, corrected; archive only
src/
  content/                   reading and validating songs
  domain/                    pure logic: filters, pins, shuffle, backlight, scope, snowflake params, record layout and placement
  render/                    drawing: snowflake (canvas), record and its stars (canvas), oscilloscope trace (canvas), radar (SVG)
  views/                     DOM: record, list, filter panel, track card, players, backlight knobs, volume
  app/                       state, URL router, bootstrap
  lang.ts                    the page's language and the switch (§3)
  strings/                   every UI string: en.ts, ru.ts, index.ts (the table for the page's language)
  styles/                    CSS; tokens in styles/tokens.css
scripts/
  new-song.ts                scaffolds a song folder (§2.5)
  check-content.ts           validates every song; part of `build` and `test`
tests/                       vitest unit tests (*.test.ts) for content/parse.ts, content/localise.ts, domain/ and strings/ (ru / en key parity, plural forms); fixtures.ts holds shared sample songs and sampleComplexity
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
| `accents` | yes | list of strings | 1+ items, each an instrument in `taxonomy.yaml`. Shown as **Main instrument**; the first one sets the lead colour (no label on the pad) |
| `complexity.*` | yes | int 1–3 each | five axes: `rhythm`, `melody`, `technique`, `instruments`, `structure` |
| `years.idea` | yes | int | |
| `years.concept` | no | int | ≥ `idea` |
| `years.ready` | no | int | ≥ `concept` (or `idea`). Absent = **in progress** |
| `pins` | no | list of `{at, text, text_ru?}` | Notes pinned to moments of the recording (§4.6). `at` is `"m:ss"` or `"h:mm:ss"`, always quoted; `text` is plain text, up to 400 characters (three lines of the card's note). Order does not matter. Requires audio. `text_ru` (optional) is the note on the Russian page; present but empty is an error |
| `audio_url` | no | URL | Use instead of a local file when the audio is hosted elsewhere |
| `hidden` | no | boolean | `true` keeps the song out of the build — a draft |

The **body** is the story, in Markdown. It may be empty; the card then shows a
neutral placeholder from `strings/`.

The body may hold one line `<!-- ru -->` (`RU_MARKER` in `parse.ts`; surrounding
spaces allowed). Above it is the story, after it the Russian story. The Russian
page shows the story above the marker when there is no Russian part. The marker
is recognised on any line, also inside a code fence — a known limit.

**Derived, never stored** (computed in `src/content/`):
- `complexityTotal` = sum of the five axes (5–15)
- `status` = `ready` / `in-progress` from `years.ready`
- `excerpt` = first sentence of the story, for tooltips (of the Russian story on the Russian page)
- `storyRu` = the body after the `<!-- ru -->` line, if any
- `audioSrc` = local file URL, else `audio_url`, else none
- `pins` parsed to seconds and sorted (`text_ru` kept as `textRu`)
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
styles:            # order here = order in the filters
  - Alternative
  - Progressive
  - Ambient

accents:           # id → display name (ru: the Russian one, optional) + colour; the only place these exist
  Guitar:      { name: Guitar,      ru: Гитара,      colour: "#ff9100" }
  Vox:         { name: Vocals,      ru: Вокал,       colour: "#00e5ff" }
  Piano:       { name: Piano,       ru: Фортепиано,  colour: "#d500f9" }
  Drums:       { name: Drums,       ru: Барабаны,    colour: "#ff1744" }
  Bass:        { name: Bass,        ru: Бас,         colour: "#00e676" }
  Synthesizer: { name: Synthesizer, ru: Синтезатор,  colour: "#2979ff" }
```

Filter pads, instrument pads, ray colours and the lists of styles are
**generated from this file plus the songs**. Nothing in HTML, CSS or TS
hard-codes a style name, an instrument or a colour. Adding one line here and
using it in a song is the whole of introducing a new instrument or style.

A style or instrument listed here but used by no song is shown in filters
dimmed, not hidden. Styles have no colour and play no part on the record.

### 2.3 Bands — dropped

The site has no notion of a band: no `band` field, no `content/bands.yaml`, no
marker or ring. A leftover `band:` in a song is an unknown key (a warning, §2.4).

### 2.4 Validation

`src/content/parse.ts` is **pure**: `(slug, rawMarkdown, audioFiles, taxonomy)
→ Song | ContentError[]`. It is used by the browser loader
(`src/content/load.ts`) and by `scripts/check-content.ts`, which runs **before**
`vite build` and inside `npm test`.

**A content error fails the build.** Never ship a site that silently drops a
broken song. Each error names the file, the field and the fix:

```
songs/velotrack/index.md: style "Progresive" is not in content/taxonomy.yaml
  known styles: Alternative, Progressive, Ambient
songs/98/index.md: years.concept (2019) is earlier than years.idea (2021)
songs/lady/: two audio files (lady.mp3, lady-v2.mp3) — keep one
songs/dd/index.md: pins[1].at "2.15" is not a time — write it as "2:15"
songs/shine/index.md: pins present but the song has no audio
songs/dd/index.md: pins[0].text_ru is empty — fill it in or leave it out
songs/dd/index.md: the story has 2 "<!-- ru -->" lines — keep one
```

Pin rules: `at` parses as `m:ss` / `h:mm:ss` with seconds < 60; `text` is
non-empty; no two pins share an `at`; a song with pins has audio. `text` over
400 characters is a **warning**, and so is `text_ru`; an empty `text_ru` is an
error. At most one `<!-- ru -->` line in the body (more is an error). A pin past the end of the recording can only be
detected once audio loads: dev overlay warning, silently skipped in production.

**Warnings** (build passes, listed in the output): unknown frontmatter keys
(say which known field it resembles; a leftover `band` is one), nothing after the `<!-- ru -->` line (the Russian page shows the
story above it). In `npm run dev`, errors and warnings show in an overlay rather
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

### 2.6 Where the first songs came from

`songs/` was generated once from `docs/source/songs.xlsx` (spelling already
corrected by the author). The spreadsheet is an archive now — **the folders are
the source of truth**; never regenerate them from it.

---

## 3. Module map

One responsibility per module. New code goes where this table says; if nothing
fits, propose a new module and update this table in the same change.

| Module | Owns | Must NOT contain |
|---|---|---|
| `content/parse.ts` | **pure**: frontmatter split, YAML parse, zod schema, cross-field rules, derived fields, errors and warnings; `RU_MARKER` and the body split into `story` / `storyRu`; `SongPin` (pin plus optional `textRu`) | DOM, `import.meta.glob`, file system |
| `content/load.ts` | the two `import.meta.glob` calls, taxonomy import, handing raw input to `parse.ts`, dropping `hidden` songs; parses with the unlocalised taxonomy, then applies `content/localise.ts` with `lang` from `src/lang.ts` | validation rules, localisation code of its own |
| `content/taxonomy.ts` | the taxonomy zod schema (`styles` is the ordered list of names, no colours; an accent has `name`, optional `ru`, `colour`), the `Taxonomy` / `Accent` types (`Accent.ru?`), the `toTaxonomy` validator | hard-coded names or colours, lookups |
| `content/localise.ts` | **pure**: content in a given language. `localTaxonomy(t, lang)` (instrument `name` = `ru` ?? `name`), `localSong(song, lang)` (`story` = `storyRu` ?? `story`, `excerpt` recomputed, pin `text` = `textRu` ?? `text`). Drops the Russian fields, so views read only `name`, `story`, `text`. Styles and titles are never translated. Tested in `tests/localise.test.ts` | DOM, language detection (`src/lang.ts`), validation |
| `content/slug.ts` | **pure**: the slug pattern and `slugify` (Cyrillic transliteration, diacritics and apostrophes stripped), shared by `parse.ts` and `scripts/new-song.ts` | DOM, file system, validation of anything but the slug |
| `domain/filters.ts` | **pure**: `FilterState` (styles, instruments — each a set holding every option or exactly one — complexity range, year range `from` / `to` — inclusive, over `placementYear` (§5.3) — and status), `FilterSpace {taxonomy, years}` (what the filters range over; passed to `defaultFilters`, `toQuery`, `fromQuery` and `isDefault`), `matches(song, state, years)`, counts per option, `countMatching(songs, state, years)`, default state from the space (all styles and instruments on), `choose(all, id | null)` (the choice-of-one rule: an id keeps only that option, `null` puts all back; replaces the old `toggle`), range clamping (`setRange`; `setYears(f, end, value, years)` clamps to the songs' years, `from` ≤ `to`), the filter ⇄ URL-query conversion (`toQuery` / `fromQuery`, keys in §4.5; `style` / `listen` with exactly one known value picks it, anything else gives all), and `neighbour` (the next / previous track over the filtered order, wrapping; falls back to the full order when the open song is filtered out) and `playableNeighbour` (the nearest track after (1) or before (−1) a given one in that order, wrapping, that passes a predicate; null when none — the card's prev / next and auto-advance), both taking `years` | DOM, `location`, hash handling (that is `app/router.ts`, which only wires it) |
| `domain/timeline.ts` | **pure**: the three stations (idea, concept, ready) with their fill, and the gaps between them, proportional to the years with a minimum length for 0 or unknown | DOM |
| `domain/pins.ts` | **pure**: `"m:ss"` ⇄ seconds, sorting, `activePin(pins, t)` (the latest pin passed, kept until the next one), marker position as a fraction of duration | DOM, `<audio>` |
| `domain/shuffle.ts` | **pure**: a shuffle bag — `pickRandom(pool, heard, current, rand)` (a random item of the pool not yet heard this round and not the current one; when all are heard the round starts afresh, still never with the current one unless it is the only one; the random source is passed in), `roundDone(pool, heard)` and `ShuffleHistory` (played tracks with a cursor: `next`, `back`, `push`, and the round's heard set) | DOM, `Math.random`, `<audio>` |
| `domain/backlight.ts` | **pure**: the room's light from two knobs (0–1). `backlight(tone)` mixes the cold (0) · neutral (0.5) · warm (1) lamp colours into a `Backlight` (`amber`, `hot`, `cream`, `label`, `off`, and the triples `glow`, `sheen`, `creamRgb`, `paper`); `luminance(knob)` (0.12–1.88); `turnKnob(knob, delta)` (clamped); the `Light` (`lum` and `colours`) and `Backlight` types; `DEFAULT_BRIGHTNESS` 0.471 and `DEFAULT_TONE` 0.064 (a dim cold light). Tested in `tests/backlight.test.ts` | DOM, `localStorage`, canvas calls |
| `domain/seed.ts` | **pure**: FNV-1a hash of a string (the slug) to [0, 1) and a xorshift generator seeded from it. Anything random-looking is seeded by the slug | `Math.random`, song data, canvas calls |
| `domain/colour.ts` | **pure**: `rgb`, `rgba` and `mix` on `"#rrggbb"` strings | colour values of its own (they come from the taxonomy) |
| `domain/snowflake.ts` | **pure**: `song → SnowflakeParams` — the whole mapping in §5.1, in one place, with the size factor, the line-width and glow rules, the snowflake's own turn (`turnRate`, `turnOffset`, `flakeTurn`, and `turnTiming` for the CSS animation), `paintedSize` (canvas side a static snowflake of radius R needs, glow included), `tileFlake(total, tileRadius)` (a list tile's R, the largest tile canvas `full` and this canvas's `share` of it) and `flakeOf` (params and per-ray colours together, the one call renderers make) | canvas calls |
| `domain/ray-colours.ts` | **pure**: `song → colour per ray` — the rule in §5.2 — and the radial gradient stops | canvas calls |
| `domain/record-layout.ts` | **pure**: the groove spiral, `GOLDEN_ANGLE` and `spreadAngle(k)` (the k-th song's angle: −π/2 + k · golden angle, so the first is at the top), year → radius, `YEAR_DRIFT`, world ⇄ screen transform for a given zoom/pan/rotation, `rotateBy` (drag turns the disc), `zoomAt`, `clampPan`, the exported `clamp`, `fitScale` (fits `R_DISC`), which ring step applies at a zoom, the year range and in-progress placement, snowflake size scaling with zoom, spin rate, collision radius (snowflake and title), `visibleTitles` (which titles are drawn), hit radius, and the centre-label text rules: `LABEL_INNER` (0.8), `LABEL_MIN_PX` (5) and `labelLineSize` (shrinks a line to fit, `null` = leave it out) (§5.3) | canvas calls, animation loop, the placement solve |
| `domain/record-solve.ts` | **pure**: `solveLayout(songs, range, radiusOf, iterations)` — the placement solver (§5.3; no styles), returns `Placement` (x, y) per slug | canvas calls, geometry constants (those are in `record-layout.ts`) |
| `render/snowflake.ts` | drawing `SnowflakeParams` + ray colours on a 2D context at a given size; `FlakeInk` `{core, ring, glow, width}` (an optional single-colour ink: the random player draws the playing track's snowflake in the display's phosphor, repainted when the light changes); `paintSnowflake` (sizes a canvas with `paintedSize`, glow included, and draws it); `SpriteCache` (pre-rendered snowflakes for the record, 4 px size buckets); `devicePixelRatioCapped` | deciding parameters from song data |
| `render/record.ts` | drawing the night behind the record: `drawDisc(ctx, t, light, width, height, time)` (the body, which fades out at R 1180 with no edge; a lamp under the label in the glow colour; seeded stars (620) that turn with the disc; grooves from 214 to 1150, lit by a fixed conic sheen — warm from the console side, cold from the window — and thinning out past 880; a run-out to black round the label) and `drawYearRings` (sheen-coloured line, a 9 px mono label on a dark chip); also exports the canvas font stacks (`MONO`, `DISPLAY`) and `letterSpacing` | the centre label (that is `render/record-label.ts`), layout maths |
| `render/record-label.ts` | the centre label: lit paper in the tone's paper colour, a glowing ring at 0.9 R, the fitted text — «SONGFLAKE» in Geologica (`DISPLAY`) in the hot colour, side and track count in Martian Mono (`drawCentreLabel(ctx, t, phi, range, trackCount, light)`) | layout maths (sizes come from `labelLineSize`), the rest of the vinyl |
| `render/record-flakes.ts` | the snowflakes with their titles on the record; titles in `TITLE_FONT` (500 8.5 px mono, `titleFont`), uppercase (`titleText`), 0.6 px tracking, cream at 58 %, hot when hovered or playing; draws only the titles `visibleTitles` allows (all on hover); `drawBeat`, a warm lamp under the playing track's snowflake with a thin ring (`pulse` on the node) | layout maths, deciding snowflake parameters |
| `render/scope.ts` | drawing the oscilloscope trace: `drawScope(ctx, W, H, state, light)` (graticule, a trace alive up to the playhead and flat after it, a dot at the playhead; the swing follows the volume) | the amplitude rules (those are `domain/scope.ts`), DOM, the audio element |
| `domain/scope.ts` | **pure**: the trace's liveliness — `scopeTarget(playing, loaded)` (1 playing, 0.28 paused, 0 unloaded), `easeAmp(amp, target)` (one frame's step, 0.08 of the way) and `atRest(amp, target)` (close enough to stop animating). Tested in `tests/scope.test.ts` | canvas calls, DOM |
| `render/radar.ts` | the five-axis radar as an SVG string, drawn as a round CRT: tube, dashed rings at 1 and 2, a solid one at 3, spokes, the trace in the lead colour with glow, white dots, mono 10 px uppercase labels with hot values; the viewBox is `-185 -138 370 270` | any chart library |
| `views/record.ts` | the record canvas: DPR sizing, animation loop, composing the input, controls and motion modules, click → card, redraw on light change, `setPlaying` (the current track's snowflake swells +16 % every 2.2 s (`PULSE_MS`) with `drawBeat`; held enlarged under reduced motion). Takes only the stage. Mounted once for the page's lifetime: its observers and listeners are never released | layout or drawing maths |
| `views/record-input.ts` | pointer input on the canvas: wheel and pinch zoom anchored at the pointer, drag turns the disc (never pans), hover, click; a drag over 4 px is not a click | layout or drawing maths |
| `views/record-controls.ts` | the stage template (canvas and tooltip element) and the hover tooltip: `showTooltip(tip, song, taxonomy, x, y, stage)`, a small display with the title, «Style · year» (`strings.list.year`), the five axes as rows of three lamps and the instruments with their lights | layout or drawing maths |
| `views/record-motion.ts` | spin state (disc and snowflake turn): always on, except under `prefers-reduced-motion` | layout maths (spin rate comes from `domain/record-layout.ts`) |
| `views/content-overlay.ts` | the dev-only overlay: one panel at the top listing content errors and warnings, each message shown once per page load; also used for the dev «pin past the end» warning (`main.ts` calls it under `import.meta.env.DEV`); messages inserted as text | parsing or validation, production use |
| `views/page.ts` | the static page frame, returning the slots other views fill (`PageSlots`, incl. `scroller`, `controls`, `filterBlock`, `aboutButton`). `.page` holds `.deck` (the faceplate backdrop, wide only), `.scroller` (below 1100 px a fixed scrolling box that ends above the bottom player, so its scrollbar never runs under it; scroll snap is on it; `at-intro` makes it reach the bottom) with `.intro-sec` and `.map-sec`, then `.rplayer.panel` (the Filters toggle, first in the DOM, and the random-player slot `.rp`) and `.fanchor > .fpanel.panel`; CSS places them. `.intro-sec` holds the `.hero` row — the title `h1` and `.hero-keys`: the power lamp `.pwr` (lit while `.playing` is on `.page`), the round `.btn.s.about-btn` «?» (`strings.hero.aboutGlyph`; wide only) and `.btn.s.lang-btn` (shows the current language; click → `switchLang(otherLang)`) — then the intro from `introHtml` in a `section.about` that has an `aria-label` and no heading (hidden from 1100 px, where About opens it), and the scroll cue. The `h1` is sized to the room the keys leave (`--keys-w` 53 px, 97 px from 1100; `--title-max` 64 px, 30 px from 1100; `--title-em` is the title's width in em, set by `measureTitle` after `document.fonts.ready`). `.map-sec` holds `.ctl` (the `.viewbar`: the «View» label `.vlabel` and a `.slot` tablist with a sliding `.knob`, no tab glyphs) and `.views` (notice, stage, list). `wireScrollCue`: one down arrow with a «scroll» caption, smooth scroll to the map section, fades out once `.scroller` is scrolled more than 24 px; the same handler toggles `at-intro` while the intro's bottom is below half the window. `placeDials(slots, dials)` moves the backlight knobs on width change: into `.ctl` from 1100 px, else into the filter sheet's `.foot`. `data-view` on `.page` tells CSS which view is shown. Exports `WIDE` (`min-width: 1100px`, the same break as `styles/layout.css`), used by `track-card`, `random-player` and `main.ts`. Also `showView` (shows one view, sets `data-view`, marks its tab, sets the notice) and `onViewTab` (tab clicks; roving tabindex, ← / → move between tabs). Sets `document.documentElement.lang`. There is no sky canvas | filtering, state, drawing maths |
| `views/modal.ts` | `trapFocus(e, ...roots)` (Tab always moves the focus itself and wraps; with several roots it goes round all of them in the order given), shared by the track card and About | everything else |
| `views/about.ts` | `mountAbout(button, closed)`: the About window for wide screens — the About button opens the intro (`introHtml(strings.hero.intro)`, with the label `strings.hero.about` as its heading) in a modal using the card's frame (`.sheet.panel.about-sheet`, styled in `styles/card.css`, a ✕ key); ✕, Esc and backdrop close; focus trapped (`views/modal.ts`) and returned to the button; scroll lock (`body.locked`); `closed` runs after the window closes (`main.ts` passes `() => startHints(slots, true)`). Narrower, the intro stays on the page | the intro text (it is in `strings/`), card logic |
| `views/seek.ts` | `wireSeek`: seeking on a bar by click / drag and keys (← / → 5 s, Home / End), shared by the card's oscilloscope line (`views/player.ts`) and the random player's line | audio element, rendering, time parsing |
| `views/html.ts` | the `esc()` helper for author text interpolated into `innerHTML`, `icon(name)` (the SVG icons of the console keys: previous, next, play, pause, funnel, tiles (back to the tracks)…), `CLOSE_ICON`, `introHtml(text)` (the intro: a blank line starts a paragraph, a line starting with «_» is a list item with a lamp bullet), `info(bubble, end = false)` (the ⓘ with its bubble; `end` opens it leftwards; `.qi` / `.bubble` CSS is in `styles/base.css`) and `turnStyle` (inline style that starts a snowflake's CSS turn) | anything else |
| `views/list.ts` | the tile grid (`TILE_RADIUS` 36; snowflakes scale with the tile via `tileFlake` and turn via CSS), its empty state, a flake box 112 px high (the canvas may overflow it) so flake centres line up across a row, the title in the record's title style, the «Style · year» label (8 px mono), instrument lamps as 12×4 bars (`--led`), a hover glow, and `setPlaying` (the `playing` class on the current track's tile: it glows and its flake box beats, stronger than a record beat, a warm drop-shadow, no ring; held enlarged under reduced motion) | filtering logic |
| `views/filter-panel.ts` | filter controls generated from taxonomy + songs (styles, instruments, complexity and year, status): each group has an ⓘ note (`strings.filters.info`, `info(bubble, end)`); style and instrument are a choice of one: each group ends with a «Select all» pad, last in the DOM (`strings.filters.all`; `.fopt.all`: `grid-column: -2; grid-row: 1`, the last column of the first row, the other pads flow round it; pad-sized for styles, two rows high for instruments via `.fopt.tall`: `grid-row: 1 / span 2`, `height: auto`; below 600 px (`max-width: 599.98px`) both are `grid-column: 1 / -1`, `grid-row: auto`, normal pad height: a full-width row under the group's other pads, the second row for styles, the third for instruments), the inputs are radios per group (`name` `f-style` / `f-accent`, `choose` from `domain/filters.ts`), and with all on «Select all» is checked and every pad of the group is lit (`.lit`); picking a pad keeps only it; status stays two checkboxes; options are dark rubber pads, `label.fopt.pad`, with a 16×5 lamp top-left (`--led` inline from the taxonomy for instruments; the backlight for styles and status) and the label bottom-left (8.5 px mono uppercase, softer lit text) — the pad look is `.pad` in `styles/base.css`, shared with the card (`filters.css` keeps the cursor, hover, zero dimming, hidden input and focus ring); one size in one grid (`.pads`: 3 columns below 600 px, 4 from 600; `--pad-h` is `clamp(44px, 7svh, 50px)` below 1100 px, 50 px from); the input hidden but focusable; groups sit in faceplate grooves, 14 px apart; complexity and year are faders: each one line with two thumbs (a `.dual` of two stacked range inputs, a tick scale, ridged 14×28 caps, the part between lit in amber via `--lo` / `--hi` as **fractions 0–1**; `showDual` sets the values and puts the lower thumb on top when it is in the upper half so it stays reachable; each input has an `aria-label` such as «Total complexity: min»), with the values in `.chip` windows (`output`), side by side at all widths (`.franges`; a subgrid shares the heading row); no counts beside options (zero-count options are still dimmed); «Reset filters» is `.freset` with a red lamp inside `.foot` (the backlight knobs join `.foot` below 1100 px); the panel is always open from 1100 px, in the faceplate; below, a bottom sheet (bottom `calc(var(--player-room) - 14px)`, slides in; `max-height` `calc(100svh - var(--player-room))`, meant to fit without scrolling) above the player opened by the Filters toggle (no `<details>`): a round funnel icon with no count, `aria-expanded`, `aria-label` = `strings.filters.toggleLabel(n, total)`, a dot (`.fdot`) while the filters differ from default (`isDefault`), Esc and outside click closing (§4.2) | filtering logic, hard-coded options |
| `views/track-card.ts` | `mountTrackCard(content, playback, hooks, dock)`, the modal shell (§4.3; `dock` is `[filter sheet, bottom player]`): no header row, a round ✕ key at the top right; the top row `.mtop` = the display `.mscreen` (caption · time; the title `#card-title`; the oscilloscope line `.wave` with pins; the pin note) with the turning snowflake (150 px, beside the caption, title and line; 96 px below 900 px) at its right inside the display, the pin note across the display's full width under them; then `.mtransport` (previous · play / pause · next, and the volume fader from 900 px); then `.mgrid` of four cells. Below 900 px the keys come first (✕ at their right), then the display; the title runs as a ticker below 900 px and is one line with an ellipsis above. Below 1100 px there is no ✕ and no keys row (`.mtransport` hidden, volume included): the modal ends above the bottom player (`bottom: var(--player-room)`), the sheet is full width with a rounded top (square below 900 px) and the bottom player is its transport; `aria-modal` is `false` there; on open the focus goes to the sheet (`tabindex=-1`) because there is no ✕; Tab goes round the card, the filter sheet and the player (`trapFocus(e, sheet, ...dock)`; from 1100 px `trapFocus(e, sheet)`). Swipe stepping on touch, `PlayerSlots {play, body}` passed to `CardHooks.player` (no audio: `emptyPlayer()` from `views/player.ts` — same rows, a flat line, «Recording coming soon» in the caption (wide only) — and a disabled play button; otherwise a hook to `views/player.ts`), focus return (the trap itself is `trapFocus` from `views/modal.ts`), scroll lock, key handling (Esc, ← / →; arrows ignore modified keys) | the card's sections, audio element management, the focus-trap helper |
| `views/card-body.ts` | `renderCardBody(grid, flakeSlot, song, taxonomy)`: the four cells, 2×2 from 900 px (the upper row as high as it needs, the lower row the rest; 22 px between rows); `--lead` (the lead colour) is set on `.mgrid`. From idea to recording (three lamps — hollow, half, full — with year chips, links proportional to the years, dashed for the same year, dim when unknown, no year labels) | Main instrument (`strings.card.listen`; a `.lpads` grid of lit instrument pads, 96 px wide each, 3 columns below 900 px) | Story (10 px mono uppercase label colour; scrolls inside its cell) | Total complexity (`strings.card.total`, a plain heading with no N / 15, its ⓘ) with the radar; headings are `.ch h3` in the VFD face, 17 px; the cells have no border, fill or padding (the card's background); one column below 900 px. The turning snowflake goes into `flakeSlot`; the ⓘ bubbles | rules (those are in `domain/`), audio |
| `views/markdown.ts` | story Markdown → HTML; raw HTML is shown as text; only http(s), mailto and relative links are kept | anything else |
| `views/player.ts` | `mountPlayer(slots, song, cue, playback, hooks)`, the card's player UI: the caption `.pstate` («Now playing» / «Paused» / «Press play to listen») and the time in the display's top line (`.vfd-top`), the oscilloscope line with the pin markers (seek by click / drag and keyboard via `views/seek.ts`; the time after the line, `.wtime`, below 900 px), then the active-pin note `.pnote` (`.pnote.none` when the song has no pins) directly under the line, showing the text only: hidden `aria-hidden` `.ghost` copies of every pin note and the live `.now` span share one grid cell, so the box is as high as the longest note and the text is never clamped (from 900 px: VFD 16 px, 0.04 em tracking, across the whole display under the snowflake, three lines kept — they hold a 400-character note; below 900 px VFD 17 px); the transport's play button is lit (`data-on`) while this track plays and is not in the lead colour; exports `emptyPlayer`; below 900 px the caption shows playing / paused only (nothing without audio) and `.player-blk` becomes `display: contents` (`player.css`); hiding pins past the end of the recording (§4.6); `PlayerHooks` only carry the dev warning | the `<audio>` element, pin markers, a pin list or copy link, time parsing (that is `domain/pins.ts`) |
| `views/playback.ts` | the one shared `<audio>` element; pending positions for songs that are not loaded; `duration(song)` (read from the recording's metadata with a probe, cached per song; failures are not cached; there is no decoding); `volume` getter / setter (0–1) and an emit on `volumechange`; the run's `mode` (`order` = started from a card, `shuffle` = started by the random player; set when `play` switches song); `playFromStart(song, mode)` (plays from the top, dropping any kept position: ⏮ / ⏭ of both players and auto-advance); `autoAdvance(next(ended, mode), moved)` (when a track ends, play the one the callback picks for the mode from the top and report the move); a finished track's end position is not kept | DOM beyond the audio element, rendering |
| `views/pin-markers.ts` | pin markers on the oscilloscope line: lamp diamonds with a hairline, `.past` once the playhead has passed them, popovers in the VFD face (max 360 px, `POP_HALF` 190; near either end of the bar they open inwards, by pixel distance); exports `NARROW` (`max-width: 899.98px`): below 900 px the markers only mark — no popover, `pointer-events: none` so a tap seeks, `tabindex=-1` and `aria-hidden` — and the player re-renders them on width change; markers under 12 px apart merge; on touch the first tap shows the popover and the second seeks; a merged marker seeks to its first pin | audio, time parsing, grouping maths (that is `domain/pins.ts`) |
| `views/random-player.ts` | the random-track player: `mountRandomPlayer(el, playback, taxonomy, hooks)`. A display (`.vfd`): the caption («⤮ Plays a random track», then «Now playing» / «Paused») and the time `m:ss / m:ss` on top, the title (40 px VFD; opens the card; disabled when idle) and the playing track's turning snowflake in the display's phosphor (one colour, `FlakeInk`, repainted on light change); under it the oscilloscope line (a `role=slider` that seeks via `views/seek.ts`, drawn by `views/scope.ts`). Under that `.rp-keys`: ⏮ ▶ ⏭ (round console keys with SVG icons from `icon()`; play is lit with `data-on`) and, from 1100 px, the volume fader. Below 1100 px there is no oscilloscope line: a thin non-seeking progress line `.rp-hair` sits under the title, and the whole display opens the playing track's card (from 1100 px only the title and the snowflake do). The caption and the title each run as a ticker when too long (`setRun`, `refitOnResize` from `views/ticker.ts`). Below 1100 px the player is a fixed bottom panel at full width: row 1 the display (caption · time, title, the snowflake at the right, 46 px, the `.rp-hair` line), row 2 one centred group: the Filters toggle · ⏮ ▶ ⏭ (skip keys 48 px, play 62 px; under 360 px 44 / 56 and tighter gaps) · the card key `.rp-card` (42 px, like the funnel): «i» opens the playing track's card (disabled while nothing is loaded); while a card is open it is lit (`data-on`), shows the `tiles` glyph and closes the card («Back to the tracks»); from 900 to 1099 px the volume fader shows at the right end of row 2 (`.rp .vol` is hidden only below 900 px, `styles/base.css`). `RandomPlayerHooks` also has `cardOpen()`, `close()` and `step(direction)`; `RandomPlayer` has `refresh()` (re-reads `cardOpen()`: the card key and the skip keys' labels). With a card open below 1100 px the skip keys step the card (`step`, the card's order, like its ← / →; their `aria-label`s switch to `strings.card.prev` / `next`) and ▶ keeps mode `order`. Strings `strings.random.card` and `toList`. Styles in `styles/random-player.css`. Keeps a `ShuffleHistory`; a track started elsewhere joins it. Starts plays with mode `shuffle`; ⏮ steps back, at the history's start it restarts the track | the audio element, the pool rule (main.ts passes `pool()`), pick maths (that is `domain/shuffle.ts`) |
| `views/backlight.ts` | `startBacklight()` applies the light to `:root` (`--lum`, `--g`, `--p`, `--amber`, `--hot`, `--cream`, `--label`, `--off`, `--glass`); `mountDials()` — two knobs, brightness and tone: `role=slider`, drag (`preventDefault` on pointerdown), wheel, arrows, Home / End, `aria-valuetext` (brightness as a percentage; tone as `strings.backlight.cold` / `neutral` / `warm`); positions stored in `localStorage` `songflake.brightness` / `songflake.tone` (best effort); `light()` and `onLight(listener)` give canvases the current `Light` and a redraw hook; `glow(rgb, alpha)` | colour maths (that is `domain/backlight.ts`) |
| `views/volume.ts` | `volumeFader(playback)` returns the element — a speaker and one fader, shared by the random player (from 900 px below 1100 px and from 1100 px; hidden below 900 px by `.rp .vol`) and the card (from 900 px); follows the audio element's `volumechange` (page-lifetime subscription); `restoreVolume` reads `localStorage` `songflake.volume` (best effort, written on change) | the audio element beyond `volume` |
| `views/scope.ts` | `mountScope(canvas, input)`: the oscilloscope on a canvas — DPR sizing, a rAF loop only while playing or easing to rest (`domain/scope.ts`), redraw on light change; `wake()` after play, pause or seek; static under `prefers-reduced-motion` | drawing (that is `render/scope.ts`), the amplitude rules |
| `views/ticker.ts` | `setRun(line, text, may = true)` and `refitOnResize(line, may)`: a line that runs as a ticker when too long for its width (a second aria-hidden copy closes the loop; re-fitted by a ResizeObserver; runs under `prefers-reduced-motion` too). Used by the random player's caption and title and by the card title below 900 px. CSS `.run` / `.tick` in `styles/base.css` | everything else |
| `views/hints.ts` | the first-visit hints (§4.1): `startHints(slots, again = false)` (`again` ignores the seen flag; nothing starts while a `.hints` layer is showing); an amber ring and a note per step (step 3 rings the whole filter block, `PageSlots.filterBlock`; the disc's note sits inside the ring under the label, other targets: right, else left, else inside), auto-advance every 6 s (not while the note is hovered), Next / Got it and Skip as `.tbtn` text keys, Esc, click elsewhere; the seen flag in `localStorage` (`songflake.hints`, best effort); shown on their own once per browser and again every time About closes | deciding when the page opens on a card (main.ts does) |
| `app/state.ts` | the single app state (`view`, `filters`, `openSlug`, `cue`, `notice`) and change notifications | DOM |
| `app/router.ts` | URL ⇄ state (§4.5), the history policy (`historyAction`): opening a card or switching views pushes an entry; closing a card that has its own entry goes back; filter changes replace; closing a card keeps the current filters (the entry it returns to is replaced with them); a malformed or unknown slug gives the «Track not found» notice; an empty hash keeps the starting view and is replaced at start with that view's hash. `startRouter(store, space, known, fitView)` (`space` is the `FilterSpace`; `stateToHash(s, space)` likewise) maps a view to one the screen has (phones: list only), corrects a `#/` URL to `#/list` (replace) and returns `{ refit }`, a re-read of the URL that replaces the entry, never pushes | rendering |
| `app/main.ts` | bootstrap: load content, `startBacklight()`, wire views to state; default view by width (list below 1100 px, record from it); a `PHONE`-based `fitView` for the router (must match the phone breakpoint in `styles/layout.css`) and `router.refit()` on media change; `years = yearRange(songs)` and the `FilterSpace`; `placeDials(slots, mountDials())`; `restoreVolume`; the random player's pool (playable tracks matching the filters, all playable ones when none match); auto-advance by mode (`shuffle` → `random.next()`, `order` → `playableNeighbour` over the current filters, and moving an open card to the next track); the card's prev / next (keys, ← / →, swipe) play the previous / next track with a recording (`playableNeighbour`, mode `order`) and open its card, as the player's keys do; syncing the current track (playing or paused) to `setPlaying` and toggling `.playing` on `.page` while audio plays (the power lamp); below 1100 px (`WIDE` from `views/page.ts`) `playOpened` plays a card's track from the top as it opens (from its `?t=` cue if any; a deep link whose autoplay the browser blocks leaves the track loaded, paused; a track without a recording leaves playback alone), `docked()` (card open below 1100 px) makes the card follow the playing track when it changes (random ⏮ / ⏭, auto-advance), and `stepCard` is shared by the card and the bottom player; passes `[slots.filters, .rplayer]` to the card as `dock` and `cardOpen` / `close` / `step` to the random player; starting the hints unless a card is open, and again when About closes | logic of any kind |
| `lang.ts` | `lang` (`'en'` / `'ru'`), fixed per page load: `?lang=` in the URL, else `localStorage` `songflake.lang`, else `navigator.language` (`ru*` → `ru`); `'en'` outside a browser; `otherLang`; `switchLang(to)` stores the choice (best effort) and reloads with `?lang=` (hash kept; playback stops) | DOM beyond `location` and storage, strings |
| `strings/` | `en.ts` (the shape; exports `en`, `site`, type `Strings`), `ru.ts` (same shape; `forms` for Russian noun plurals), `index.ts` (exports `strings` for `lang`). Every user-visible UI string, including `strings.random`, `strings.backlight` and `strings.player.volume` and `strings.hints`. Not translated: style names, the record's centre label (`labelSide` / `labelTracks` / `labelShort` / `labelName` reuse `en`), the dev overlay (`en.overlay`), glyphs. `tests/strings.test.ts` checks ru / en key parity and plural forms | — |

`domain/` and `content/parse.ts` are pure and are where tests live. Views hold
no rules — only wiring and DOM.

**Budgets:** a file over 300 lines or a function over 50 lines is a signal to
split. Say so when you cross it.

---

## 4. Behaviour

### 4.1 Layout and look

The look is the «Ночная дека» restyle (`docs/design/restyle/`): a dark room, a
console with a faceplate, lamps and displays, and the record lit from behind.

- **From 1100 px: one console.** A grid: a 468 px faceplate column at the left,
  the view at the right spanning the full height. The faceplate rows, top to
  bottom: the hero row (the title «SONGFLAKE» (`site` in `strings/en.ts`) at the
  left, `.hero-keys` at its right: the power lamp (lit while audio plays), the
  round «?» (About) key and the language key (`EN` / `RU`, the current
  language); the title is sized to the room the keys leave); the `.ctl` row (the
  «View» label with the Record / List switch, a `.slot` with a sliding knob and
  no glyphs, and the two backlight knobs); the random player (a display with the
  caption · time, the title in a 40 px VFD face, the playing track's snowflake
  in phosphor, an oscilloscope line, and under it ⏮ ▶ ⏭ and the volume fader);
  the filter block, always open (no Filters toggle), which scrolls inside itself
  on a low window. The About key opens the intro (several lines; a blank line
  starts a paragraph, a «_» line is a list item with a lamp bullet;
  `white-space: pre-line`) in a window (`views/about.ts`); the intro is not on
  the page. The list scrolls inside the view with 34 px padding. No legend, no
  «How to read a snowflake» section, no footer. Text in `strings/`.
- **Below 1100 px: two sections** in `.scroller`, a fixed box that ends above
  the bottom player so its scrollbar never runs under it — the intro (title,
  language key, text; no About key, no «About» heading), then the `.ctl` row (the
  «View» label and the Record / List switch) and the view. Scrolling snaps to
  the sections: mandatory in the record view, proximity in the list. The random
  player is **fixed at the bottom**, full width (`--player-room`, 156 px plus
  the safe-area inset): row 1 its display (caption · time, title, the snowflake
  at the right, 46 px, and under the title a thin non-seeking progress line
  `.rp-hair`; no oscilloscope line here; the whole display opens the playing
  track's card), row 2 one centred group: the Filters toggle (a funnel key) ·
  ⏮ ▶ ⏭ (skip keys 48 px, play 62 px) · the card key `.rp-card` (42 px): «i»
  opens the playing track's card (disabled while nothing is loaded); while a
  card is open it is lit, shows the tiles glyph and closes the card. From 900 to
  1099 px the volume fader shows at the right end of row 2. The player is also the
  open card's transport (§4.3). The scroll cue (below) sits at the
  bottom of the intro, above the safe area. While the intro fills the screen
  (its bottom below half the window) the player is slid out, the filter sheet
  hidden and the scroller reaches the bottom (`at-intro` on `.page`); with a card
  open (`body.locked`) the player and an open filter sheet stay shown even then,
  above the card's backdrop. Under 360 px the keys get smaller (skip 44 px, play
  56 px, tighter gaps). Long titles
  and captions in the player run as a ticker. No horizontal scroll anywhere.
- **Phones (below 600 px):** the list only. No Record / List switch and no
  record view; the whole `.ctl` switch is hidden. A `#/` URL is corrected to
  `#/list` (replace, §4.5). The breakpoint in `main.ts` must match
  `styles/layout.css`.
- **Starting view:** phones and tablets (below 1100 px) open on the List; wide
  screens on the Record.
- **Backlight:** two knobs, brightness and tone (`views/backlight.ts`,
  `domain/backlight.ts`). Brightness scales the light (`luminance`, 0.12–1.88);
  tone mixes the cold · neutral · warm lamp colours. Defaults: a dim, cold light
  (brightness 0.471, tone 0.064). Both are stored in `localStorage`
  (`songflake.brightness`, `songflake.tone`, best effort) and set the lamp
  tokens at runtime; canvases redraw on change. The knobs sit in `.ctl` beside
  the Record / List switch from 1100 px, and at the foot of the filter sheet
  beside Reset below 1100 px.
- **Volume:** a speaker and one fader next to the transport keys of the random
  player (from 900 px; below 900 px it is hidden) and of the card (from 1100 px; the
  card has no keys below 1100). One volume for the page's
  audio element; stored in `localStorage` `songflake.volume` (best effort). The
  oscilloscope swing follows it.
- **First-visit hints (from 1100 px with hover):** three steps, each an amber
  glowing ring, the rest of the screen dimmed (the ring's spread shadow), and a note beside it — a round ring on the record disc (the list
  when that is shown; its note sits inside the ring, under the label): «Select
  a snowflake…»; the random player; the whole filter block (view switch and
  filters). They advance every 6 s (not while the note is hovered); Next / Got
  it, Skip (text keys), Esc or a click elsewhere end them. They show on their
  own once per browser (`localStorage` `songflake.hints`, best effort) and again
  every time the About window closes. None on narrow screens or when the page
  opens on a card.
- **Scroll cue (below 1100 px):** a down arrow with a «scroll» caption at the
  bottom of the intro scrolls smoothly to the map section. It fades out once
  `.scroller` is scrolled more than 24 px and comes back at the top. Hidden from
  1100 px. It bobs gently; under `prefers-reduced-motion` it stays still.
- **Stage height:** the full height of the view column from 1100 px; below,
  `100svh` minus `--bar-room` (64 px) and `--player-room`, at least 360 px.
- **One room** for the page, the record and the list: the page background is a
  CSS light (a warm lamp at the left, a cold window at the top right) plus film
  grain (`--noise`). There is no star canvas on the page; the stars are drawn on
  the record canvas (§5.3). The record and the list have no borders or panels.
- **Track card below 1100 px** (`styles/card.css`): no ✕ and no keys row; the
  modal ends above the bottom player (`bottom: var(--player-room)`), the sheet is
  full width with a rounded top (square below 900 px) and the bottom player is its
  transport (§4.3). **Below 900 px** the cells are one column; that breakpoint
  belongs to the card only.
- **Single dark theme.** Tokens in `styles/tokens.css`: `--night #020202` (the
  room), `--noise` (grain), `--alert #ff8a80` (content errors in the dev
  overlay), `--glow` (a shadow from `--g` and `--lum`). The lamp colours are
  set at runtime by `views/backlight.ts` from the two knobs: `--lum` (strength),
  `--g` and `--p` (rgb triples: the glow and the display's phosphor ground),
  `--amber` (phosphor: display text, lit controls), `--hot` (brightest: titles),
  `--cream` (main text), `--label` (small labels), `--off` (unlit parts),
  `--glass` (value windows); `tokens.css` holds fallback values until then.
  Fonts from Google Fonts: **Geologica** (`--sans`) only for the hero
  «SONGFLAKE» and the record's centre label; **Martian Mono** (`--mono`) for all
  text, small labels in uppercase; **Handjet** (`--vfd`) for the displays'
  characters (titles, pin notes, card headings); each with a system fallback.
  The shared console parts are in `styles/base.css`: `.panel`, `.sec`, `.btn` /
  `.btn.s` / `.k` / `.play`, `.tbtn`, `.pwr`, `.vfd`, `.vfd-top`, `.chip`,
  `.pad`, `.turn`, `.run` / `.tick`, `.qi` / `.bubble`, `.dials` / `.dial`,
  `.dual` (the fader), `.vol`. Instrument colours come from the taxonomy at
  runtime, never from CSS.

### 4.2 Filters

| Control | Semantics |
|---|---|
| Style (radios: «Select all» + one pad per style) | «Select all» (default), or the song's style is the chosen one |
| Total complexity (one fader line, two thumbs, 5–15) | `min ≤ total ≤ max`; min can never exceed max |
| Main instrument (radios: «Select all» + one pad per instrument, colour lamp) | «Select all» (default), or the chosen instrument is **among the song's `accents`** |
| Year (one fader line, two thumbs, over `years.ready`) | `from ≤ year ≤ to`, inclusive; an in-progress song counts as the latest year; from can never exceed to |
| Status: Ready / In progress | by derived `status`; hidden while no song is in progress |

From 1100 px the panel is **always open**, with no toggle. Below 1100 px it is
**collapsed by default**: the Filters toggle (a round funnel icon, at the
left of the random player's second row, `aria-expanded`) opens it. The toggle
shows no text count: «N of total tracks shown» is in its `aria-label`
(`strings.filters.toggleLabel`), and a dot shows while the filters differ from
the default. The panel has no header. Each group has an ⓘ note; options show
no counts (an option no song uses is dimmed). «Reset filters» button at the
bottom.
- **Options are pads**, one size in one grid (3 columns below 600 px, 4 from
  600), `clamp(44px, 7svh, 50px)` tall below 1100 px and 50 px from it. Each pad
  is a dark rubber pad with a 16×5 lamp at its top left (the instrument's colour
  for instruments, from the taxonomy; the backlight colour for styles and
  status) and its label at the bottom left (8.5 px mono, uppercase, softer lit
  text). Style and instrument are a choice of one: the group's «Select all» pad comes last in the DOM and sits in the last column of the first row, the other pads flow round it (pad-sized for styles, two rows high for instruments); below 600 px (`max-width: 599.98px`) it is a full-width row under the group's other pads at normal pad height (`grid-column: 1 / -1`; the second row for styles, the third for instruments), and by default every pad of the group is lit; picking a pad keeps only that option, «Select all» puts all back; several at once is impossible (radios `f-style` / `f-accent`). Status is two checkboxes. The input is hidden but stays focusable. Status pads are hidden
  while no song is in progress. The pad look (`.pad` in `styles/base.css`) is
  shared with the card's instrument pads.
- **Ranges** are faders: one line with two thumbs (a tick scale, an amber lit
  part, ridged 14×28 caps); each thumb is an input with its own `aria-label`
  («Total complexity: min»). The values show in `.chip` windows. Groups sit in
  faceplate grooves, 14 px apart.
- **Order, at all widths:** Style, Main instrument, then Complexity and
  Year side by side (all widths), then Status, then Reset.
- **From 1100 px** the panel is part of the faceplate, under the random player.
  It scrolls inside itself on a low window and covers nothing. «Reset filters»
  (`.freset`, a red lamp inside it) is in `.foot`.
- **Below 1100 px** it is a bottom sheet above the player (filled background,
  rounded top, bottom at `--player-room` − 14 px, slides in, up to the full height above the player, meant to fit without scrolling) with pads at least 44 px high; the backlight knobs sit in its `.foot` beside Reset. An outside click
  or Esc closes it. There is no panel floating over the record any more.
- **Esc** closes the sheet (focus returns to the toggle if it was inside the panel);
  not while the track card is open.

Both views reflect the same filter state instantly:
- **Record**: non-matching snowflakes stay in place at ~10 % opacity, without
  label, not hoverable or clickable — the layout never jumps.
- **List**: non-matching tiles are hidden; when nothing matches, an empty state
  says so and points to «Reset filters».
- **Card**: prev / next walk the filtered order, skipping tracks without a recording, and start the track they reach.

### 4.3 Track card (modal)

Opened from the record, a tile, or a deep link. Top to bottom:
1. **Header:** none. A round ✕ key at the top right (from 1100 px; narrower
   there is no ✕, see below); the title is in the display below.
2. **Top row:** the display `.mscreen` — the caption · time on top, the title
   (`#card-title`, 40 px VFD, one line with an ellipsis; a ticker below 900 px),
   the oscilloscope line with pin markers (§4.6), then the pin note — with the
   turning snowflake at its right **inside the display** (150 px, the pin note running under it across the display; 96 px below
   900 px). Under it, from 1100 px, `.mtransport`: ⏮ ▶ ⏭ (play is not in the lead colour; lit
   while this track plays) and the volume fader; below 1100 px `.mtransport` is
   hidden (volume included) and the bottom player is the transport. Caption:
   «Now playing» / «Paused» / «Press play to listen»; narrow: playing / paused
   only. Below 900 px the display comes first (no keys row, no ✕):
   the caption over the title beside the snowflake, the line, with the time
   after it (`.wtime`), then the pin note, as high as the song's longest note.
   No audio → a disabled play key, a flat line and «Recording coming soon» in
   the caption (wide only; nothing when narrow).
3. **Four cells**, 2×2 from 900 px (one column below), 22 px between the rows.
   From 900 px the card fits the window and has a fixed height
   (`min(100%, 880px)`), a fixed-height top row; the upper cell row takes only
   the height it needs, the story and the radar get the rest
   (`grid-template-rows: auto minmax(0, 1fr)`), so stepping between tracks moves
   nothing. Only the story scrolls, inside its cell. Headings are `.ch h3` in the
   VFD face, 17 px. The cells, in order:
   - **From idea to recording** with an ⓘ, right under the heading: Idea = the
     main melody or idea appears; Concept = the song has a structure for the
     main instruments; Ready = recorded, you can listen. Three lamps Idea →
     Concept → Ready (hollow, half, full, in the lead colour `--lead`, set on
     `.mgrid`), each with a year chip; connecting links proportional to the years
     between them (minimum length for 0), dashed for the same year, dim when the
     year is unknown. No year labels, no summary sentence.
   - **Main instrument** (`strings.card.listen`) with an ⓘ on hover/focus: the
     parts the track is built around; they also colour the rays of the
     snowflake. One lit pad per instrument (light in the instrument colour,
     display name), 96 px wide each, in a 3-column grid when narrow. The first
     instrument in `accents` sets the lead colour.
   - **Story** — the Markdown body (raw HTML disabled), 10 px mono uppercase in
     the label colour.
   - **Total complexity** (a plain heading, no «N / 15») with its ⓘ explaining
     each axis (`strings.card.totalInfo`), and the **radar** of the five axes as
     a round CRT (scale 0–3, dashed rings at 1 and 2, a solid one at 3, spokes,
     the trace in the lead colour with glow, white dots, mono 10 px uppercase
     axis labels with hot values), 315×230 px wide, filling its cell. No mapping
     legend in the card.

The snowflake in the top row turns slowly on its own axis as on the record
(static under `prefers-reduced-motion`).

Closing: ✕, Esc, click on the backdrop, browser Back. ← / → keys = prev / next.
Prev / next work as on the player: the previous / next track with a recording
(filtered order, wrapping) starts playing and the card moves to it.
On touch, swiping left / right on the card steps to the next / previous track
(≥ 60 px, mostly horizontal; not when the swipe starts on the oscilloscope line). The
card blocks the browser's horizontal back gesture but keeps pinch-zoom.
Focus is trapped while open and returned to the element that opened it. Page
scroll is locked while open.

**Below 1100 px** the card is not a modal window (`aria-modal="false"`): it fills
the area above the bottom player, which stays usable and is the card's transport.
There is no ✕, so on open the focus goes to the sheet. Tab goes round the card,
the filter sheet and the player. Closing: the player's card key (tiles glyph),
Esc, browser Back; the backdrop is not reachable. Swipe and ← / → still step. The
player's ⏮ / ⏭ step the card in the card's order (filtered, tracks with a
recording, wrapping) and play the track from the top, and ▶ keeps the card's
order. Opening a card of a track with a recording plays it at once from the top
(from its `?t=` cue if present; if the browser blocks autoplay on a deep link the
track stays loaded, paused); a track without a recording leaves playback alone.
When the playing track changes while a card is open (random ⏮ / ⏭, auto-advance),
the card follows it.

**Playback continues when the card closes.** One `<audio>` element exists for
the whole page; the random player (§4.1) shows what is playing and opens its
card. There is no mini-player. From 1100 px opening another card does not stop
the current track until its own play is pressed; below 1100 px the player always
holds the open card's track (above).

### 4.4 List

Responsive grid of tiles (auto-fill `minmax(132px, 1fr)` below 1100 px,
exactly six in a row from it), display order (§2.1). Each tile is one button
that opens the card: a snowflake in a flake box 112 px high (the canvas may
overflow it), the title in the record's title style, a «Style · year» label
(`strings.list.year`; «in progress» when unfinished; 8 px mono) and a row of
instrument lamps (12×4 bars in the instrument colour). The snowflake radius is
36 px × the size factor from `complexityTotal` (`tileFlake`), scaled with the
tile and centred in the flake box, so snowflake centres and titles line up
across a row. Tiles glow on hover. The current track's tile (`playing`, also
while paused) glows and its flake box beats: it scales to 1.22 and back every
2.2 s with a warm drop-shadow, no ring (§5.3). Tile snowflakes turn on their own
axis by a CSS animation: timing from `turnTiming` in `domain/snowflake.ts`,
applied as an inline style by `turnStyle` in `views/html.ts`; off under
`prefers-reduced-motion`. Tiles sit on the page background. From 1100 px the
list scrolls inside the view with 34 px padding.

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
  `#/list?style=Progressive&min=9&status=ready`

  Filter keys (`domain/filters.ts`, `toQuery` / `fromQuery`):

  | Key | Value |
  |---|---|
  | `style` | the chosen style |
  | `listen` | the chosen instrument id |
  | `min`, `max` | complexity range, 5–15 |
  | `from`, `to` | year range, inclusive, within the songs' years |
  | `status` | `ready`, `in-progress` or `none` |

  `style` / `listen` with exactly one known value pick it; an empty, multi-value or unknown one means all. Other unknown values are ignored.

Browser Back closes an open card before it changes views. Opening a card or
switching views pushes a history entry; closing a card that has its own entry
goes back, so Back never reopens it; a card opened by a deep link has no such
entry, so closing it replaces; filter changes replace the current entry. Closing a
card (✕, the bottom player's key, Esc or Back) keeps the filters set while it was open: the
entry under the card is rewritten with them (replace). An unknown slug
opens the view with a short «Track not found» notice, never a broken modal.

### 4.6 Player and pins

- Card player layout (like the random player): the display with the caption
  («Now playing» / «Paused» / «Press play to listen») and the time
  `m:ss / m:ss` on top, the oscilloscope line with pins, and the active-pin note
  directly under the line, never clamped (hidden copies of every pin note of the
  song size its box to the longest, so the whole text fits; from 900 px at least
  3 lines are kept); the transport keys under the display (§4.3). The random
  player's progress line (from 1100 px) seeks too (click, drag, ← / → 5 s, Home / End), like the
  card's line.
- **When a track ends**, what follows depends on who started the run. Started
  from a card: the next track with a recording in the card's order (filtered,
  wrapping); an open card on the finished track follows to it. Started by the
  random player: another random track from a shuffle bag — no track comes
  round again until every track of the pool has been heard, and a new round
  never starts with the track that just played; ⏮ steps back through the random history, and at its start
  restarts the track; ⏭ after a step back replays the history while its tracks
  still match the filters. Resuming with the random player's play makes the
  run a random one, whoever started the track. Random picks come from playable tracks matching the
  filters, or all playable tracks when none match. A finished track starts from
  the top next time.
- **Oscilloscope line** (`views/scope.ts`, `render/scope.ts`,
  `domain/scope.ts`): the progress line of the random player (from 1100 px; below,
  a thin non-seeking `.rp-hair` line) and the card is a
  trace on a canvas with a graticule. It is alive (swings) up to the playhead,
  flat after it, with a dot at the playhead; the swing follows the volume. It
  eases to full while playing, to 0.28 when paused, and is flat when nothing is
  loaded. The loop runs only while playing or easing; it redraws when the
  backlight changes; under `prefers-reduced-motion` it is static. Click / drag
  seeks. There is no decoding of the audio: only the duration is read, from the
  recording's metadata, and cached per song.
- **Pin markers** on the line: a lamp diamond with a hairline down through the
  trace, at `at / duration`; `.past` once the playhead has passed it. Each is a button with an
  `aria-label` carrying time and text. Hover/focus shows a popover (VFD face, max 360 px) with time and
  text; click seeks there and plays. On touch: first tap shows the popover,
  second seeks. Below 900 px markers only mark: no popover, taps seek the
  line, out of the tab order. Markers closer than ~12 px merge into one whose popover lists
  both. Popovers near either end of the bar open inwards (decided by pixel
  distance).
- **Active-pin note** under the line during playback, the text only (the time is in the marker's popover; VFD 17 px uppercase): the most recent pin
  passed, shown until the next pin is reached (no time limit); seeking updates it.
- There is no pin list and no copy link: the markers and the note are the whole
  pin UI.
- A `?t=` cue never jumps a track that is already playing. Switching tracks
  keeps the previous track's position for its own play key, but ⏮ / ⏭ (both
  players, the card's ← / → and swipe) and auto-advance always start the track
  they reach from the top.

### 4.7 Demo-only parts of the mockup — do not carry over

The mockup simulates what does not exist yet: playback is a timer with no
sound, durations are invented, the waveform is pseudo-random, every song has
two «Example pin» notes. The real site uses audio files and `pins` from
`index.md`.

---

## 5. Visual system

### 5.1 The snowflake

Each song's snowflake is a **pure function of its data** — the same song always
draws the same snowflake. The mapping lives in `domain/snowflake.ts`; drawing
lives in `render/snowflake.ts`.

| Song data | Visual parameter |
|---|---|
| `structure` 1/2/3 | number of rays: 4 / 6 / 8, first ray pointing up |
| `rhythm` 1/2/3 | forks at the ray tip: single tip / one fork / fork that forks again (each fork ±0.55 rad, ×0.62 length) |
| `melody` 1/2/3 | the main ray is a gentle wave: amplitude 0 / 0.035 R / 0.06 R, 1.5 / 2.5 periods, growing with √t so it starts straight at the centre |
| `technique` 1/2/3 | offshoots from the middle of each ray: none / two (±0.78 rad from the local tangent) / two, each with one further offshoot turning outward |
| `instruments` 1/2/3 | 1 / 2 / 3 inner polygon rings (same order as the rays), frost at ~35 % |
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
- Rings are neutral frost, never instrument colours.
- In the random player the playing track's snowflake is drawn in one colour,
  the display's phosphor (`FlakeInk`), not in instrument colours.

### 5.3 The record

The record view is a canvas drawn every frame from `domain/record-layout.ts`
and `domain/record-solve.ts` (reference: `d-night.html`; the placement and the
interaction below supersede it). The stars are drawn on this canvas and turn
with the disc.

- **World units:** songs sit from radius 300 (the year of the earliest song) to
  1000 (the latest); `R_DISC` 1070 (what `fitScale` fits); the paper label radius ≈ 186. The
  whole thing is fitted so the disc, with 16 px of room outside `R_DISC`,
  fills the stage (`fitScale`: (min side / 2 − 16) / `R_DISC` px per unit at
  zoom 1).
- **Year → radius** is linear between the first and the last `years.ready` in
  the data (both derived, not hard-coded). In-progress songs (no `years.ready`)
  are placed at the latest year.
- **Vinyl:** no edge — the near-black body fades out to radius 1180 (`R_BODY`);
  a lamp under the label in the glow colour; 620 seeded stars that turn with the
  disc (warm and cold); grooves from radius 214 to 1150, lit by a **fixed
  sheen** (a conic gradient that does **not** rotate with the disc: warm from
  the console side, cold from the window) and thinning out past 880; a run-out
  to black round the label. No style colours, no style names. The **centre
  label** spins with the disc: lit paper in the tone's paper colour, a glowing
  ring at 0.9 R, **«SONGFLAKE»** in Geologica in the hot colour, «SIDE A ·
  first — last year» and «N TRACKS · 33⅓ RPM» in Martian Mono (only the short
  line when the label is small), black spindle hole. Every text line is fitted
  inside 0.8 × the label radius (`labelLineSize`); a line that would need less
  than 5 px is left out, so text never crosses the label's edge. Titles on the
  record: 500 8.5 px mono, uppercase, 0.6 px tracking, cream at 58 %, hot when
  hovered or playing. The base snowflake radius is 20 (`flakeRadius`).
- **Placement and no overlaps:** each song sits at its exact year radius.
  Songs in year order (`placementYear`, ties by title, then slug) take the
  k-th `spreadAngle(k)`: the first at the top, each next one a golden angle
  on, so songs of one year never bunch up. Styles play no part (the style
  filter only dims non-matching songs). The angle gives the song's home on the
  groove spiral. A relaxation then
  pushes overlapping songs apart, mostly along the groove, the one with the smaller angle
  counterclockwise; songs are pulled back towards home, with radial drift capped at `YEAR_DRIFT` = 0.45 year, so
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
  every **3 years** below ×3, **every year** from ×3. Rings are lines in the sheen colour, labels 9 px mono on a dark chip. Labels sit along the line from the disc centre
  towards the middle of the viewport, so they stay visible when zoomed in.
- **Motion:** the disc rotates slowly (≈ 0.03 rad/s, divided by `zoom^1.5` so a
  zoomed-in region does not drift away); each snowflake also turns slowly on its
  own. They always turn; under `prefers-reduced-motion`, nothing moves. The
  loop does no drawing while the record is hidden (List view, off-screen, tab
  hidden).
- **Playing track:** the current track's snowflake pulses, also while paused.
  On the record it swells by 16 % over 2.2 s with a warm lamp under it and a thin ring
  (`drawBeat`); in the list the tile's flake box beats harder over the same
  2.2 s (scale 1.22 with a warm drop-shadow; no ring). Under `prefers-reduced-motion` it is held enlarged (1.16),
  with no beat. A playing track that the filters leave out gets no glow ring on
  the record; it stays at ~10 %.
- **Hover:** the snowflake grows ×1.18, its title brightens, a tooltip shows
  title, «Style · year», the five axes as rows of three lamps and the
  instruments with their lights. **Click** opens the card. On
  touch, tap opens the card directly.
- **Accessibility:** the canvas has an `aria-label` that points to the List
  view, which is the accessible equivalent. All controls are keyboard operable
  with a visible focus ring.

---

## 6. Explicitly out of scope (for now)

The 3D pyramid view. A CMS or admin page. Comments, likes, accounts. Lyrics as
a separate field (they can go in the story). Photos/covers. Languages
other than English and Russian. Sort controls in
the list.

Each of these is a deliberate omission; propose it before building it.

---

## 7. Definition of Done

A change is done when all of these hold — state which you verified and which
you skipped:

- [ ] `npm run lint`, `npm run typecheck` clean
- [ ] `npm test` passes — includes `check-content` over the real `songs/`
- [ ] `npm run build` succeeds and `npm run preview` shows the change
- [ ] checked at 375 px and at desktop width, against the restyle mockups in `docs/design/restyle/`
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
- **No hard-coded content.** A song title, style, instrument or
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
