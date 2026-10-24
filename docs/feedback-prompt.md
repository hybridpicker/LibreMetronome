# Prompt: Tester-Feedback einsammeln und eine bessere Version bauen

Zum Kopieren in eine neue Claude-Code-Sitzung in `~/Coding/LibreMetronome`. Das Feedback fügst du unten zwischen die Markierungen ein.

---

```
Auftrag: LibreMetronome (bezahlte, werbefreie Android-App, Kennung com.libremetronome) auf Basis von Tester-Feedback verbessern.

Lies zuerst docs/app-release.md (Abschnitte 12 und 13) und docs/store/listing-en.md. Arbeite auf main, Branch-Modell des Repos respektieren, keine zusätzlichen Branches oder Worktrees. Code, Kommentare, Commits auf Englisch, mit mir auf Deutsch.

## Datenschutz (gilt vor allem)
- Das Feedback unten darf Namen, E-Mail-Adressen oder Gerätedaten enthalten. Verarbeite nur, was für die Verbesserung nötig ist. Gib keine Adressen oder Namen in Commits, Doku oder Berichten wieder. Fasse Personen als "Tester A, B, C" zusammen.
- Keine Schlüssel, Passwörter oder key.properties anzeigen oder committen. Upload-Schlüssel liegt in ~/libremetronome-release/, Zugriff nur über die Umgebungsvariable LIBREMETRONOME_KEY_PROPERTIES.
- Die App darf keine Netzanfragen, keine Werbung, keine Analyse und keine Konten bekommen. Das ist Teil des Verkaufsversprechens. Verbesserungen, die das brauchen, nicht umsetzen, sondern mir als Entscheidung vorlegen.

## Schritt 1: Feedback sammeln und ordnen
Feedback (Rohtext, Nachrichten, Screenshots-Beschreibungen):

<<<FEEDBACK_ANFANG
[hier einfügen]
FEEDBACK_ENDE>>>

1. Lege eine Tabelle an: Nr., Beobachtung, Gerät/Android-Version (falls genannt), Anzahl Tester, Art (Fehler / Bedienung / Wunsch / Lob), Schweregrad (blockiert Nutzung / stört / klein).
2. Gleiche Meldungen zusammenführen. Trenne Beobachtung (was passiert ist) von Deutung (was der Tester vermutet).
3. Schätze für Fehler ab, ob sie sich im Quelltext oder im Emulator reproduzieren lassen. Schreibe "nicht reproduziert", wenn es nicht gelang. Nichts als behoben melden, was du nicht gemessen oder getestet hast.
4. Besonders prüfen: Taktstabilität, Klick-Latenz, Verhalten bei ausgeschaltetem Bildschirm oder App im Hintergrund (Android pausiert WebView-Audio oft), Abstürze, Beschreibung und Store-Text passen zum Verhalten.

## Schritt 2: Vorschlag, dann meine Freigabe
Zeige mir die geordnete Tabelle und eine priorisierte Liste (max. 10 Punkte) mit je: Ursache, geplanter Änderung, Aufwand, Risiko. Warte auf mein "go" für die Umsetzung. Entscheidungen, die mir gehören (Preis, Länder, Händlerstatus, neue Berechtigungen, Vordergrunddienst, Store-Erklärungen), nur als Frage stellen.

## Schritt 3: Umsetzen (nach "go")
- Kleine, getrennte Commits je Verbesserung. Tests (CI=true npm test), Frontend-Build und ./gradlew bundleRelease müssen grün sein.
- Neue Version: buildNumber in frontend/package.json um 1 erhöhen (Play lehnt benutzte Codes ab; vorher im Bundle Explorer der Play Console den höchsten Code prüfen), version nach Bedeutung anheben.
- Wenn eine Änderung eine Berechtigung oder einen Vordergrunddienst braucht: stoppen und mich fragen, weil dann Play-Formulare und docs/store/privacy-policy.md angepasst werden müssen.
- Web-Version nicht verschlechtern (IS_NATIVE_APP-Schalter in frontend/src/nativeApp.js beachten).
- Node/npm laufen in dieser Umgebung nur so: bash --noprofile --norc -c 'export PATH=$HOME/.nvm/versions/node/v24.15.0/bin:/usr/bin:/bin:$PATH; npm …'. Gradle mit JDK 21 (~/Library/Java/JavaVirtualMachines/jbr-21.0.11), nicht dem JDK 25 von Android Studio.

## Schritt 4: Neue AAB bereitstellen
1. Signierte AAB bauen (nur aus sauberem, committetem Stand).
2. Prüfen: Größe, jarsigner -verify, Berechtigungen der APK (aapt dump permissions: kein INTERNET), Start im Emulator. Sage klar, was du nicht prüfen konntest (echtes Gerät, Hintergrund-Audio).
3. Zeige mir die Datei mit open -R. Den Upload mache ich selbst.
4. Aktualisiere docs/app-release.md (neuer Abschnitt mit Datum: Feedback-Auswertung ohne personenbezogene Daten, Änderungen, Nachweise, offene Punkte) und docs/store/listing-en.md, falls sich Aussagen ändern. Committe lokal. Nichts pushen ohne mein "push".

## Bericht am Ende
Was geändert ist (mit Nachweis), was nicht geprüft werden konnte, was ich noch tun muss, und welche Tester-Rückmeldungen offen bleiben.
```
