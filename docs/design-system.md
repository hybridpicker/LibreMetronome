# LibreMetronome Precision Instrument Design System

This document defines the product-wide visual and interaction system for the
web and Capacitor applications. The 2026 app icon is the primary reference: a
precise teal metronome on warm ivory, with gold reserved for timing emphasis.

## Design principles

1. **Timing before decoration.** Motion communicates the beat, transport state,
   or a mode transition. Decorative movement, gradients, glass effects, and 3D
   styling are not part of the product language.
2. **Ivory is the canvas.** The application uses warm ivory for the page and a
   slightly lighter ivory for control panels. Heavy gray cards are avoided.
3. **Teal operates the instrument.** Teal identifies primary actions, selected
   modes, focus, active tracks, and the first beat.
4. **Gold marks musical emphasis.** Gold is limited to normal/accented beats,
   first-beat timing emphasis, and exceptional musical states.
5. **State is never color-only.** Selected controls use borders and
   `aria-pressed`; silent, muted, disabled, paused, and training states also use
   text or shape changes.
6. **Touch is deliberate.** Interactive targets are at least 44 by 44 points.
   Tempo and volume use restrained tracks with a visible active portion and a
   large thumb. No operation depends on hover.

## Source tokens

The canonical CSS tokens live in `frontend/src/styles/colors.css`.

| Role | Token | Value or behavior |
| --- | --- | --- |
| Canvas | `--surface-canvas` | Warm ivory (`#f7f3eb`) |
| Raised surface | `--surface-raised` | Light ivory (`#fffdf8`) |
| Primary instrument | `--primary-teal` | LibreMetronome teal (`#00a0a0`) |
| Strong interaction | `--primary-teal-dark` | Dark teal (`#008585`) |
| Timing accent | `--secondary-gold` | Restrained gold (`#f8d38d`) |
| Primary text | `--text-primary` | Deep teal-black (`#183638`) |
| Focus | `--focus-ring` | Three-pixel teal ring with offset |
| Touch target | `--touch-target` | 48 pixels; never below 44 pixels |
| Panel radius | `--radius-panel` | 18 pixels |
| Control radius | `--radius-control` | 10 pixels |

Spacing follows the `--space-1` through `--space-7` scale (4, 8, 12, 16, 24,
32, and 48 pixels). Panels use hairline borders rather than elevation shadows.

## Components and states

- Transport is text-first. Every mode displays **Start/Pause** and **Tap Tempo**
  in the same row. Icons are supplemental and hidden from assistive technology.
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

- **iPad landscape:** visualization and primary controls use a two-panel
  performance surface. Start/Pause, Tap Tempo, tempo, volume, and primary mode
  parameters remain visible without scrolling. Multi and Polyrhythm use their
  own compact two-column instrument layouts.
- **iPad portrait and tablet web:** the visualization remains first, followed by
  the control panel. Transport and tempo are visible near the top of the
  scrollable surface, with safe-area padding on every edge.
- **Desktop web:** the same two-panel system expands deliberately; controls do
  not simply scale with viewport width.
- **Mobile web:** panels stack, transport buttons share the available width,
  and mode selection stays compact while preserving touch targets.

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
