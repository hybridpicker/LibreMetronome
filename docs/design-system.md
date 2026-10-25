# LibreMetronome Design System

One calm, precise look for every output: web (desktop and phone browser),
the paid, ad-free, offline Android app, and the iOS/macOS shell. One token
base, one set of components; only the arrangement changes with the width.

Updated October 25, 2026 (design round 3, direction "Score": a bar of music
on white; flat, one blue accent). Rounds 1 and 2 (teal, "Linienblatt", dark
and then light plate) are history; before and after are in
`redesign-before-after-round3.png`.

## Principles

1. **A bar of music.** The Beat view is one bar on a five-line staff; Analog is
   the pendulum over the same staff; Sequence and Polyrhythm show every beat
   as a notehead, Grid keeps its filled squares. The page is white, the lines
   are hairlines.
2. **Flat.** No 3D, no relief edges, no shadows, no gradients, no framed cards,
   no dark surfaces (high contrast is the one exception). Radius is 0.
3. **One accent, a blue pair** from the Okabe-Ito palette, which protanopia and
   deuteranopia read well: `--accent-ink` for text, links, the Tap label and
   accent marks; `--accent` for fills (current beat, Start, active keys,
   progress, the mode underline). Neutrals are tinted faintly blue.
4. **State is shape, not colour.** A quarter note (an eighth note in eighth
   mode) = normal, ">" under it = accent, "^" = first beat, quarter rest =
   muted; the current beat turns blue and grows a little, so it reads in
   monochrome too. Plus `aria-pressed` and text names.
5. **Touch is deliberate.** Targets are 44 px (40 px on screens shorter than
   760 px). Text is never below 12 px. Beats never come closer than a finger:
   the bar wraps onto a second staff (Beat) or block (Grid) instead.
6. **Quiet type.** Lato Light for the BPM numeral and dialog titles, Regular for
   labels (13 px, sentence case, 0.02em), Bold for values and the active mode.

## Tokens (`frontend/src/styles/colors.css`)

| Role | Token | Value |
| --- | --- | --- |
| Canvas | `--bg` | `#ffffff` |
| Surface | `--surface` | `#f2f5f8` (pressed keys, tapping) |
| Text | `--ink` | `#111111` |
| Secondary text, key outlines | `--ink-2` | `#5a6672` (5.9:1 on white, 5.4:1 on surface) |
| Hairlines, staff lines | `--line` | `#dbe0e6` |
| Graphics only | `--line-strong` (`--ink-3` is an alias) | `#768593` (3.8:1: slider track, rings, grid cells) |
| Accent fill | `--accent` | `#0072b2` (5.2:1; white on it 5.2:1) |
| Accent as text | `--accent-ink` | `#005a8d` (7.4:1) |
| Pressed Start | `--accent-deep` | `#004b78` |
| Selected tint | `--accent-wash` | `#e6f1f7` |
| Plate | `--dial-*` | the same values; the plate stays a separate set so it can change on its own |
| Type scale | `--fs-1` … `--fs-5` | 12 / 13 / 17 / 22 / 80 px; the BPM numeral is 64 (short phones) / 80 / 104 px (`--fs-5-short`, `--fs-5`, `--fs-5-wide`); titles 28 and 32 px |
| Weights | `--fw-light`, `-regular`, `-bold` | 300 / 400 / 700 |
| Shape | `--r-control`, `--r-surface` | 0 and 0 |
| Strokes | `--stroke`, `-viz`, `-select`, `-final` | 1 / 1.5 / 2 / 3 px |
| Motion | `--t-in`, `--t-out` | 90 ms ease-out when a beat fills, 160 ms when it empties; none under reduced motion |
| Space | `--sp-1` … `--sp-6` | 4 / 8 / 12 / 16 / 24 / 32 px |
| Touch | `--touch` | 44 px (40 px when the window is shorter than 760 px) |
| Dialog scrim | `--overlay-bg` | white at 82 %: the page fades, it does not go dark |

If the owner wants the teal-tinted neutrals of 0.8.0 back: `surface #eff6f6`,
`line #dbe7e7`, `line-strong #7b9090`, `ink-2 #5c6e6e` (noted in `colors.css`).

**Typeface:** Lato (bundled: Light, Regular, Bold; the Thin cut is gone). It
ships inside the app, so the metrics are identical on every device, which the
no-scroll guarantee relies on. Lato has no note symbols, so every glyph of
notation is an SVG (`components/metronome/ScoreGlyphs.js`).

**Authority.** `DesignTokens.test.js` pins the palette, contrast ratios, scale,
radii, motion, bundled fonts and the mode overrides, and it fails on raw
colours, shadows, gradients, tracked capitals or radii above 0 in every shipped
stylesheet (the list is in the test). The old variable names remain as
aliases at the end of `colors.css` for untouched dialogs.

## Files

- `colors.css`: tokens.
- `instrument-system.css`: base rules and the components of the main screen.
- `score.css`: the staff and the marks of notation.
- `layout.css`: the shell grid and the arrangement per width.
- `accessibility-modes.css`: token overrides for high contrast, large text and
  the colour-blind palettes.
- `components/metronome/Score/`: `staffLayout.js` and `gridLayout.js` (pure
  geometry, tested), `BeatStaff.js`, `tempoWord.js`.
- `components/metronome/ScoreGlyphs.js`: tempo note, beat mark, accent glyph.
- `components/metronome/Controls/RangeInput.js`: the slider with its progress.
- `utils/layoutSize.js`: reports the size of the visualisation area.

## Arrangement

The page is one grid that fills the window and never scrolls
(header, mode bar, visualisation, controls, Start/Tap, footer).

| Width | Arrangement |
| --- | --- |
| Phone, below 600 px | One column; visualisation on top, controls below, Start/Tap at the bottom (thumb zone). Beats per bar is a stepper below 520 px. The tempo mark has its own line, minus, slider and plus sit below it. |
| Tablet, 600-1023 px | Portrait: the phone arrangement; the tempo line holds numeral, minus, slider and plus together. Landscape: two columns. |
| Desktop, 1024 px and up | Two columns: visualisation left, controls and Start/Tap right; content centred, max 1200 px. |

## Components

- **Keys:** square, 1 px `--ink-2` outline. Active: blue fill, white glyph.
  Pressed: surface tone. Hover (pointer only): the outline turns ink. Focus: a
  2 px `--focus` ring, 3 px clear of the key. Disabled: 45 %.
- **Mode bar:** a hairline, labels in sentence case; the active mode is bold
  with a 2 px blue underline.
- **Beat:** one bar on a five-line staff. Time signature N/4 (N/8 with eighth
  notes: flags on the stems), thin bar line left, thin plus 3 px final bar line
  right, the tempo mark "Allegro ♩ = 120" above. Heads are filled: beats are
  quarter notes, eighth mode shows eighth notes. The staff space grows from
  12 px on a phone to 28 px on a desktop, the marks with it. When the beats
  would be narrower than a finger, the bar wraps onto a second staff. The tempo
  words come from a fixed table (Grave below 40, Largo 40, Larghetto 60,
  Adagio 66, Andante 76, Moderato 108, Allegro 120, Vivace 156, Presto 176,
  Prestissimo 200).
- **Analog:** the same staff behind the pendulum, a hairline arc with a tick
  every 7.5° (the middle one blue), the weight is a plain disc (a hollow ring
  at rest, blue while it swings), the tempo mark top left.
- **Grid:** hairline cells; "on" is a filled square, the current column turns
  blue, ">" or "^" sits above the column, a muted column is empty. Nine
  columns wrap onto two blocks on a phone.
- **Sequence, Polyrhythm:** rings of 1 px, the selected one 1.5 px blue; each
  beat is a notehead on the ring with its accent mark above it, muted beats
  are rests. On small rings (four circles on a phone) the number stands alone
  in the centre; the heads already count the beats. In every mode a beat is a
  key: each click steps muted, normal, accent, first beat (Polyrhythm beats
  were not clickable before round 3).
- **Controls:** no lines between rows, rows 12 px apart (8 px on short screens);
  labels 13 px Regular, values 17 px Bold; the tempo reads "♩ = 120 bpm" in a
  Light numeral. Sliders have a 1 px track, a 1.5 px blue progress line and a
  notehead handle (16 × 11 px).
- **Start** is 56 px, filled blue with a white label, pressed `#004b78`,
  playing: outlined 2 px with the label "Pause". **Tap Tempo** is outlined in
  `--ink-2` with a blue label (tapping: surface tone). On two-column layouts
  both sit on the floor of the right column.
- **Training strip:** a slim strip on a hairline docked to the bottom of the
  plate (grows and scrolls while editing, Save filled / Cancel outlined);
  Accelerate is a text key at the plate's top-right corner.
- **Dialogs** (menu, Guide, Accessibility): one flat sheet over the faded page
  (no dark scrim), Light 28 px title, square 44 px close key, tabs as text with a
  2 px underline, hairline sections, 24 px checkboxes with a tick, selects and
  inputs as square keys; Save filled blue, Cancel outlined; 720 px wide on the
  desktop. **Support** (web only) has a back key, a Light 32 px title and a blue
  Donate key.
- **Web only:** footer line with Source and Donate; the app build
  (`IS_NATIVE_APP`) renders no footer and no donation elements.

## Accessibility modes (token overrides only)

- **High contrast:** black, white, cyan, yellow focus; active keys are filled
  cyan with a black glyph and a yellow edge.
- **Large text:** the scale steps to 14 / 16 / 19 / 24 / 96 px (numeral 72 / 96 /
  120 px on short phones / phones / desktop).
- **Protanopia, deuteranopia:** no override, the accent already is the
  Okabe-Ito blue (the setting says so). **Tritanopia:** `#a13f00` text,
  `#c24d00` fill, `#7d3000` pressed. **Monochromacy:** ink.

## App icon

Pendulum with a notehead weight in `#0072b2` on white, over a staff and a
hairline arc (`frontend/assets/icon-source.svg`; foreground, background and
splash derive from it). `npm run assets:generate` writes the iOS and Android
sets and the PWA icons; favicons, touch icons, tiles, the desktop icon and
`docs/store/icon-512.png` come from `icon-only.png`. The manifest theme colour
is `#0072b2`, the background `#ffffff`.

## Verification

`frontend/scripts/measure-layout.mjs` (headless Chrome through playwright-core,
dev only) builds the page from `build/`, visits every viewport and view, reports
the overflow in px, small touch targets and small text, and writes PNGs.
Required result: overflow 0 in all 42 cases (412x805, 393x780, 360x740,
768x1024, 1024x768, 1280x800, 1440x900 across analog, beat, grid, sequence,
sequence with four circles, polyrhythm). `--mode contrast|large|colorblind|
tritanopia|monochromacy` repeats them in an accessibility mode, `--beats 9`
repeats them with nine beats per bar (the worst case). Build with
`CI=false npm run build` first: the existing lint warning in
`AccessibilityMenu.js` fails a `CI=true` build.

## Audio boundary

Visual changes must not move beat scheduling onto animation timers. Audio stays
scheduled against the Web Audio clock; visual beat events follow the expected
audible output time. The staff, the grid and the rings only read the beat
number the scheduler publishes.
