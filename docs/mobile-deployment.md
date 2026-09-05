# Mobile Deployment

## Current Status — September 5, 2026

Web and Capacitor iPad builds share the React application in `frontend/`.
The latest signed Debug build was installed and launched on the connected
13-inch iPad Air (M2). It includes the white interface, shared landscape slider
positions, smaller Beat visualization, ordered Sequence playback, bold selected
bar numbers, and Tap Tempo registration on pointer contact.

The matching production web build succeeds locally. It has not been deployed
to libremetronome.com. Server deployment belongs in an AlmaLinux Codex session;
see [the release plan](release-plan.md).

Android and simulator builds were verified in earlier work, but were not
rebuilt during the latest iPad layout changes.

## Provisioning and Distribution

The app currently uses free Personal Team provisioning for development-device
installation. The user confirmed that Apple Developer Program enrollment is
not yet active. TestFlight and App Store distribution remain pending.

Development profiles expire; rebuild and reinstall when necessary. Successful
installation on the development iPad does not establish distribution readiness.
A free public app is under consideration, and pricing is not finalized.
Keep account credentials, signing keys and provisioning profiles out of Git.

## Signing Incident

On September 5, code signing failed with `errSecInternalComponent` in both
Xcode and command-line builds. The certificate appeared valid and the login
keychain reported itself unlocked, but securityd logged
`CSSMERR_CSP_INVALID_DATA` while decoding keychain data. An independent signing
probe failed as well, isolating the issue from application code.

An encrypted local keychain backup was preserved. After the user restarted the
Mac and signed in again, the same build succeeded, followed by successful iPad
installation and launch. No certificate replacement or keychain reset was
needed. This is the observed resolution of this incident, not a universal fix
for every signing error.

## Verification Scope

Recent targeted checks passed:

- Sequence scheduling and lifecycle, collection, beat mode, precision, audio
  unlock and polyrhythm lifecycle: 7 suites, 28 tests at that change stage.
- Tap feedback and Swing visibility: 3 suites, 6 tests at that change stage.
- Latest layout stage: collection, beat mode and Swing visibility, 3 suites,
  8 tests; production web build and signed iPad Debug build successful.

These are separate targeted runs, not a current full-suite total. Browser
inspection verified matching landscape slider coordinates and the smaller
Beat layout. The latest device install and process launch were confirmed;
this does not constitute an external measurement of audible timing.

Audio scheduling remains on the Web Audio clock. Every mode reuses the shared
unlocked context. Sequence schedules complete bars before advancing. Tap Tempo
responds on contact rather than release, but its confirmation sound still
passes through the selected output route. Bluetooth latency remains possible;
no zero-latency Bluetooth feedback is claimed.

External microphone or wired loopback measurements are still needed to quantify
speaker/output timing on a particular device and route.

## Build and Sync

From the repository root:

```bash
cd frontend
npm install
npm run mobile:sync
```

## iOS

Open the generated Xcode project:

```bash
cd frontend
npm run ios:open
```

Select the free Apple Personal Team, choose the connected iPad, and run the
`App` scheme. Xcode will create a new development provisioning profile when a
free provisioning slot is available.

Do not store Apple account credentials, team identifiers, device identifiers,
or provisioning profiles in the repository.

## Android

Build the debug APK with JDK 21:

```bash
cd frontend
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
cd android
./gradlew assembleDebug
```

The APK is written to:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

Before release distribution, replace debug signing with a protected release
keystore and document the release process separately.
