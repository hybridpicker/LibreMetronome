# LibreMetronome Design System

One calm, precise look for every output: web (desktop and phone browser),
the paid, ad-free, offline Android app, and the iOS/macOS shell. One token
base, one set of components; only the arrangement changes with the width.

Updated October 24, 2026 (build 0.8.0, design round 2: "Linienblatt" with a dark dial plate).

## Principles

1. **A measuring instrument.** A light page of hairlines and small uppercase
   labels, with the visualisation on one dark teal-black *dial plate*. No
   framed cards.
2. **One colour: teal.** It marks the active state, the current beat, accented
   beats (ring) and the Start button. There is no gold. Neutrals carry a faint
   teal tint so the screen feels warm, not sterile.
3. **No decoration.** No shadows, no gradients, no legend dots, no filled gold.
   The meaning of the beat marks is explained in the Guide.
4. **State is never colour only.** Shape carries it too (ring, ring with dot,
   dashed ring, filled), plus `aria-pressed` and text names.
5. **Touch is deliberate.** Targets are 44 px (40 px on screens shorter than
   760 px). Text is never below 12 px.
6. **Character from proportion and line.** The BPM numeral is large (64 px) in
   the regular cut; keys are square (2 px); labels are small, uppercase and
   tracked; the plate carries a hairline frame, a 60-tick dial (Beat) or a
   3.75-degree scale with baseline (Analog). The current beat is a larger
   filled mark with a halo; a calm 120 ms transition, none under reduced motion.

## Tokens (`frontend/src/styles/colors.css`)

| Role | Token | Value |
| --- | --- | --- |
| Canvas | `--bg` | `#ffffff` |
| Surface | `--surface` | `#eff6f6` |
| Text | `--ink` | `#111111` |
| Secondary text | `--ink-2` | `#5c6e6e` (5.5:1 on white) |
| Graphics only | `--ink-3` | `#7b9090` (rings, filled cells; 3.4:1) |
| Lines | `--line`, `--line-strong` | `#dbe7e7`, `#bdd0d0` |
| Accent | `--accent` | `#00a0a0` (fills, current beat, thumb) |
| Accent as text | `--accent-ink` | `#00797a` (5.2:1) |
| Type scale | `--fs-1` … `--fs-5` | 12 / 14 / 17 / 22 / 64 px (large text 14 / 17 / 20 / 24 / 72; 56 on short screens) |
| Dial plate | `--dial-bg`, `--dial-ink`, `--dial-ink-2`, `--dial-ink-3`, `--dial-line`, `--dial-line-strong`, `--dial-accent`, `--dial-focus` | `#0b2626`, `#e8f4f4`, `#9bb7b7`, `#5f8585`, `#1c4141`, `#4a7a7a`, `#2ec4c4`, `#7ee6e6` |
| Radius | `--r-control`, `--r-surface` | 2 px (square keys), 4 px (plate) |
| Space | `--sp-1` … `--sp-6` | 4 / 8 / 12 / 16 / 24 / 32 px |
| Touch | `--touch` | 44 px (40 px when the window is shorter than 760 px) |

**The dial plate.** `.viz-card`, the training strip and the controls laid over
the plate (circle stepper, ratio, swap, Accelerate) re-map the normal token
names (`--bg`, `--ink`, `--accent`, ...) to the `--dial-*` values, so every
component works on both surfaces without its own colour. Accessibility modes
override the `--dial-*` tokens too (high contrast: black plate, white lines,
cyan accent; colour blind: Okabe-Ito sky blue / orange; monochrome: white).
Canvas drawing (Analog) reads its colours from the canvas element, so it picks
up the plate and the modes.

**Typeface:** Lato (bundled), regular and bold. It ships inside the app, so the
metrics are identical on every device, which the no-scroll guarantee relies on.
BPM is a large tabular number (`--fs-5`).

Components use tokens only; `DesignTokens.test.js` fails on raw colours or
drop shadows in `layout.css` and `instrument-system.css`. The old variable
names remain as aliases at the end of `colors.css` for untouched dialogs.

## Files

- `colors.css`: tokens.
- `instrument-system.css`: base rules and every component (what it looks like).
- `layout.css`: the shell grid and the arrangement per width (where it sits).
- `accessibility-modes.css`: high contrast, large text, colour-blind palettes as
  token overrides.
- `utils/layoutSize.js`: reports the size of the visualisation area so SVG,
  canvas and DOM visualisations scale to it at every width.

## Arrangement

The page is one grid that fills the window and never scrolls
(header, mode selector, visualisation, controls, Start/Tap, footer).

| Width | Arrangement |
| --- | --- |
| Phone, below 600 px | One column; visualisation on top, controls below, Start/Tap at the bottom (thumb zone). Beats per bar is a stepper below 520 px. |
| Tablet, 600-1023 px | Portrait: the phone arrangement with more air. Landscape: two columns. |
| Desktop, 1024 px and up | Two columns: visualisation left, controls and Start/Tap right (top-aligned, so rows do not jump between modes); content centred, max 1200 px. |

## Components

- **Mode selector:** text on a hairline; the active mode is bold ink with a
  3 px teal underline (small caps from 600 px).
- **Beat marks** (Beat, Sequence, Polyrhythm): current beat teal filled with a
  hairline halo; normal grey ring; accent teal ring; first beat teal ring with
  a dot; muted dashed pale ring.
- **Beat** sits inside a watch-bezel of 60 hairline ticks; **Analog** shows rod,
  pivot and weight under a hairline tick scale; the weight is teal while running.
- **Grid:** hairline cells; filled cells grey, the current column teal; accent
  and first-beat cells get a teal contour.
- **Sequence:** circles with hairline rings, the selected one teal; "Circles"
  stepper in the top corner.
- **Controls:** rows separated by hairlines; small uppercase labels; 2 px
  outlined square keys; selected chips get a teal outline and wash; sliders have
  a 2 px track, teal progress and a 12x28 px fader cap.
- **Start** is solid `--accent-ink` (white text, 5.2:1); **Tap Tempo** is an
  outlined teal key. On two-column layouts both sit on the floor of the right
  column, level with the plate's bottom edge, in every mode.
- **Training strip:** a slim hairline strip docked to the plate's bottom edge
  (grows and scrolls while editing, Save/Cancel pinned); Accelerate sits at the
  plate's top-right corner.
- **Dialogs** (menu, Guide, Accessibility, Support): one flat sheet, uppercase
  title, square close key inside at the top right, tabs as text with a 3 px
  underline, hairline sections, 24 px square checkboxes with a tick when
  checked, inputs and selects as square keys without native chrome.
- **Web only:** footer line with Source and Donate; the app build
  (`IS_NATIVE_APP`) renders no footer and no donation elements.

## Verification

`frontend/scripts/measure-layout.mjs` (headless Chrome through playwright-core,
dev only) builds the page from `build/`, visits every viewport and view, reports
the overflow in px, small touch targets and small text, and writes PNGs.
Required result: overflow 0 in all 42 cases (412x805, 393x780, 360x740,
768x1024, 1024x768, 1280x800, 1440x900 across analog, beat, grid, sequence,
sequence with four circles, polyrhythm). `--mode contrast|large|colorblind`
repeats a viewport in an accessibility mode.

## Audio boundary

Visual changes must not move beat scheduling onto animation timers. Audio stays
scheduled against the Web Audio clock; visual beat events follow the expected
audible output time.
