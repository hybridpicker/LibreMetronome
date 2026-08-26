# Mobile Deployment

## Current Status

LibreMetronome has Capacitor 8 projects for iOS and Android. Both native apps
share the React application and Web Audio implementation in `frontend/`.

- The web application and automated tests pass locally.
- The iOS app builds for simulator and physical devices.
- The Android debug app builds with JDK 21.
- Louder normalized click samples are included in the mobile and web bundles.
- The iOS app configures a playback audio session and a low-latency I/O buffer.
- The default clicks are onset-trimmed, mono 48 kHz PCM WAV files, avoiding MP3
  decoder delay in the timing-critical fallback path.
- Every mode reuses the same user-unlocked AudioContext on iOS, including
  recovery from WebKit's interrupted state. A deterministic procedural click
  remains available if a bundled or custom sample cannot be decoded.
- Audio is scheduled 100 ms ahead on the Web Audio clock; display events are
  deferred to the audible output time instead of firing when JavaScript merely
  queues the beat.
- The iPad landscape layout keeps the visualization, transport, tap tempo, and
  primary controls on one performance surface.
- The native iOS asset catalog contains a dedicated opaque 1024 px
  LibreMetronome icon designed for iOS masking.
- On August 26, 2026, the signed Debug build was installed and launched on the
  connected 13-inch iPad Air (iPadOS 26.6). The running device UI was captured
  through Xcode and visually verified.

## iPad Installation

The July 31, 2026 installation blocker is resolved. The previously protected
Wedding controller is no longer installed, and the Personal Team now has a
free-provisioning slot for LibreMetronome. Home Media and Nex Note were left
installed.

The app uses free provisioning for direct development-device installation.
These profiles expire regularly and do not provide TestFlight or App Store
distribution, so rebuild and reinstall the app when the development profile
expires. No Apple account, team identifier, device identifier, certificate, or
provisioning profile is stored in this repository.

## Timing Verification Scope

Automated tests verify audio-clock scheduling, output-latency-compensated UI
delivery, cancellation of queued display beats, and audio-timeline BPM
measurement. The full React suite currently contains 165 passing tests. The
production web build and signed arm64 device build both complete successfully
without warnings.

This verifies deterministic scheduling in software. It does not replace an
external microphone or wired loopback measurement of the iPad speaker/output,
which is required to quantify the final digital-to-analog and transducer
latency of a particular hardware route.

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
