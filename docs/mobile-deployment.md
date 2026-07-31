# Mobile Deployment

## Current Status

LibreMetronome has Capacitor 8 projects for iOS and Android. Both native apps
share the React application and Web Audio implementation in `frontend/`.

- The web application and automated tests pass locally.
- The iOS app builds for simulator and physical devices.
- The Android debug app builds with JDK 21.
- Louder normalized click samples are included in the mobile and web bundles.
- The iOS app configures a playback audio session and a low-latency I/O buffer.

## iPad Installation Plan

Decision recorded on July 31, 2026:

- Do not renew the paid Apple Developer Program membership.
- Do not remove any existing app from the iPad before August 9, 2026.
- Keep the Wedding controller installed through August 9, 2026.
- On or after August 9, remove the Wedding controller when it is no longer
  needed, then rebuild and install LibreMetronome with the free Apple Personal
  Team.
- Do not remove Home Media or Nex Note as part of this installation.

The installation remains pending because the connected iPad already has the
maximum number of apps signed with free provisioning. The expired paid
developer team cannot create new signing profiles unless its membership is
renewed.

Deleting an unrelated App Store Connect record does not free a Personal Team
device-installation slot. A removal attempt for the legacy FretMap record was
blocked by Apple because the paid developer membership is expired. FretMap is
already unavailable for download while the membership remains expired, but its
record remains visible in App Store Connect. No paid renewal is planned.

Free provisioning is suitable for direct development-device installation, but
its profiles expire regularly and it does not provide TestFlight or App Store
distribution. Rebuild and reinstall the app when the development profile
expires.

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
