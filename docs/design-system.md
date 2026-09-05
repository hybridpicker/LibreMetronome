# LibreMetronome Precision Instrument Design System

This document defines the product-wide visual and interaction system for the
web and Capacitor applications. The 2026 app icon is the primary reference: a
precise teal metronome with restrained gold accents. The application canvas is
white; the icon artwork does not dictate the page background.

Updated September 5, 2026.

## Design principles

1. **Timing before decoration.** Motion communicates the beat, transport state,
   or a mode transition. Decorative movement, gradients, glass effects, and 3D
   styling are not part of the product language.
2. **White is the canvas.** Pages and layout surfaces remain white. Layout
   frames, panel dividers and elevation shadows are avoided; spacing establishes
   grouping. Small interactive controls may retain subtle outlines or tints.
3. **Teal operates the instrument.** Teal identifies primary actions, selected
   modes, focus, active tracks, and the first beat.
4. **Gold marks musical emphasis.** Gold is limited to normal/accented beats,
   first-beat timing emphasis, and exceptional musical states.
5. **State is never color-only.** Selected controls use shape, font weight or borders and
   `aria-pressed`; silent, muted, disabled, paused, and training states also use
   text or shape changes.
6. **Touch is deliberate.** Interactive targets are at least 44 by 44 points.
   Tempo and volume use restrained tracks with a visible active portion and a
   large thumb. No operation depends on hover.

## Source tokens

The canonical CSS tokens live in `frontend/src/styles/colors.css`.

| Role | Token | Value or behavior |
| --- | --- | --- |
| Canvas | `--surface-canvas` | White (`#ffffff`) |
| Raised surface | `--surface-raised` | White (`#ffffff`) |
| Primary instrument | `--primary-teal` | LibreMetronome teal (`#00a0a0`) |
| Strong interaction | `--primary-teal-dark` | Dark teal (`#008585`) |
| Timing accent | `--secondary-gold` | Restrained gold (`#f8d38d`) |
| Primary text | `--text-primary` | Deep teal-black (`#183638`) |
| Focus | `--focus-ring` | Three-pixel teal ring with offset |
| Touch target | `--touch-target` | 48 pixels; never below 44 pixels |
| Panel radius | `--radius-panel` | 18 pixels |
| Control radius | `--radius-control` | 10 pixels |

Spacing follows the `--space-1` through `--space-7` scale (4, 8, 12, 16, 24,
32, and 48 pixels). Layout panels have no decorative frames or shadows.

## Components and states

- Transport is text-first. Every mode displays **Start/Pause** and **Tap Tempo**
  in the same row. Icons are supplemental and hidden from assistive technology.
- Modes are labeled **Analog**, **Beat**, **Grid**, **Sequence**, and **Polyrhythm**.
  Internal identifiers remain `analog`, `circle`, `grid`, `multi`, and `polyrhythm`.
- Sequence selection uses a bold central bar number, without an underline or
  playback dot. Shared minus/plus buttons remove the selected bar or add a bar;
  the last remaining bar cannot be removed.
- Tap Tempo shows a short visual response on pointer contact, before release.
  Its confirmation click remains enabled; Bluetooth output can delay that sound.
- Mode selection is a compact toolbar with semantic buttons and
  `aria-pressed` state.
- Beat and subdivision editing uses semantic buttons. Accessible names include
  the beat number and current musical state.
- Sliders expose programmatic labels, a visible value, editable numeric input,
  active track, 26-pixel thumb, and a 44-pixel interaction height.
- Dialog navigation uses tab and tabpanel semantics. The main menu restores
  focus to its trigger when closed.
- Disabled controls retain readable labels and a visible outline while using
  reduced opacity. Muted beats use a dashed shape and an explicit accessible
  name. Silent training is announced with text, not color alone.

## Responsive behavior

- **iPad landscape:** at widths of at least 1000 pixels, visualization and
  controls share a two-column layout. Slider widths, order and vertical spacing
  match across modes. Polyrhythm places Tempo and Volume vertically, aligned
  with the same controls in other modes. Analog shows Swing as unavailable.
- **Beat visualization:** its diameter is 80% of the responsive base size, with
  a 52-pixel margin before the transport row. Touch targets remain generous.
- **iPad portrait and mobile web:** content stacks in a scrollable surface.
  Preserve room around the visualization and transport, and do not impose
  landscape coordinates on narrow screens.
- **Desktop web:** use the same shared interface; native safe-area and platform
  behaviors remain conditional. Do not assume the live site already contains
  changes verified only in a local build.
- **Sequence:** additional bars wrap and can scroll within the visualization
  area in landscape. Swing remains available when selecting odd-length bars.

All responsive rules avoid hover-only affordances and respect CSS safe-area
environment variables. `prefers-reduced-motion` reduces all non-essential
animation and transition durations globally.

## Audio boundary

Visual redesign work must not move beat scheduling onto animation timers. Audio
continues to be scheduled against the Web Audio clock, and visual beat events
remain aligned to the expected audible output time. The shared unlocked
`AudioContext`, iOS interruption recovery, lookahead scheduling, PCM click
samples, and procedural fallback are timing infrastructure rather than visual
implementation details.
