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

## Blocked / Open

(none yet)
