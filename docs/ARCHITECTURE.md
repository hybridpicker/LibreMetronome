# Architecture

LibreMetronome is one React single-page app that runs in four shells: the web (served by Django),
native iOS/Android apps (Capacitor), a macOS app (Swift + WKWebView) and a Linux desktop app
(Electron). The timing-critical code lives in the browser; the Django backend only serves the
bundle, the click sounds and a few small JSON endpoints.

```
                 +-------------------------------+
                 |  frontend/ (React 18, CRA)     |
                 |  Web Audio API scheduling      |
                 +---+-----------+-----------+---+
                     |           |           |
        web build -> |           |           | -> npm run build -> frontend/build
                     v           v           v
        backend/ (Django)   ios/ android/    macos/ (Swift)   desktop/ (Electron)
        index.html, /api,   (Capacitor 8)    WKWebView,       serves the same build,
        sound files                          Dock, media keys forwards /api to the site
```

## Repository layout

| Path | Purpose |
| --- | --- |
| `frontend/src` | the app (see below) |
| `frontend/ios`, `frontend/android` | Capacitor native projects; `npm run mobile:sync` copies the web build into them |
| `backend/` | Django 5 project `libremetronome_backend` and the `metronome_api` app |
| `macos/` | native Swift wrapper, built with `macos/build.sh` |
| `desktop/` | Electron wrapper for Linux, installed with `desktop/install.sh` |
| `docs/` | release plans, design system, store material, this file, the quality report |
| `backup/` | frozen copy of an older `src` (accessibility branch), unreferenced by any build or test |
| `run_tests.sh` | single entry point for lint, type checks and tests |

## Backend

* `metronome_api.models.MetronomeSoundSet` - three audio files (first beat, accent, normal beat) plus
  name and description. Only `.wav`, `.mp3`, `.ogg` pass validation. `is_active` is a legacy flag; the
  selected sound set is stored by the frontend in a cookie (`services/soundSetService.js`).
* `metronome_api.views` - JSON endpoints (`/api/sound-sets/`, `/api/sound-sets/<id>/`,
  `/api/active-sound-set/`, `/api/default-sound-set/`, `/api/sound-sets/<id>/set-active/` (POST),
  `/api/support-info/`), the sound file route (`/metronome_sounds/<file>`, `/assets/audio/<file>`) and
  the React catch-all that serves `templates/index.html` for every other path. Unexpected errors in the
  JSON views become `{"error": "Internal server error"}` with status 500; details go to the log.
* `libremetronome_backend.settings` refuses to start without `SECRET_KEY` (read from the environment or
  the repository-level `.env`). `test_settings` only relaxes SSL redirects and secure cookies.
* Management commands `check_sounds`, `fix_sound_paths`, `move_sound_files` repair sound set data.

## Frontend

Entry: `src/index.js` mounts `App` and initialises the native runtimes (`mobile.js` for Capacitor,
`desktop.js` for the Electron/macOS bridges, `nativeApp.js` for platform detection).

### Layers

1. **App shell** - `App.js` owns the global state (mode, tempo, volume, swing, subdivisions, accents,
   theme/accessibility), persists tempo and volume in `localStorage`, wires keyboard shortcuts
   (`hooks/useKeyboardShortcuts.js`) and renders the selected mode plus menus and modals.
2. **Modes** (`components/metronome/*`) - five visualisations of the same metronome. Analog and Beat
   (circle) both render through `AdvancedMetronome` (with `AnalogMode/AnalogMetronomeCanvas` for the
   pendulum), Grid through `GridMode`, Sequence through `MultiCircleMode` and Polyrhythm through
   `PolyrhythmMode`. The "Score" components (`components/metronome/Score`) draw the notation-style beat
   display.
3. **Timing engine** (`hooks/useMetronomeLogic/*`) - the hook used by the single-pattern modes:
   * `audioBuffers.js` - creates/unlocks the shared `AudioContext`, loads and decodes the click buffers
     (sound set from the API with built-in fallbacks).
   * `scheduler.js` - look-ahead scheduler: a 20 ms timer schedules every click that falls into the
     next 100 ms on the audio clock (`SCHEDULE_AHEAD_TIME`, `SCHEDULER_INTERVAL`), applies swing and
     defers visual callbacks until the sound leaves the output (`outputLatency`).
   * `trainingLogic.js` - measure boundaries, speed-up after N measures, fixed and random silence.
   * `tapTempo.js`, `tapFeedback.js` - tap tempo averaging and the tap click.
   * `constants.js` - `TEMPO_MIN` 15, `TEMPO_MAX` 240 and timing constants.
   Polyrhythm and Sequence mode bring their own schedulers (`usePolyrhythmLogic.js`,
   `MultiCircleMode/hooks/*`) because they run two patterns or several bars.
4. **Services and utils** - `services/soundSetService.js` (API client with cookie preference),
   `services/cookieUtils.js`, `utils/accessibility/*` (high contrast, large text, reduced motion,
   screen-reader announcements, haptics), `utils/supportUtils.js` (Stripe link).

### Data flow of one click

```
Start -> App (isPaused=false) -> useMetronomeLogic effect -> runScheduler() every 20 ms
      -> scheduleSubdivision(): AudioBufferSourceNode.start(when) on the audio clock
      -> scheduleAtAudioTime(): visual/state callback at when + outputLatency
      -> at a measure boundary: trainingLogic.handleMeasureBoundary() may change tempo or start silence
```

Audio is always scheduled on `AudioContext.currentTime`, never from the React render loop, so UI work
cannot move a click.

### Implicit contracts (window globals and events)

Several components still communicate through the window object; they are covered by characterization
tests and listed here so that nobody removes them by accident.

* Events: `metronome-set-tempo`, `metronome-tap-tempo`, `metronome-toggle-play`,
  `metronome-measure-boundary`, `metronome-settings-applied`, `metronome-beat`,
  `metronome-preview-sound`, `metronome-preview-pattern`.
* Globals: `window.setMetronomeTempo`, `window.handleGlobalTapTempo`, `window.setShowSupportPage`,
  `window.handleGlobalPlayPause*`, `window.isSilencePhaseRef`, `window._audioContext*`,
  `window.tapTempoRef`, the accessibility flags (`window.audioFeedbackEnabled` and friends) and
  `window.metronomeDebug`.

### Styling

`src/styles/colors.css` holds all design tokens ("Score" palette: white page, one blue accent); the other
stylesheets consume them. `tests/DesignTokens.test.js` and `tests/ColorScheme.test.js` enforce that no
shipped stylesheet hard-codes a colour and that the token pairs meet WCAG contrast. See
`docs/design-system.md`.

## Quality gates

`./run_tests.sh` runs, in order: ruff (lint + format check), mypy, bandit, the Django tests, ESLint
(`--max-warnings 0`) and the Jest suite. `./run_tests.sh coverage` adds coverage gates. Current numbers
and decisions are logged in `docs/quality-report.md`.
