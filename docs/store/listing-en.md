# Google Play listing (English, worldwide) — DRAFT

Store language: English only (owner decision 2026-10-24). Price: EUR 1.99 incl. VAT, set in Play Console; other countries are derived by Play. Category: Music & Audio. Developer name shown by Play: "Schoensgibl.com".

## App name (max 30)

```
LibreMetronome
```
(14 characters)

## Short description (max 80)

```
Ad-free metronome. No account, works offline, open source. Pay once, no extras.
```
(79 characters; re-count before pasting)

## Full description (max 4000)

```
LibreMetronome is a precise, distraction-free metronome for practice and teaching. Pay once, keep everything: no ads, no subscriptions, no in-app purchases, no account, no tracking. It works fully offline and never connects to the internet.

WHAT YOU GET FOR EUR 1.99
• Every mode and every feature in the app, unlocked from the first launch
• The bundled "Classic" click sound
• No ads, no upsells, no locked content, no later paywall
• Free updates and bug fixes

FIVE WAYS TO SEE AND FEEL THE BEAT
• Beat mode: clear beat display with tempo, time signature and subdivisions
• Analog mode: a pendulum metronome on screen
• Grid mode: shape rhythms on a grid and hear them looped
• Sequencer mode: program your own pattern step by step
• Polyrhythm mode: layer several cycles, for example 3 against 4

BUILT FOR REAL PRACTICE
• Tempo, volume, time signature and subdivisions with accented first beat
• Training options to build speed gradually
• Keyboard shortcuts when a keyboard is connected
• Keeps playing when the screen is off (see note below)

ACCESSIBLE
• High-contrast and large-text options
• Color-blind-friendly display options
• Clear, large controls

PRIVATE BY DESIGN
LibreMetronome has no internet permission. It collects no data, shares nothing and needs no account. Your settings (tempo, volume, display options) stay on your device only.

OPEN SOURCE
The complete source code is public under the GNU GPL v3: https://github.com/hybridpicker/LibreMetronome
You are free to read, build and modify it. Buying the app supports its development.

A note on refunds: Google Play refunds paid apps on request within 2 hours of purchase.

Questions or bug reports: see the support link on this page.
```

Before publishing, check every claim against the final build. Open points:
- "Keeps playing when the screen is off" — keep only if the emulator and phone tests confirm it (see docs/app-release.md section 12).
- Mode names and training options must match the in-app labels.
- "The bundled Classic click sound": the app currently ships one sound set. Do not promise "all sounds" until more are bundled.

## Graphics checklist (owner uploads in the browser)

| Asset | Size | Status |
|---|---|---|
| Icon | 512 x 512 PNG, 32 bit | open |
| Feature graphic | 1024 x 500 PNG/JPEG, no alpha | open |
| Phone screenshots | min. 4, 1080 x 1920 or larger, from the Android emulator, invented example values only | open |
| Modes to show | Beat, Analog, Grid, Sequencer, Polyrhythm | open |

## Forms (declarations are made by the owner)

| Form | Expected answer | Basis |
|---|---|---|
| Price | Paid, EUR 1.99, all countries | owner decision 2026-10-24 |
| Ads | No ads | no ad SDK in the build |
| Data safety | No data collected, none shared; no encryption claim needed | no network permission, no analytics |
| Content rating (IARC) | Expected lowest level (no user content, no web access) | to be answered by the owner |
| Target audience | 13+ or "all ages, not directed at children", owner decides | owner |
| App access | No login needed | no accounts |
| Government/financial/health apps | None | n/a |
| Foreground service declaration | Only if the background-audio test requires it (see release doc) | measurement open |
| Privacy policy URL | https://libremetronome.com/privacy | draft in privacy-policy.md, publishing is a server task |
