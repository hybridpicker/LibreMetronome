# Play Console: release checklist for LibreMetronome

State on 2026-10-25. App created, internal test published with versionCode 8. Everything below the "done" list is open. The owner makes the declarations (see listing-en.md).

## Done in the console (draft, nothing submitted for review)

- Default store listing en-US saved as draft: name, short description, full description (the unverified "keeps playing with the screen off" line was left out), app icon, feature graphic, 5 phone screenshots, 2 screenshots each for 7" and 10" tablets.

## Closed test track (state 2026-11-05)

- Track "Geschlossener Test - Alpha" has a **draft** release with the library bundle versionCode 8 (0.8.0) and en-US release notes. Nothing sent to Google for review.
- Still open on the track: countries/regions (none set), testers (list of at least 12 Google accounts, owner enters the addresses), then "Release zur Überprüfung an Google senden". Testers must stay opted in for 14 days.
- Dashboard "App content" tasks are still open (privacy policy, content rating, target audience, data safety, price/merchant account). The owner makes these declarations.
- Repo HEAD is newer than the 0.8.0 bundle (e.g. the web click-loudness change). Built 2026-11-06: `buildNumber` 9 (versionName 0.8.0), signed AAB `frontend/android/app/build/outputs/bundle/release/app-release.aab` (3,949,388 bytes, jarsigner verified, upload-key SHA-256 `71:0C:AA:D6:…:6B:E6:67` as before). APK of the same run: versionCode 9, no INTERNET permission. 76 suites / 1730 tests green. **Not uploaded**: the owner uploads it and swaps it into the draft release (replaces versionCode 8). Not tested on a device.

## Blocks the production release

- Personal developer account: a **closed test with at least 12 testers** is required before production access can be requested (dashboard: "Mindestens 12 Tester ... Momentan sind 0 Tester angemeldet"). Plan: release the same AAB to a closed test, invite 12 testers by e-mail list, keep them opted in for the period the console states (14 days at the time of writing), then apply for production access and answer the console's questions.

## App content (owner declares; suggested answers from the build)

| Task | Suggested answer | Basis |
|---|---|---|
| Privacy policy | https://libremetronome.com/privacy | **Check first:** the URL answers 200 but looked like the site's start page, not a policy. Publish docs/store/privacy-policy.md there (server task) before entering it |
| Ads | No ads | no ad SDK |
| App access | No login needed | no accounts |
| Content rating (IARC) | Utility/music tool, no user content, no web access | answer the questionnaire honestly |
| Target audience | owner decides (13+ or not directed at children) | |
| Data safety | No data collected, none shared | APK has no INTERNET permission |
| Government, financial, health apps | none | |
| News app | no | |

## Organisation and presentation

- Category: Music & Audio. Contact details and support e-mail: owner (personal data, not entered).
- Price: paid, EUR 1.99, all countries. **A paid app cannot be switched to free later**, so this stays an owner decision; not set.

## Before publishing

- Check the description claims against the build (training options, keyboard shortcuts, labels).
- Install the Play build on the Samsung and check all five modes (see docs/app-release.md, section 17).
