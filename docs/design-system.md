# LibreMetronome Design System

One calm, precise look for every output: web (desktop and phone browser),
the paid, ad-free, offline Android app, and the iOS/macOS shell. One token
base, one set of components; only the arrangement changes with the width.

Updated October 24, 2026 (build 0.7.0).

## Principles

1. **A measuring instrument.** Almost monochrome. White canvas, flat grey
   surfaces, hairlines instead of framed cards.
2. **One accent.** Teal marks the active state, the current beat and the Start
   button, nothing else. Gold appears only as a thin contour or a small dot on
   accented beats, never as a surface.
3. **No decoration.** No shadows, no gradients, no legend dots, no filled gold.
   The meaning of the beat marks is explained in the Guide.
4. **State is never colour only.** Shape carries it too (ring, ring with dot,
   dashed ring, filled), plus `aria-pressed` and text names.
5. **Touch is deliberate.** Targets are 44 px (40 px on screens shorter than
   760 px). Text is never below 12 px.

## Tokens (`frontend/src/styles/colors.css`)

| Role | Token | Value |
| --- | --- | --- |
| Canvas | `--bg` | `#ffffff` |
| Surface | `--surface` | `#f6f7f7` |
| Text | `--ink` | `#111111` |
| Secondary text | `--ink-2` | `#6b7072` (4.9:1 on white) |
| Graphics only | `--ink-3` | `#868c8e` (rings, filled cells; 3.4:1) |
| Lines | `--line`, `--line-strong` | `#e3e6e6`, `#c7cccd` |
| Accent | `--accent` | `#00a0a0` (fills, current beat, thumb) |
| Accent as text | `--accent-ink` | `#00797a` (5.2:1) |
| Gold | `--gold` | `#b98a12` (contour or dot) |
| Type scale | `--fs-1` … `--fs-5` | 12 / 14 / 17 / 22 / 44 px |
| Radius | `--r-control`, `--r-surface` | 10 px, 12 px |
| Space | `--sp-1` … `--sp-6` | 4 / 8 / 12 / 16 / 24 / 32 px |
| Touch | `--touch` | 44 px (40 px when the window is shorter than 760 px) |

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

- **Mode selector:** text-only segmented control; the active segment is white
  with a teal underline.
- **Beat marks** (Beat, Sequence, Polyrhythm): current beat teal filled with a
  hairline halo; normal grey ring; accent gold ring; first beat gold ring with
  a gold dot; muted dashed pale ring.
- **Analog:** rod, pivot, weight; the weight is teal while running.
- **Grid:** hairline cells; filled cells grey, the current column teal; accent
  and first-beat cells get a gold contour.
- **Sequence:** circles with hairline rings, the selected one teal; "Circles"
  stepper in the top corner.
- **Controls:** rows separated by hairlines; 10 px outlined buttons; selected
  chips get a teal outline; sliders have a 4 px track, teal progress and a ring
  thumb.
- **Start** is solid teal; **Tap Tempo** is a grey outline button.
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
