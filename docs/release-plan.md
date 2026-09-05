# Web and App Store Release

Updated September 5, 2026.

## Release status

| Target | Verified state | Next step |
| --- | --- | --- |
| iPad development app | Signed Debug build installed and launched | Continue device validation |
| Public website | Local production build passes; live site unchanged by this work | Transfer reviewed changes and deploy from AlmaLinux |
| TestFlight / App Store | No paid developer membership confirmed; no upload performed | Complete enrollment, then prepare distribution build and metadata |

## Product direction

Maintain one React codebase for libremetronome.com and the Capacitor iPad app.
Prioritize accurate interaction, stable audio scheduling, a white interface,
and consistent controls. A free App Store release is under consideration;
pricing has not been finalized.

## Prepared changes

- Consistent landscape slider positions across modes.
- Smaller Beat visualization and more transport spacing.
- Sequence playback advances through complete bars in order.
- Sequence supports additional bars with shared add/remove controls.
- Selected bar numbers are bold without playback dots or underlines.
- Tap Tempo registers on pointer contact instead of release.
- Swing controls remain accessible for odd bar lengths.

The production web build has passed locally with
`REACT_APP_BACKEND_URL=https://libremetronome.com npm --prefix frontend run build`.
Deploy the reviewed release commit from `main`, and verify its identity on the
server before building. The website has not been deployed in this task.

## Web deployment handoff

Perform server inspection and deployment inside the AlmaLinux Codex workspace.
Verify `hostname` and `pwd` first; confirm the intended server and project
checkout. Keep account names and private server paths in local operator notes.
Identify the existing checkout, deployment branch, services, static asset
location and release procedure before changing the live installation.

Review and transfer the intended local changes through the project's existing
Git workflow. Preserve unrelated server changes. Keep the previous release
available for rollback. Deploy the frontend through the existing procedure;
no database migration is required by the UI changes listed above.

Verify the public site after deployment: asset loading, audio initialization,
all five modes, sequence order, Tap Tempo, Swing visibility, responsive layout,
keyboard access and touch targets. Confirm that updated asset hashes are live.

## App Store preparation

1. The user confirmed that only free device provisioning is currently available.
   Apple Developer Program enrollment and a distribution team are required
   before App Store or TestFlight upload. Enrollment is not yet completed.
2. Review the app name, bundle identifier, version, supported devices and
   distribution signing before creating the App Store Connect record.
3. Audit the release build, bundled assets and dependency licenses. The project
   declares GPL v3; confirm distribution rights and obligations before submission.
4. Prepare accurate privacy disclosures, a public privacy policy and support URL
   based on actual network requests and data handling.
5. Prepare iPad screenshots, description, keywords, age rating and review notes.
6. Archive and validate a Release build, upload it to App Store Connect, and
   verify processing before TestFlight testing.
7. Confirm pricing and distribution regions before submitting for App Review.
   Use manual release so approval does not immediately publish the app.

Do not treat successful development-device installation as App Store approval.
Do not purchase membership, accept legal agreements or submit unverified privacy
answers on the user's behalf.

## Official references

- https://developer.apple.com/support/compare-memberships/
- https://developer.apple.com/help/app-store-connect/
- https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app
