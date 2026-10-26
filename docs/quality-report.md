# Quality report

Running log of the autonomous quality pass (branch `chore/quality-night-2026-10-25`).
All data in tests is synthetic; no credentials or personal data are used anywhere.

## Phase 0 - Baseline (2026-10-25, commit 3b8e56f)

### Test results

| Suite | Result |
| --- | --- |
| Backend (`manage.py test`, Django 5.2.17, Python 3.12) | 17 tests, all green |
| Frontend (`react-scripts test`, Jest 27 via CRA) | 37 suites / 262 tests, all green |

### Coverage

Backend (`coverage run --branch`, sources `metronome_api` + `libremetronome_backend`):
**55 % total** (line+branch combined). Gaps: `views.py` 41 %, `serializers.py` 0 %,
`views.py` of the project package 0 %, management commands 0 %, wsgi/asgi 0 %.

Frontend (CRA defaults, i.e. `src/**` *including* the test files themselves):
**26.7 % lines, 21.2 % branches, 27.0 % functions** (1577 / 5914 lines).

Frontend per area (lines / branches, before any change):

| Area | Lines | Branches | Size (lines) |
| --- | --- | --- | --- |
| `components/metronome/Controls` | 78.0 % | 77.2 % | 109 |
| `components/metronome/Score` | 100 % | 84.1 % | 85 |
| `components/Support` | 94.1 % | 88.2 % | 34 |
| `components/metronome/MultiCircleMode` | 32.1 % | 25.8 % | 867 |
| `components/metronome/PolyrhythmMode` | 25.4 % | 17.3 % | 961 |
| `components/metronome/GridMode` | 37.2 % | 30.3 % | 148 |
| `components/metronome/AnalogMode` | 2.8 % | 0 % | 141 |
| `components/Menu` (+ overlays) | ~3 % | ~1 % | ~470 |
| `components/Training` | 13.0 % | 1.5 % | 463 |
| `components/accessibility` | 13.6 % | 4.3 % | 154 |
| `hooks` | 28.9 % | 34.7 % | 325 |
| `hooks/useMetronomeLogic` | 28.8 % | 22.0 % | 742 |
| `services` | 19.5 % | 8.8 % | 118 |
| `utils` / `utils/accessibility` | 76.1 % / 3.5 % | 50 % / 0 % | 46 / 226 |

### Lint, types, security

| Check | Baseline |
| --- | --- |
| ruff (default rule set plus the machine's global config) on `backend/` | 48 findings (19 unsorted imports, 14 mutable class defaults, 6 blind excepts, 3 unused imports, ...) |
| bandit on `backend/` | 0 issues (1000 LOC) |
| mypy | not configured |
| pip-audit `requirements.txt` | no known vulnerabilities |
| ESLint (`react-app`, `react-app/jest`) on `frontend/src` | 88 errors, 38 warnings (mostly `testing-library/*` and `jest/*` rules in test files, 33 `no-unused-vars`) |
| `npm audit` | 2 critical: `@capacitor/android` and `@capacitor/ios` 8.4.2 (GHSA-rvm3-566m-v7fv, fixed in 8.4.3) |

### Complexity hotspots (ESLint `complexity` > 15)

`useKeyboardShortcuts.js` handler (67), `audioBuffers.js` `loadClickBuffers` (32) and loader (26),
`trainingLogic.js` `handleMeasureBoundary` (26), `accessibilityUtils.js` (24, 17),
`useAudioContext.js` (23, 22), `useMultiCircleLogic.js` (23), `App.js` (22, 20),
`scheduleBeat.js` (19), `usePolyrhythmLogic.js` (19), `useSchedulerLogic.js` (18),
`useMetronomeLogic/index.js` (18), `InfoModal.js` (17), `TrainingDebugHelper.js` (17),
`MultiCircleTrainingActiveContainer.js` (16), `tapTempo.js` (16).

### Largest source files

`usePolyrhythmLogic.js` 1099, `App.js` 790, `PolyrhythmMetronome.js` 688,
`useMetronomeLogic/index.js` 611, `TrainingActiveContainer.js` 515, `accessibilityUtils.js` 511,
`AdvancedMetronome.js` 503, `useMultiCircleLogic.js` 485, `audioBuffers.js` 478.

### Dead-code candidates (knip, to be verified by hand in Phase 4)

~47 files are not reachable from `src/index.js` (several debug helpers, the `FeedbackOverlay`,
`InfoOverlay`, `TrainingOverlay`, `StyleGuide`, an older `MultiCircleMode/usePolyrhythmLogic.js`,
`PolyrhythmLogic/*` helpers, `useAudio.js`, `useMultiCircleScheduler.js`, ...), unused dependencies
`react-helmet` and `web-vitals`, and unused dev dependencies `jest`, `msw`, `mock-component`,
`playwright-core`, `cra-template`.

### Tooling notes

- Interactive shells on this workstation shadow `node`/`npx` with a broken nvm shim; use
  `/opt/homebrew/bin/npx` or put `/opt/homebrew/bin` first on `PATH`.
- Backend needs `SECRET_KEY` in the environment (settings refuse to boot otherwise).
- `run_tests.sh` only ran three frontend suites before this pass.

## Phase log

| Phase | Result |
| --- | --- |
| 0 Baseline | recorded above |
| 1 Safety net | Vacuous tests removed (see "Test quality"); characterization tests for the timing engine, the three schedulers, keyboard/tap tempo, services, App/AdvancedMetronome |
| 2 Coverage | backend 100 % lines and branches; frontend 98.9 % lines / 95.7 % branches (gates in `frontend/package.json` and `.github/workflows/ci.yml`) |
| 3 Static quality | ruff, mypy (django-stubs), bandit, ESLint with `eslint-plugin-security`, all at zero findings; dependency audits clean for shipped code |
| 4 Refactoring | 34 unreachable files and 12 test-only files removed, keyboard handler, training boundary, sound loading, accessibility utilities and sequence audio hook restructured; ESLint `complexity` ratchet at 22 (was 67) |
| 5 Docs and DX | `docs/ARCHITECTURE.md`, `CONTRIBUTING.md`, README test section, corrected backend README, `run_tests.sh` as single entry point, PR workflow |

## Metrics before -> after

| Metric | Before | After |
| --- | --- | --- |
| Backend tests | 17 | 89 |
| Backend coverage (lines + branches) | 55 % | 100 % |
| Frontend tests | 262 in 37 suites (many vacuous) | 1720 in 75 suites |
| Frontend lines / branches / functions | 26.7 % / 21.2 % / 27.0 % (tests counted in the denominator) | 98.9 % / 95.7 % / 98.7 % (tests excluded) |
| ruff | 48 findings (global user config) | 0 with the project rule set (`E F W I B UP C4 C90 SIM S RUF BLE`) |
| mypy | not configured | 0 errors in 32 files |
| bandit | 0 | 0 (tests excluded, see `backend/pyproject.toml`) |
| ESLint | 88 errors, 38 warnings | 0 errors, 0 warnings (`--max-warnings 0`) |
| Max cyclomatic complexity | 67 | 22 |
| pip-audit | clean | clean |
| `npm audit --omit=dev` | 2 critical (Capacitor) | 0 |
| Mutation score | n/a | backend `views.py`/`models.py` 79 % (135/171 killed, rest equivalent), frontend timing/layout modules 89.1 % (was 83.7 % before the mutation round) |

### Mutation testing notes

* Backend: `mutmut run` (needs `pytest`, `pytest-django`, see `backend/pyproject.toml`). Surviving mutants are
  HTTP-header case changes and logging arguments (equivalent). Real findings led to removing three redundant
  pieces of code.
* Frontend: `npm install --no-save @stryker-mutator/core @stryker-mutator/jest-runner && npx stryker run`
  (config in `frontend/stryker.config.json`, about 10 minutes). Survivors are mostly `console.log` text,
  unreachable guards after the debounce, and boundaries of floating-point comparisons that cannot be hit exactly.

## Test quality

Removed because they asserted nothing or tested copies of the code: `SupportFeature`, `BeatIndicator`,
`MetronomeContinuityTest`, `MetronomeSoundTester`, `ContinuityTest`, `SoundLoadingTest`, `tapTempo`
(`expect(true)` / placeholder), `ComponentColorScheme`, the style-observer helpers, three suites that ran a full
`npm run build` inside Jest and swallowed failures (`build-warnings`, `clean-build`, `hooks-linting`), and the
`EditableSliders` suite that mocked every mode. `ColorScheme.test.js` used to print a warning and pass; it now fails
when a stylesheet hard-codes a colour. `KeyboardShortcutsComprehensive` and `useKeyboardShortcuts` were merged.

## Coverage exceptions (below 90 % lines / 85 % branches)

| File | Value | Reason |
| --- | --- | --- |
| `PolyrhythmMode/DirectBeatIndicator.js` | 76.9 % branches | remaining branches are null-ref guards and cleanup paths that cannot run because the preceding effect cleanup already cleared the refs |
| `hooks/useWindowDimensions.js` | 83.3 % branches | the `typeof window === 'undefined'` branch inside an effect cannot execute in jsdom |
| `utils/tapTempoFallback.js` | 94 % lines | a "no valid intervals" guard that the debounce makes unreachable |
| unreachable lines elsewhere | see agent notes below | each is a defensive guard whose precondition is established earlier in the same function |

Backend exceptions: none (100 %). `libremetronome_backend/dev_settings.py` and migrations are excluded from coverage
(configuration data, generated code); `dev_settings` is still imported and asserted by a test.

## Findings kept as characterization (not fixed, behaviour unchanged)

These are real defects or oddities that the new tests pin on purpose; fixing them changes behaviour and needs a
decision.

1. `PolyrhythmMode/usePolyrhythmLogic.js:~714` - after a tempo change measure starts are re-based on the original start
   time, so the next downbeat comes early (120 -> 132 BPM, 2 beats: 0.818 s instead of 0.909 s).
2. `hooks/useMetronomeLogic/index.js:~169-194` - second auto speed-up path next to `trainingLogic.handleMeasureBoundary`
   with different cap (240 vs 180) and unrounded tempo; it fires every scheduler tick while the measure counter sits on a
   multiple.
3. `trainingLogic.js` - `muteProbability || 0.3` turns a 0 % setting into 30 %; the manual acceleration lowers tempos above
   180 BPM to 180.
4. `withTrainingContainer.js` - with both macro and speed training active every measure is counted twice; the measure
   effect also counts a measure on mount and on every dependency change.
5. `tapTempo.js` / `App` fallback / `useKeyboardShortcuts` fallback - three tap-tempo implementations with different
   constants (100 vs 200 ms minimum interval); every fallback key tap emits `metronome-set-tempo` twice.
6. `audioBuffers.js:~67` - the `catch` fallback uses the global `AudioContext` even when `webkitAudioContext` was chosen.
7. `AdvancedMetronome.js:~361` - cleanup compares `window.handleGlobalPlayPause` with a different function, so a stale
   handler stays on `window` after unmount. `App.js` passes an unused `togglePlay` prop.
8. `App.js` fallback tap handler throws for a `metronome-tap-tempo` event without `detail`.
9. `MultiCircleMetronome.js` - a 500 ms interval overwrites the parent's training refs with local copies; `updateAccent`
   ignores its circle index; `handlePlayPause` silently does nothing when `safelyInitAudioContext` is missing.
10. `GridModeMetronome.js` - `updateAccents` is called inside a state updater (double call under StrictMode); two rAF
    loops overlap.
11. `AccessibilityMenu`/`AccessibilitySettings` - Escape reaches `onClose` twice; `AccessibilitySettings` needs
    `matchMedia` (unguarded).
12. `libremetronome_backend`: `STRIPE_PAYMENT_LINK` is not defined in `settings.py` (it comes from the untracked
    `local_settings.py`); `check_sounds` looks for default sounds in `BASE_DIR/frontend/...` but `BASE_DIR` is `backend/`.
13. Small display bugs: `aria-label` reads "undefined" for accent values outside 0..3 in `BeatStaff`, `BeatVisualizer`,
    `CircleRenderer`; `tempoWord(NaN)` returns "Prestissimo".

## Blocked / Open

* **Development-toolchain vulnerabilities**: `npm audit` (all dependencies) reports 79 findings (6 critical) that all come
  from `react-scripts` 5 (Create React App, unmaintained) and its webpack/jest/postcss tree. Nothing of it ships in the
  bundle (`npm audit --omit=dev`: 0). Fixing it means moving off CRA (e.g. Vite); that is a product/infra decision.
* **Native apps not rebuilt**: Capacitor 8.4.2 -> 8.4.3 (security advisory) was applied in `package.json`/lock, but the iOS,
  Android, macOS and Electron shells were not rebuilt or smoke-tested in this pass.
* **`backup/`** (253 files, an old `src` copy from the accessibility branch) was removed on request after confirming that nothing referenced it; it stays in git history. **`test-webhook.txt`** is the deploy-webhook trigger noted in `docs/app-release.md`; kept.
* **Orphaned stylesheets** left from the removed components (`InfoSection.css`, `FeedbackOverlay.css`,
  `TrainingOverlay.css`, `ModalContainer.css`) and CSS of deleted components: design material, owner decision.
* **Debug logging**: production code still contains many `console.log` calls; `index.js` silences the console outside
  development. Replacing them with a logger is a separate clean-up.
* **Deploy**: pushing this branch does not touch `main`; merging does (auto-deploy). Native version numbers were not changed.

## Tooling notes

* Interactive shells on this workstation shadow `node`/`npx` with a broken nvm shim; use
  `/opt/homebrew/bin/npx` or put `/opt/homebrew/bin` first on `PATH`.
* Backend needs `SECRET_KEY` in the environment (settings refuse to boot otherwise); `run_tests.sh` sets a throw-away value.
