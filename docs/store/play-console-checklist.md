# Play Console: release checklist for LibreMetronome

State on 2026-10-25. App created, internal test published with versionCode 8. Everything below the "done" list is open. The owner makes the declarations (see listing-en.md).

## Done in the console (draft, nothing submitted for review)

- Default store listing en-US saved as draft: name, short description, full description (the unverified "keeps playing with the screen off" line was left out), app icon, feature graphic, 5 phone screenshots, 2 screenshots each for 7" and 10" tablets.

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
