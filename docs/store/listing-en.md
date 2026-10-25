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

FIVE MODES
• Beat mode: quarter notes on a staff, with tempo, beats per bar and note value
• Analog mode: a pendulum metronome on screen
• Grid mode: shape rhythms on a grid and hear them looped
• Sequence mode: chain several bars with their own beats per bar, one after another
• Polyrhythm mode: layer several cycles, for example 3 against 4

BUILT FOR REAL PRACTICE
• Tempo, volume, beats per bar, note value and swing
• Tap any beat to silence or accent it; Tap Tempo to find a tempo
• Training options to build speed gradually
• Keyboard shortcuts when a keyboard is connected

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
- "Keeps playing when the screen is off" was removed from the description because it is not verified; add it back only after the emulator and phone tests confirm it (see docs/app-release.md section 12).
- Mode names and training options must match the in-app labels.
- "The bundled Classic click sound": the app currently ships one sound set. Do not promise "all sounds" until more are bundled.

## Graphics checklist (owner uploads in the browser)

| Asset | Size | Status |
|---|---|---|
| Icon | 512 x 512 PNG, 32 bit | created: docs/store/icon-512.png (pendulum, no alpha); check in Console |
| Feature graphic | 1024 x 500 PNG/JPEG, no alpha | created: docs/store/feature-graphic-1024x500.png (white, icon, name, no shadows) |
| Phone screenshots | min. 4, 1080 x 1920 or larger, invented example values only | created: docs/store/screenshots/phone-1..5 (1236 x 2415, app UI of the store build rendered in Chrome at 412 x 805 @3x; no emulator or device frame) |
| Tablet screenshots | min. 2 | created: docs/store/screenshots/tablet-1-beat.png, tablet-2-sequence.png (1536 x 2730, 9:16; Play rejects other ratios for tablets) |
| Modes to show | Beat, Analog, Grid, Sequencer, Polyrhythm | all five in the phone set |

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
