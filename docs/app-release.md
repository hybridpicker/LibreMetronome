# LibreMetronome als App in Google Play und im App Store

Stand: 2026-10-24. **Anleitung für den Eigentümer.** Entscheidung vom 2026-10-24: LibreMetronome wird eine **bezahlte App (1,99 € inkl. MwSt.), werbefrei, ohne Konto, offline**, Android zuerst, iOS danach. Der Code bleibt GPL v3. Technische Vorbereitung für den Android-Test ist im Repo erledigt (Abschnitt 12). In Play ist **noch keine App angelegt, keine Kennung belegt, nichts hochgeladen**. Ältere Notizen: [mobile-deployment.md](mobile-deployment.md) (Entwicklungs-Build am iPad), [release-plan.md](release-plan.md) (Web und App Store, Stand 2026-09-05).

**Keine Rechtsberatung.** Store-Regeln stehen unten mit Quelle und Lesedatum (Abschnitt 11). Was daraus rechtlich folgt (GPL, Verbraucherrecht, DSGVO), ist nicht geprüft.

## 0. Kurzfassung

| Frage | Empfehlung |
|---|---|
| Preis | **Bezahlt, 1,99 € inkl. MwSt., weltweit**, keine In-App-Käufe, keine Werbung. Wird beim Anlegen der App festgelegt: kostenlos lässt sich nie in bezahlt ändern, bezahlt in kostenlos schon (Play-Hilfe gelesen am 2026-10-24, Abschnitt 13.1). |
| Weg | **Capacitor 8** weiterführen (schon eingebaut: `frontend/ios`, `frontend/android`, `capacitor.config.ts`). Die React-App wird mit allen Klängen in die App gepackt und läuft **ohne Server**. |
| Konten | Die schon vorhandenen Konten des Eigentümers: Google Play „Schoensgibl.com“ (privat, verifiziert) und Apple-Einzelmitgliedschaft (Aktivierung ausstehend). Keine neuen Konten. |
| App-Kennung | **`com.libremetronome`** (Entscheidung 2026-10-24, im Code umgestellt). Unumkehrbar ab dem ersten Upload; vor „App anlegen“ nochmals bestätigen (Abschnitt 3). |
| Name im Store | „LibreMetronome“, Store-Sprache **nur Englisch** (Entwurf: [store/listing-en.md](store/listing-en.md)) |
| Daten | Keine Konten, keine Analyse, keine Werbung, kein Server nötig: Ziel „Keine Daten erhoben“ in beiden Stores |
| Spenden-Knopf | im App-Build **ausgeblendet** (Abschnitt 6), im Web unverändert |
| Testphase | Play: interner Test → geschlossener Test mit mind. 12 Personen über 14 Tage → Produktion. Apple: TestFlight → App-Prüfung |
| Kosten | Play-Provision auf den Preis, Abschnitt 9 |

## 1. Warum Capacitor (und nicht TWA, Flutter oder nativ)

Bestand im Repo:

- Frontend: React 18 (Create React App), Web Audio API für die Klicks, Einstellungen im `localStorage`.
- Backend: Django + DRF, liefert Klangsätze (`/api/sound-sets/`), Klangdateien und die Spenden-Info (`/api/support-info/`). Für die Grundfunktion nicht nötig: das Frontend fällt auf die mitgelieferten Klänge unter `public/assets/audio/` zurück.
- Mobil: Capacitor 8.4 mit `@capacitor/app` und `@capacitor/status-bar`, iOS-Projekt (iOS 15+, iPhone und iPad), Android-Projekt (minSdk 24, targetSdk 36). Ein signierter Debug-Build lief am 2026-09-05 auf einem iPad (Personal Team); Android-Debug-APK wurde früher gebaut.
- Daneben: Desktop-Hülle (`desktop/`, Electron) und `macos/`; nicht Teil dieses Dokuments.
- Lizenz: **GPL v3** (`LICENSE`).

| Weg | Passt? | Begründung |
|---|---|---|
| **Capacitor** | **ja, empfohlen** | schon eingerichtet, eine Codebasis für Web, iOS und Android, Klänge offline in der App, Web Audio läuft in WKWebView und Android WebView |
| Trusted Web Activity (TWA) | nur Android | lädt die Webseite live, braucht Netz und Server; auf iOS gibt es nichts Vergleichbares; der Mehrwert gegenüber der Webseite wäre klein |
| Flutter mit WebView | nein | zweiter Werkzeugstapel ohne Gewinn; die App wäre trotzdem die React-Seite |
| Nativ (Swift/Kotlin) | nein | die Taktlogik müsste zweimal neu geschrieben werden; für eine Person nicht wartbar |

Apple-Richtlinie 4.2 verlangt mehr als eine „verpackte Webseite“ (11.1). Für LibreMetronome spricht: die App läuft vollständig offline, hat eigene Bedienung und spielt im Hintergrund weiter (Audio-Hintergrundmodus). Kein `server.url` in der Produktions-Konfiguration.

## 2. Technische Arbeiten vor dem ersten Store-Build (eigene Aufträge)

Befunde aus dem Code, Stand 2026-10-22. **Erledigt am 2026-10-24 (Android, lokal gebaut, noch nicht committed gepusht):** Punkte 1, 2, 3, 4 (Android), 5; Details und Nachweise in Abschnitt 12. Offen: 6 bis 9.

1. **Klänge und API ohne Server:** `config.js`, `audioBuffers.js` und `soundSetService.js` nehmen `REACT_APP_BACKEND_URL`, sonst `http://localhost:8000` bzw. in Produktion `window.location.origin`. In der App ist der Ursprung `capacitor://localhost` (iOS) bzw. `https://localhost` (Android), Anfragen an `/api/…` laufen ins Leere. Vorschlag: für App-Builds die Klangsätze fest mitliefern, API-Aufrufe abschalten (Build-Schalter, z. B. `REACT_APP_NATIVE=1` oder `Capacitor.isNativePlatform()`), damit die App **keine Netzanfragen** macht. Falls doch online nachgeladen werden soll: nur von `https://libremetronome.com`, und dann ändern sich die Datenschutzangaben (Abschnitt 5).
2. **Spenden ausblenden:** `SupportButton`, `SupportPage` und `supportUtils.js` (Stripe-Zahlungslink) im App-Build nicht anzeigen (Abschnitt 6).
3. **Hintergrundmodi iOS:** `Info.plist` meldet `audio` und `bluetooth-central`. `audio` ist für ein Metronom begründbar. `bluetooth-central` nutzt die App nicht (kein Bluetooth-Plugin, keine `NSBluetoothAlwaysUsageDescription`); nicht benötigte Hintergrundmodi sind ein häufiger Ablehnungsgrund (Richtlinie 2.5.4). Vorschlag: entfernen.
4. **Versionen:** Android `versionCode 1`/`versionName "1.0"` fest in `android/app/build.gradle`, iOS `MARKETING_VERSION = 1.0`, `package.json` sagt `0.6.0`. Vorschlag: eine Quelle (z. B. `package.json`), Build-Nummer wächst mit jedem Upload, gemeinsam für beide Plattformen (wie bei SPÖ Connect).
5. **Release-Signatur Android:** heute nur Debug-Signatur. Signatur aus einer `key.properties` außerhalb des Repos (Abschnitt 7), nie im Repo.
6. **Exportkontrolle iOS:** `ITSAppUsesNonExemptEncryption` fehlt in `Info.plist`, App Store Connect fragt dann bei jedem Upload. Die App verschlüsselt nichts selbst (höchstens HTTPS des Betriebssystems); nach Apples Tabelle wäre `false` passend (11.1, Einordnung ohne rechtliche Bewertung).
7. **Privacy Manifest:** prüfen, ob das App-Target ein `PrivacyInfo.xcprivacy` braucht (z. B. für `UserDefaults` über Capacitor-Plugins). Erster Upload zeigt Beanstandungen.
8. **Icons und Startbild:** `npm run assets:generate` (`@capacitor/assets`) aus einer 1024-px-Vorlage; Android-Icons sind heute die von Capacitor erzeugten.
9. **Zeitgenauigkeit:** Klick-Latenz über Bluetooth und Lautsprecher am Gerät messen (offen laut `mobile-deployment.md`). Kein Store-Thema, aber Thema für Bewertungen.

## 3. App-Kennung (unumkehrbar)

**Entschieden 2026-10-24: `com.libremetronome`.** Im Code umgestellt (`capacitor.config.ts`, Android `applicationId`/Paket, iOS-Projekt). Die Tabelle unten ist der ursprüngliche Vergleich. Die Entscheidung muss vor „App anlegen“ noch einmal ausdrücklich bestätigt werden.

Die Kennung (iOS Bundle-ID, Android `applicationId`) ist ab dem ersten Upload in App Store Connect bzw. Play Console belegt und lässt sich danach nicht mehr ändern; eine andere Kennung heißt neue App ohne Bewertungen und Nutzer.

| Option | Vorteil | Nachteil |
|---|---|---|
| **`com.hybridpicker.libremetronome`** (Vorschlag) | steht schon in `capacitor.config.ts`, Xcode- und Android-Projekt (`MainActivity` im passenden Paket), keine Codeänderung | `hybridpicker` ist ein Benutzername, keine eigene Domain |
| `com.libremetronome.app` | passt zur Domain `libremetronome.com` | Paketordner, `capacitor.config.ts`, Xcode-Projekt ändern |

Achtung: Die Bundle-ID wurde schon mit dem kostenlosen Personal Team für das iPad verwendet. Falls App Store Connect sie im bezahlten Team als „nicht verfügbar“ meldet, braucht es eine andere Kennung. **Entscheidung des Eigentümers, erst dann App anlegen.**

## 4. Store-Einträge und Assets

| | Google Play | App Store |
|---|---|---|
| Name | bis 30 Zeichen | 2 bis 30 Zeichen, dazu Untertitel bis 30 |
| Texte | Kurzbeschreibung bis 80, Beschreibung bis 4000 Zeichen | Beschreibung bis 4000 Zeichen (nur Text), Werbetext bis 170, Schlüsselwörter bis 100 Byte |
| Icon | 512 × 512 PNG (32 Bit, mit Alpha), höchstens 1 MB | 1024 × 1024 im App-Paket (aus dem Build) |
| Grafik | Feature Graphic 1024 × 500 (JPEG oder PNG ohne Alpha) | – |
| Screenshots | mind. 2, bis 8 je Gerätetyp; für Tablets mind. 4; für Empfehlungen mind. 4 mit mind. 1080 × 1920 | 1 bis 10 je Größe; iPhone mit Dynamic Island (z. B. 1206 × 2622) Pflicht, iPad 13 Zoll (z. B. 2064 × 2752) Pflicht, da die App auf dem iPad läuft; ohne Alpha |
| URLs | Datenschutzerklärung (Pflicht), Website, Kontakt-E-Mail | Datenschutz-URL (Pflicht), Support-URL (Pflicht, mit echten Kontaktdaten), Marketing-URL optional |
| Einstufung | Fragebogen zur Altersfreigabe (IARC) | Altersfreigabe-Fragebogen; erwartet: niedrigste Stufe (keine Inhalte von Nutzern, kein Webzugang) |
| Kategorie | Musik und Audio | Musik (Vorschlag), Nebenkategorie Bildung |

Vorschlag für Screenshots: Beat-, Analog-, Raster-, Sequenz- und Polyrhythmus-Modus, je einmal am Telefon und am iPad. Sprachen: Deutsch und Englisch (die App ist englisch; deutsche Store-Texte sind optional, **Entscheidung**).

Ablage für Store-Texte und Screenshots: `docs/store/` im Repo (keine Geheimnisse, keine Personendaten).

## 5. Datenschutz

**Datenschutzerklärung:** Beide Stores verlangen eine öffentlich erreichbare Datenschutz-URL, auch wenn die App nichts erhebt; Apple zusätzlich einen Link **in der App** (Richtlinie 5.1.1(i)). Heute gibt es auf `libremetronome.com` keine Datenschutzseite. Entwurf: [store/privacy-policy.md](store/privacy-policy.md); Veröffentlichung ist ein Serverauftrag. Der Link steht schon im Info-Fenster der App. Aufgabe: eine Seite anlegen (z. B. `https://libremetronome.com/privacy`) für Webseite **und** Apps, und im Info-Fenster der App verlinken. Inhalt (Vorschlag, vom Eigentümer zu prüfen): wer verantwortlich ist, dass die App keine Konten, keine Analyse und keine Werbung hat, dass Einstellungen (Tempo, Lautstärke, Barrierefreiheit) nur auf dem Gerät gespeichert werden, was der Webserver protokolliert (gilt nur für die Webseite oder für die App, falls sie online nachlädt).

**Apple App Privacy:** Nur auf dem Gerät verarbeitete Daten gelten nicht als „erhoben“. Ohne Netzanfragen: „Data Not Collected“.

**Google Datensicherheit:** Pflicht für jede App außerhalb des internen Tests, auch ohne Datenerhebung. Ohne Netzanfragen: „Keine Daten erhoben, keine Daten weitergegeben“; die Fragen zur Datenlöschung trotzdem beantworten.

**Kontolöschung:** entfällt, die App hat keine Konten (Apple 5.1.1(v) und Google gelten nur für Apps mit Kontoerstellung).

**Exportkontrolle:** siehe Abschnitt 2, Punkt 6.

**EU-Händlerstatus (DSA):** Apple verlangt von jedem Konto eine Erklärung „Händler“ oder „kein Händler“. Händler zeigen Adresse (oder Postfach), Telefon und E-Mail öffentlich auf der Produktseite in der EU. Apple nennt als Anzeichen für Händler u. a. Einnahmen aus der App; Hobby-Apps ohne Absicht zur Vermarktung sind „vielleicht“ keine Händler. Die Erklärung gilt für das ganze Konto, also auch für SPÖ Connect. Google Play hat eine ähnliche Abfrage; die Play-Hilfeseite dazu wurde nicht gefunden **[offen]**. **Entscheidung des Eigentümers**, bei Zweifel mit Beratung.

## 6. Spenden und Zahlungen

Die Webseite hat einen Stripe-Spendenlink (`supportUtils.js`, Spendenseite).

- **Apple:** Trinkgeld an den Entwickler nur über In-App-Kauf (3.1.1). Außerhalb des US-Stores dürfen App und Metadaten keine Knöpfe oder Links zu anderen Zahlungswegen enthalten (3.1.1(a)). Spendensammeln ohne In-App-Kauf nur für anerkannte gemeinnützige Organisationen (3.2.1(vi), 3.2.2(iv)).
- **Google:** Apps dürfen nicht zu anderen Zahlungswegen als Google Play Billing führen (Links, Knöpfe), Ausnahmen u. a. für steuerbefreite Spenden und für Sonderprogramme in bestimmten Ländern. Trinkgeld an Entwickler erwähnt die Seite nicht.

**Umgesetzt (Android-Build):** Knopf, Seite, Menü-Reiter und Taste „D“ sind im App-Build aus (`IS_NATIVE_APP` in `frontend/src/nativeApp.js`). Der Stripe-Text steckt als toter Code noch im JavaScript-Paket, wird aber nirgends angezeigt oder aufgerufen. **Empfehlung:** in beiden Apps keinen Spendenlink zeigen. Später optional ein Trinkgeld per In-App-Kauf (Apple) bzw. Play Billing; das macht die App kostenpflichtig im Sinn der Abrechnung (Steuer, Auszahlung, wahrscheinlich Händlerstatus). **Entscheidung des Eigentümers.**

## 7. Signatur (alles außerhalb des Repos)

Vorschlag Ablageort: `~/libremetronome-release/` (`chmod 700`, nicht in iCloud/Dropbox, Backup verschlüsselt). Kennwörter zusätzlich im Passwortmanager.

**Android**
- Play App Signing (Standard für neue Apps): Google erzeugt und verwahrt den App-Signaturschlüssel, der Eigentümer hat nur den **Upload-Schlüssel**; ein verlorener Upload-Schlüssel lässt sich in der Play Console zurücksetzen.
- Eigenen Upload-Schlüssel je App erzeugen (einmalig, Eigentümer; nicht den von SPÖ Connect wiederverwenden):
  ```bash
  keytool -genkeypair -v -keystore ~/libremetronome-release/upload.jks -alias upload -keyalg RSA -keysize 4096 -validity 10000
  ```
- `key.properties` mit absolutem `storeFile`-Pfad ebenfalls dort; `build.gradle` liest sie nur über einen Pfad aus einer Umgebungsvariablen. Die Root-`.gitignore` schließt `*.jks` und `*.keystore` schon aus; `key.properties` fehlt dort und gehört ergänzt.
- Format: nur **AAB** für Play (`./gradlew bundleRelease`).

**iOS**
- Automatische Signatur in Xcode mit dem Team der Einzelmitgliedschaft; Zertifikate und Profile bleiben im Schlüsselbund. Keine Team-ID, Profile oder Geräte-IDs ins Repo.
- Archiv in Xcode (*Product → Archive*), Upload über *Organizer → Distribute App → App Store Connect* oder die App Transporter.

Kein CI mit Schlüsseln, solange nicht ausdrücklich entschieden.

## 8. Testphase und Veröffentlichung

### Google Play

1. Play Console (Konto „Schoensgibl.com“): App anlegen (Name, Standardsprache Englisch, App, **bezahlt**). Preis 1,99 € setzen; Händlerprofil muss aktiv sein (Abschnitt 13). **Ab dem ersten Upload ist die Kennung belegt.**
2. **Interner Test:** E-Mail-Liste (bis 100), AAB hochladen, veröffentlichen, Teilnahme-Link verschicken. Keine Standardprüfung, kein Datensicherheitsformular nötig. Bis die App eingerichtet und geprüft ist, zeigt Play einen vorläufigen Namen wie „com.hybridpicker.libremetronome (unreviewed)“ (bei SPÖ Connect so beobachtet).
3. **Geschlossener Test (Pflicht für private Konten, die nach 2023-11-13 angelegt wurden):** mindestens **12 Testpersonen**, die **14 Tage ununterbrochen** eingetragen sind. Wer austritt und wieder eintritt, beginnt neu. Dafür müssen Store-Eintrag, Datensicherheitsformular, Altersfreigabe und Datenschutz-URL fertig sein. Der interne Test zählt nicht. Tipp: dieselbe Testgruppe (z. B. eine Google Group) für LibreMetronome und Guitar Positions nutzen und beide geschlossenen Tests gleichzeitig laufen lassen. Ob die Pflicht je App gilt, sagt die Hilfeseite nicht ausdrücklich („for their app“); vorsichtshalber je App einplanen.
4. **Zugriff auf Produktion beantragen** im Dashboard (drei Abschnitte: geschlossener Test, App, Bereitschaft). Prüfung meist bis 7 Tage; Google kann längeres Testen verlangen.
5. Produktions-Release, gestaffelt (z. B. 20 %) oder voll.

AAB-Upload macht der Eigentümer selbst in der Play Console (Claude in Chrome lädt nur bis 10 MB hoch).

### Apple

1. Mitgliedschaft aktiv (ausstehend). App ID im Developer-Portal (Xcode legt sie bei automatischer Signatur an).
2. App Store Connect: neue App, iOS, Bundle-ID, Name, SKU. **Ab hier ist die Bundle-ID belegt.**
3. Build hochladen, Exportkontrolle beantworten (sonst „Missing Compliance“).
4. **TestFlight intern:** App-Store-Connect-Nutzer des Teams (bis 100), ohne Prüfung; für den Anfang reicht der Eigentümer.
5. **TestFlight extern:** bis 10 000 Personen per E-Mail-Einladung oder öffentlichem Link; erster Build braucht die Beta-App-Prüfung; vorher muss eine interne Gruppe bestehen. Builds laufen 90 Tage.
6. Store-Eintrag, App Privacy, Altersfreigabe, Preis (kostenlos) und Länder, DSA-Status; Version zur **App-Prüfung** einreichen, „manuell veröffentlichen“ wählen.
7. Optional „iPhone- und iPad-Apps auf Mac mit Apple-Chip“ aktiv lassen (Mac App Store ohne eigenen Mac-Build).

## 9. Kosten

| Posten | Betrag | Bemerkung |
|---|---|---|
| Apple Developer Program | 99 USD pro Jahr (Landeswährung je nach Region) | schon für SPÖ Connect bezahlt, gilt für alle Apps des Kontos; läuft die Mitgliedschaft aus, verschwinden die Apps aus dem Store |
| Google Play Konto | 25 USD einmalig | schon bezahlt |
| Store-Provision | Anteil von Google am Verkaufspreis (aktuellen Satz in der Console prüfen, nicht hier festgeschrieben) | bezahlte App, keine In-App-Käufe; Play erstattet auf Wunsch innerhalb von 2 Stunden automatisch, das ist normal |
| Geräte zum Testen | vorhanden (iPad, Android-Emulator) | **echtes Android-Telefon Pflicht vor Produktion** (Latenz, Hintergrund-Audio) |

Apple zeigt bei Einzelmitgliedschaften den **bürgerlichen Namen** als Anbieter, Google den Namen des Entwicklerkontos („Schoensgibl.com“).

## 10. Entscheidungen des Eigentümers

**Entschieden am 2026-10-24:** Kennung `com.libremetronome` (1), offline ohne Server (2), keine Spenden im App-Build (3), Preis 1,99 € weltweit, Store-Sprache nur Englisch (6, 10), Hintergrund-Audio nach Messung entscheiden, `bluetooth-central` entfernen (9; im iOS-Projekt schon entfernt).

**Noch offen:** (4) DSA-Händlerstatus und Steuerfrage (Frage an den Steuerberater in Abschnitt 13), (5) GPL im App Store (nur iOS), (7) Geräte iOS, (8) Testpersonen.

Ursprüngliche Liste (zur Nachvollziehbarkeit):

1. **App-Kennung** (Abschnitt 3): `com.hybridpicker.libremetronome` beibehalten oder `com.libremetronome.app`.
2. **Offline oder online:** App ohne Netz (Vorschlag) oder Klangsätze vom Server nachladen (dann andere Datenschutzangaben).
3. **Spenden:** in den Apps weglassen (Vorschlag) oder später Trinkgeld per In-App-Kauf.
4. **DSA-Händlerstatus** des Apple-Kontos (gilt für alle Apps inkl. SPÖ Connect) und des Play-Kontos; bei Zweifel Beratung.
5. **GPL v3 im App Store:** Die FSF hält die Nutzungsbedingungen des App Store für unvereinbar mit der GPL (bekannt aus dem VLC-Fall 2011; hier nicht nachgelesen, keine rechtliche Bewertung). Laut Git-Verlauf stammen alle Beiträge vom Eigentümer (plus Dependabot); als Rechteinhaber kann er die App trotzdem selbst einreichen. Beiträge Dritter brauchen künftig eine Zustimmung (z. B. Hinweis in `CONTRIBUTING`) oder eine Ausnahme-Klausel. Entscheidung, ob und wie.
6. **Name und Untertitel**, Store-Sprachen (Deutsch, Englisch).
7. **Geräte:** iPhone und iPad (heute beides), Android Telefon und Tablet.
8. **Testpersonen** für den geschlossenen Play-Test (mind. 12 Google-Konten, 14 Tage) und für TestFlight; gemeinsame Gruppe mit Guitar Positions?
9. **Hintergrundmodus** `bluetooth-central` entfernen (Vorschlag).
10. **Länder:** weltweit oder nur EU/Österreich.

## 11. Store-Regeln (Quellen)

Gelesen am **2026-10-22**, außer wo „2026-10-21“ steht (Recherche für SPÖ Connect, `connect-spoe/docs/chat-app-pilot-release.md` Abschnitt 9). Keine rechtliche Bewertung.

### 11.1 Apple

- Richtlinie 4.2: „Your app should include features, content, and UI that elevate it beyond a repackaged website.“ 4.2.2: keine reinen Web-Ausschnitte oder Linksammlungen. 3.1.1 Trinkgeld per In-App-Kauf; 3.1.1(a) keine Links zu anderen Zahlungswegen außer im US-Store; 3.2.2(iv) Spenden nur über anerkannte Gemeinnützige; 5.1.1(i) Datenschutz-Link in Metadaten und App; 5.1.1(v) Kontolöschung bei Kontoerstellung. Quelle: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).
- Mitgliedschaft 99 USD pro Jahr in Landeswährung; bei Einzelpersonen erscheint der bürgerliche Name als Anbieter. Quelle: [Program enrollment](https://developer.apple.com/help/account/membership/program-enrollment).
- Name 2–30 Zeichen, Untertitel 30, Datenschutz-URL Pflicht für iOS. Quelle: [App information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information).
- Beschreibung 4000 Zeichen, Werbetext 170, Schlüsselwörter 100 Byte, Support-URL Pflicht mit Kontaktdaten. Quelle: [Platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information).
- Screenshots: 1–10 je Größe, iPhone mit Dynamic Island und (bei iPad-Unterstützung) iPad 13 Zoll Pflicht, JPEG/PNG ohne Alpha. Quelle: [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications).
- DSA-Händlerstatus: jedes Konto erklärt ihn, auch ohne EU-Vertrieb; Händler zeigen Adresse/Postfach, Telefon, E-Mail; Nicht-Händler ohne Kontaktdaten, EU-Kunden werden auf fehlende Verbraucherrechte hingewiesen. Quelle: [Manage EU DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements).
- Datenschutzangaben: nur auf dem Gerät verarbeitete Daten gelten nicht als erhoben. Quelle: [App privacy details](https://developer.apple.com/app-store/app-privacy-details/) (2026-10-21).
- TestFlight: intern bis 100 ohne Prüfung; extern bis 10 000 mit Beta-App-Prüfung, interne Gruppe vorausgesetzt; Builds 90 Tage. Quellen: [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview), [Invite external testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers) (2026-10-21).
- Exportkontrolle: `ITSAppUsesNonExemptEncryption` NO nur ohne bzw. mit ausgenommener Verschlüsselung; ohne Schlüssel Frage bei jedem Upload; ohne Antwort „Missing Compliance“. Quellen: [ITSAppUsesNonExemptEncryption](https://developer.apple.com/documentation/bundleresources/information-property-list/itsappusesnonexemptencryption), [Export compliance for beta builds](https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-export-compliance-information-for-beta-builds) (2026-10-21).
- Uploads nur mit Xcode 26 / iOS-26-SDK seit 2026-04-28. Quelle: [Upcoming requirements](https://developer.apple.com/news/upcoming-requirements/) (2026-10-21).
- Privacy Manifest für Required-Reason-APIs seit 2024-05-01. Quelle: [Privacy manifest files](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files) (2026-10-21).

### 11.2 Google Play

- Geschlossener Test: private Konten nach 2023-11-13, mind. 12 Tester, 14 Tage ununterbrochen, dann „Apply for production“, Prüfung meist ≤ 7 Tage. Quelle: [Play-Console-Hilfe 14151465](https://support.google.com/googleplay/android-developer/answer/14151465).
- Registrierung 25 USD einmalig; private Konten mit Zusatzpflichten (Testpflicht, Gerätenachweis). Quelle: [6112435](https://support.google.com/googleplay/android-developer/answer/6112435).
- Datensicherheit: Pflicht für alle veröffentlichten Apps, auch ohne Datenerhebung, mit Datenschutz-Link; nur interne Tests ausgenommen; rein lokal verarbeitete Daten gelten nicht als erhoben. Quelle: [10787469](https://support.google.com/googleplay/android-developer/answer/10787469).
- Zahlungen: steuerbefreite Spenden nicht über Play Billing; keine Links/Knöpfe zu anderen Zahlungswegen außer in den Sonderprogrammen; Trinkgeld nicht erwähnt. Quelle: [Payments policy 9858738](https://support.google.com/googleplay/android-developer/answer/9858738).
- Store-Eintrag: Icon 512 × 512, Feature Graphic 1024 × 500, 2–8 Screenshots je Gerätetyp, Kurzbeschreibung 80 Zeichen. Quelle: [9866151](https://support.google.com/googleplay/android-developer/answer/9866151). Name 30, Beschreibung 4000 Zeichen. Quelle: [9859152](https://support.google.com/googleplay/android-developer/answer/9859152).
- Interner Test: bis 100 Tester, keine Standardprüfung. Quelle: [9845334](https://support.google.com/googleplay/android-developer/answer/9845334) (2026-10-21).
- Play App Signing, Upload-Schlüssel zurücksetzbar. Quelle: [9842756](https://support.google.com/googleplay/android-developer/answer/9842756) (2026-10-21). Neue Apps nur als AAB: [developer.android.com/guide/app-bundle](https://developer.android.com/guide/app-bundle) (2026-10-21).
- Ziel-API seit 2026-08-31 mindestens 36 (Projekt: `targetSdkVersion = 36`). Quelle: [11926878](https://support.google.com/googleplay/android-developer/answer/11926878) (2026-10-21).
- Kontolöschung nur bei Kontoerstellung in der App. Quelle: [13327111](https://support.google.com/googleplay/android-developer/answer/13327111) (2026-10-21).
- DSA-Händlerstatus bei Google Play: offizielle Hilfeseite nicht gefunden **[offen]**.

## 12. Android-Build: Stand und Nachweise (2026-10-24)

### Geändert im Repo (lokal, nicht gepusht)

| Thema | Änderung |
|---|---|
| Kennung | `com.libremetronome` in `capacitor.config.ts`, `android/app/build.gradle`, `strings.xml`, iOS-`project.pbxproj`; `MainActivity` in `com/libremetronome/` |
| Offline | `frontend/src/nativeApp.js` (`IS_NATIVE_APP = Capacitor.isNativePlatform()`). Im App-Build liefert `soundSetService.js` den mitgelieferten Klangsatz „Classic“ (`/assets/audio/click_new*.wav`) und ruft `/api/…` nie auf. Die Web-Version bleibt unverändert. |
| Netzrecht | Permission `INTERNET` aus dem Android-Manifest entfernt. Ohne sie kann die App technisch keine Verbindung öffnen. |
| Spenden | `SupportButton` (Footer), Reiter „Support“, Taste „D“ und `SupportPage` im App-Build aus. |
| Info-Fenster | Links „Source code“ (GitHub) und „Privacy“ (`https://libremetronome.com/privacy`) |
| Version | Eine Quelle `frontend/package.json`: `version` → `versionName`, `buildNumber` → `versionCode` (heute 1). **Vor jedem Upload `buildNumber` erhöhen** und im Bundle Explorer prüfen, dass Play den Code noch nicht kennt. iOS `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION` sind noch nicht angebunden (iOS-Auftrag). |
| Signatur | `build.gradle` liest die Datei, auf die die Umgebungsvariable `LIBREMETRONOME_KEY_PROPERTIES` zeigt. Ohne Variable entsteht eine unsignierte AAB (zum Testen des Builds). `key.properties` steht in `.gitignore`. |
| Absturzschutz | `MainActivity` setzt einen `BridgeWebViewClient` mit `onRenderProcessGone`: ein abgestürzter WebView-Renderer lädt die Seite neu statt die App zu beenden. |
| iOS | `bluetooth-central` aus `UIBackgroundModes` entfernt (`audio` bleibt). |

### Geprüft (mit Nachweis)

| Prüfung | Ergebnis |
|---|---|
| Frontend-Tests (`CI=true npm test`) | 36 Suites, 195 Tests grün |
| `npm run build` | erfolgreich |
| `./gradlew assembleDebug bundleRelease` (JDK 21, nicht das JDK 25 von Android Studio) | erfolgreich; AAB **4,2 MB**, also unter dem 10-MB-Limit von Claude in Chrome, Upload macht der Eigentümer trotzdem selbst |
| Berechtigungen der APK (`aapt dump permissions`) | keine außer der von Android automatisch angelegten internen Empfängerberechtigung; **kein INTERNET** |
| Start im Emulator (System-Image API 37) | App läuft, `AudioContext` Zustand „running“ (48 kHz), keine Fetch-Fehler im Log |
| Service Worker | im Quelltext keine Registrierung (Suche in `src`, `public/index.html`) |

### Nicht geprüft / offen

- **Echtes Telefon:** keines angeschlossen. Pflicht vor Produktion für Klick-Latenz, Taktstabilität (Jitter) und Hintergrund-Audio. Ein iPad steckt am Mac (für den späteren iOS-Lauf nützlich, nicht für Android).
- **Emulator:** instabil (zwischenzeitlich „System died“, Screenshot-Übertragung brach ab). Emulator-Audio ist ohnehin nicht aussagekräftig. Screenshots für Play (mind. 4, 1080 × 1920) sind nicht gemacht.
- **Hintergrund-Audio (Bildschirm aus / App im Hintergrund):** **nicht gemessen**. Entscheidung „nach Messung“ steht aus. Wenn Android die Wiedergabe pausiert, braucht es einen Vordergrunddienst mit Benachrichtigung und der Berechtigung `FOREGROUND_SERVICE` (Typ `mediaPlayback`); das müsste im Play-Formular „Vordergrunddienste“ und in der Datenschutzerklärung stehen. Messplan: Metronom 120 BPM starten, Bildschirm aus bzw. App wechseln, 5 Minuten, Takte aufzeichnen (Mikrofon am Telefon oder Systemaudio) und Abstände auswerten.
- **Netzmitschnitt:** ersetzt durch die Permission-Prüfung (strenger als ein Mitschnitt). Ein Mitschnitt mit `tcpdump` wäre nur nötig, wenn der Eigentümer einen Nachweis für Dritte will.
- „Error injecting safe area CSS“ im Log stammt aus Capacitor beim Start (Body noch `null`), ohne sichtbare Folge im Log; am Telefon gegenprüfen.
- Ein Klangsatz: die Weboberfläche kennt auch „Wood Block“ und „Drums“, deren Dateien im Repo fehlen. Die App liefert nur „Classic“. Die Beschreibung verspricht deshalb nur „Classic“. Mehr Klänge = eigener Auftrag (Dateien liefern, Lizenz klären).
- Der Stripe-Text steckt als toter Code im JavaScript-Paket (siehe Abschnitt 6).

### Eine signierte AAB bauen (Eigentümer oder Claude lokal, ohne Schlüssel in Ausgaben)

1. Schlüssel einmalig erzeugen, **Passwörter nur im Terminal eintippen, nicht in den Chat**:
   ```bash
   mkdir -p ~/libremetronome-release && chmod 700 ~/libremetronome-release
   keytool -genkeypair -v -keystore ~/libremetronome-release/upload.jks -alias upload -keyalg RSA -keysize 4096 -validity 10000
   ```
2. `~/libremetronome-release/key.properties` anlegen (Rechte 600) mit `storeFile` (absoluter Pfad), `storePassword`, `keyAlias=upload`, `keyPassword`. Schlüssel und Passwörter in den Passwortmanager.
3. `buildNumber` in `frontend/package.json` erhöhen.
4. Bauen, am besten aus einem sauberen Worktree von `origin/main`:
   ```bash
   cd frontend && npm ci && npm run build && npx cap sync android
   cd android && export JAVA_HOME=<JDK 21> LIBREMETRONOME_KEY_PROPERTIES=$HOME/libremetronome-release/key.properties
   ./gradlew bundleRelease
   open -R app/build/outputs/bundle/release/app-release.aab
   ```
5. Datei per Drag and Drop in die Play Console ziehen (Eigentümer).

Hinweis zur Umgebung: In der Claude-Shell sind `npm`/`node` als nvm-Funktionen definiert, die dort nicht laden. Aufruf mit `bash --noprofile --norc -c 'export PATH=$HOME/.nvm/versions/node/v24.15.0/bin:/usr/bin:/bin:$PATH; npm …'`.

## 13. Vorbereitung für die Testphase (Google Play)

### Was der Eigentümer vor „App anlegen“ klären und selbst eintragen muss

1. **Händlerprofil (Zahlungsprofil)** in der Play Console: Das ist Voraussetzung für den Verkauf. Eintragen: Bankverbindung, Steuer- und Adressangaben, Kontaktdaten. Ich trage nichts davon ein. Danach prüfe ich nur, ob der Status „aktiv“ ist. Menüpunkte (Namen können sich ändern): *Play Console → Einstellungen → Zahlungsprofil* bzw. *Berichte → Finanzen*; genaue Pfade bei der Durchsicht der Hilfe prüfen.
2. **DSA-Händlerstatus** (Play Console, Kontoeinstellungen): Entscheidung des Eigentümers. **Frage für den Steuerberater:** „Ich verkaufe als Privatperson ohne Gewerbeschein eine Android-App (1,99 € inkl. MwSt.) an Verbraucher in der EU, abgewickelt über Google Play. Gilt das als Gewerbe beziehungsweise ‚Honorarnote ohne Gewerbe‘, und bin ich damit ‚Händler‘ im Sinne des DSA? Dann stehen meine Adresse, Telefonnummer und E-Mail öffentlich im Eintrag; das gilt kontoweit, auch für SPÖ Connect.“ Ohne Antwort wird nichts veröffentlicht.
3. **Play-Hilfe:** geprüft am 2026-10-24, Ergebnis in Abschnitt 13.1. Kurz: bezahlt muss von Anfang an gewählt werden, auch für den internen Test (siehe dort).
4. **Kennung bestätigen**: `com.libremetronome`, unumkehrbar.

### 13.1 Ergebnis der Play-Hilfe (gelesen 2026-10-24)

| Frage | Antwort der Hilfe | Quelle |
|---|---|---|
| Kostenlos → bezahlt? | **Nein.** „Once your app has been offered for free, the app can't be changed to paid.“ Dann nur neue App mit neuer Kennung. | [6334373](https://support.google.com/googleplay/android-developer/answer/6334373) |
| Bezahlt → kostenlos? | Ja, jederzeit. | 6334373 |
| Gilt das schon für den internen Test? | Die Seite zum internen Test sagt dazu nichts Ausdrückliches; Preisänderungen gelten für alle Spuren („affect all versions across all tracks“). **Vorsicht:** Aus „offered for free“ ist nicht sicher abzuleiten, ob ein interner Test als „angeboten“ zählt. Darum die App **von Anfang an als bezahlt anlegen**, nie erst „kostenlos testen“. | [9845334](https://support.google.com/googleplay/android-developer/answer/9845334), 6334373 |
| Zahlungsprofil nötig? | Ja, **vor dem Preis** muss ein Zahlungsprofil (Google Payments Center) eingerichtet sein; Steuersätze werden in der Console angegeben. Es verlinkt sich automatisch mit der Console. Rechtlicher Firmen- bzw. Privatname und eine echte Anschrift (kein Postfach) sind Pflicht, dazu eine Zahlungsmethode für die Auszahlung. Das Land des Geschäftssitzes lässt sich später nicht ändern. | 6334373, [Payments Center 7161426](https://support.google.com/paymentscenter/answer/7161426) |
| Menüpfad (in der Console gesehen 2026-10-24) | *Konto verwalten → Einstellungen für Google Play-Apps → Einstellungen für die Monetarisierung → Zahlungsprofil* (dort auch *Steuersätze* und *Lizenztest*). Stand an dem Tag: **kein Zahlungsprofil vorhanden** („Zahlungsprofil erstellen, um Geld verdienen zu können“), Eigentümer muss es anlegen. | Console, nur gelesen |
| Neu in der Console | Unter *Konto verwalten* gibt es *Identitätsbestätigung für Android-Entwickler* („Paketnamen ansehen, verwalten und registrieren“). Nicht geöffnet. Vor dem Anlegen prüfen, ob `com.libremetronome` dort registriert werden muss. | Console |
| Internes Testen und Zahlungsprofil | Die Seite nennt keine Pflicht. Ein gültiges App-Bundle genügt; die App muss nicht fertig eingerichtet sein. Tester brauchen ein Google-Konto, bis 100 pro App. | 9845334 |
| Tester zahlen? | Bei bezahlten Apps installieren Tester die **interne** Testversion kostenlos („testers can install your internal test version for free“). Für **geschlossene** Tests Lizenztester eintragen (Einstellungen → Lizenztests), damit niemand zahlt. | 9845334; Lizenztests: nicht separat gelesen |
| Preis und Steuer | Der eingegebene Preis ist die Basis, andere Länder rechnet Play um. Option „Default price includes tax“ (EU-Preis inkl. MwSt.) wurde früher in Preisvorlagen gesetzt; seit 2025-10-27 pro Produkt. **Bei der Preiseingabe prüfen, dass 1,99 € inkl. Steuer gemeint ist.** Länder ohne Vertrieb: kein Zugriff. | 6334373 |

**Empfehlung für die Reihenfolge:** (1) Zahlungsprofil aktiv (Eigentümer), (2) DSA-/Steuerfrage geklärt, (3) App als **bezahlt** anlegen und Preis setzen, (4) erst dann Upload in den internen Test.

### Tore (nichts davon ohne ausdrückliches Wort)

| # | Tor | Stand |
|---|---|---|
| 1 | „go“ für Code-Änderungen am App-Build | Am 2026-10-24 als „berate alles für die Testphase vor“ aufgefasst und umgesetzt; Diff liegt zur Durchsicht vor. Bei Einwand zurücknehmen mit `git revert`. |
| 2 | „App anlegen“ (Kennung + bezahlt, 1,99 €) | **erledigt 2026-10-24**: App „LibreMetronome“, `com.libremetronome`, en-US, App, kostenpflichtig angelegt (Eigentümer gab ausdrückliches Ja inkl. der zwei Erklärungen: Programmrichtlinien, US-Exportbestimmungen). **Preis 1,99 € noch nicht gesetzt** (braucht Zahlungsprofil). Die Kennung ist belegt. Die Console bestätigt: geschlossener Test mit mind. 12 Testern über mind. 14 Tage vor Produktionszugriff. |
| 3 | „upload“ je AAB | offen, Eigentümer zieht die Datei |
| 4 | „Produktion beantragen“ / „veröffentlichen“ | offen; vorher Liste Preis, Länder (weltweit), Händlerstatus |

### Zeitplan (Beispiel, Starttag = Tag 0 = Beginn des geschlossenen Tests mit 12 Testern)

| Wann | Schritt | Wer |
|---|---|---|
| vor Tag 0 | Händlerprofil aktiv, DSA-Frage beantwortet, Play-Hilfe geprüft | Eigentümer |
| vor Tag 0 | Datenschutzseite `/privacy` live (Serversitzung, Entwurf: `docs/store/privacy-policy.md`) | Serversitzung |
| vor Tag 0 | Messung am echten Telefon (Latenz, Jitter, Hintergrund-Audio), danach ggf. Vordergrunddienst | Claude + Eigentümer |
| vor Tag 0 | Signierte AAB (versionCode neu), Icon 512, Feature Graphic 1024 × 500, 4+ Screenshots | Claude baut, Eigentümer lädt hoch |
| vor Tag 0 | App anlegen, interner Test (bis 100 Tester) | Eigentümer, nach Tor 2/3 |
| vor Tag 0 | Store-Eintrag, Datensicherheit, Altersfreigabe, Zielgruppe (Erklärungen nur durch den Eigentümer) | Eigentümer |
| Tag 0 | Geschlossener Test: mind. 12 Tester eintragen, **Lizenztest-Zugriff** vergeben (damit sie nicht zahlen) | Eigentümer |
| Tag 0 bis 14 | Tester dürfen nicht austreten; Fehler sammeln; bei neuem Build `buildNumber` erhöhen | alle |
| Tag 14 | „Zugriff auf Produktion beantragen“ (Prüfung meist bis 7 Tage) | Eigentümer, Tor 4 |
| danach | Produktion, gestaffelt oder voll | Eigentümer |

Regeln im Detail sind in Abschnitt 8 und 11.2 mit Quelle und Lesedatum festgehalten; die 12-Tester-/14-Tage-Regel vor dem Start in der Console gegenprüfen. Der Zähler (14 Tage) beginnt erst, wenn der Test wirklich läuft; ein konkretes Datum steht daher noch nicht fest.

Gemeinsame Testgruppe (Google Group) mit Guitar Positions ist möglich; der Test zählt je App.

### Weitere Hinweise

- Bezahlte Apps haben keinen Probezeitraum. Play erstattet auf Wunsch innerhalb von 2 Stunden automatisch.
- Die Console zeigt bis zur ersten Prüfung einen vorläufigen Namen mit „(unreviewed)“, das ist normal.
- Quelltext-Link steht im Info-Fenster und im Store-Text. iOS-Frage (FSF) bleibt offen.
- iOS ist vorbereitet (Kennung, Hintergrundmodus), aber nicht eingereicht. Offen für iOS: Apple-Vereinbarung für bezahlte Apps samt Bank- und Steuerdaten (Eigentümer), `ITSAppUsesNonExemptEncryption`, Privacy Manifest, Versionsanbindung, Icons.

### 13.2 Upload-Schlüssel und signierte AAB (2026-10-24)

- Schlüssel erzeugt lokal in `~/libremetronome-release/` (Ordner 700, Dateien 600, nicht in iCloud): `upload.jks` (RSA 4096, Alias `upload`, 10 000 Tage) und `key.properties`. Die Passwörter wurden zufällig erzeugt und **nie ausgegeben**. **Offen für den Eigentümer:** `key.properties` selbst öffnen und Passwort und Dateien in den Passwortmanager sichern. Ohne Sicherung ist der Schlüssel bei Datenverlust weg (Play kann den Upload-Schlüssel zwar zurücksetzen, das kostet aber Zeit).
- Signierte AAB gebaut aus dem committed Stand: `frontend/android/app/build/outputs/bundle/release/app-release.aab`, 4,2 MB, `jarsigner -verify` meldet „verifiziert“. Zertifikat SHA-256 (öffentlich, zum Abgleich in der Play Console): `71:0C:AA:D6:BE:18:D0:49:B0:F7:8E:C1:62:9B:C6:66:E3:AA:CC:DE:FC:A1:D7:62:AB:55:BA:6E:09:6B:E6:67`.
- `versionCode` 1, `versionName` 0.6.0. Für jeden weiteren Upload `buildNumber` erhöhen.
- Nicht hochgeladen. Der Upload ist Tor 3 und wird vom Eigentümer per Drag and Drop gemacht.

### 13.3 Interner Test (2026-10-24)

- Eigentümer hat die AAB selbst hochgeladen (Tor 3) und den Release 1 (0.6.0, versionCode 1) im internen Test veröffentlicht: „Für interne Tester verfügbar“, 24. Okt. 07:12, Status „Nicht überprüft“. Console zeigt vorläufigen Namen „com.libremetronome (unreviewed)“, das ist normal.
- Der Track steht noch auf „Inaktiv“, weil noch keine Tester eingetragen sind (Reiter „Tester“). Offen: E-Mail-Liste anlegen, Teilnahme-Link verschicken, auf dem Telefon installieren und messen (Abschnitt 12).
- Nächster Upload braucht `buildNumber` 2.

### 13.4 Tester einrichten und Teilnahme-Link (2026-10-24)

- **Wo:** Play Console → App LibreMetronome → *Testen und veröffentlichen → Interner Test → Reiter „Tester“*. E-Mail-Liste „Tester LibreMetronome“ (1 Nutzer) angelegt, angehakt und gespeichert. Track-Status danach **Aktiv**. Die Adressen trägt der Eigentümer selbst ein, sie stehen nicht in diesem Repo.
- **Teilnahme-Link (intern, nur für Konten aus der Liste):** `https://play.google.com/apps/internaltest/4701428133926911851`. Auf dem Telefon öffnen, „Tester werden“, dann bei Google Play installieren. Der Name lautet bis zur Prüfung „com.libremetronome (unreviewed)“. Bei bezahlten Apps installieren interne Tester kostenlos.
- **Beobachtung 2026-10-24:** Der Link zeigte auf dem Telefon „Nicht gefunden“, obwohl Track aktiv und Liste gespeichert waren. Mögliche Ursachen, noch nicht geklärt: (1) auf dem Telefon ist ein anderes Google-Konto aktiv als in der Liste (am häufigsten), (2) falsche Adresse in der Liste (muss die Google-Konto-Adresse sein), (3) Wartezeit nach dem ersten Veröffentlichen einer neuen App (Minuten bis Stunden), (4) Link unvollständig kopiert. Prüfreihenfolge 1 → 4. Ergebnis hier nachtragen.
- **Geschlossener Test (später):** eigene Liste mit mind. 12 Google-Konten, 14 Tage ununterbrochen, dazu *Konto verwalten → Einstellungen für Google Play-Apps → Einstellungen für die Monetarisierung → Lizenztest*, damit Tester nicht zahlen.

## 14. Auswertung Tester-Feedback und Build 0.6.1 (2026-10-24)

### Feedback (ohne personenbezogene Daten)

Eine Quelle (Tester A), Nachrichten plus zwei Screenshots von einem echten Android-Telefon (Gerätetyp und Android-Version nicht genannt).

| Nr. | Beobachtung | Art | Schwere | Reproduziert | Maßnahme |
|---|---|---|---|---|---|
| 1 | Icons nicht einheitlich; gewünscht: das Pendel-Icon der Mac-App überall | Design | stört | Ja (Quelltext): Android nutzte ein altes „LM“-Logo, iOS/macOS das Pendel | Android (adaptiv, Legacy, rund), Favicon, Touch-/PWA-Icons, `desktop/icon.png` aus der iOS-Vorlage neu erzeugt; Store-Icon `docs/store/icon-512.png` |
| 2 | Guide: Design-Fehler im Menü | Fehler (Layout) | stört | Ja (Browser, 375 px): Tabs umbrachen/überlappten | Tabs einzeilig und scrollbar, Titel und Schließen-Taste ohne Überlappung, Safe-Area; im App-Build kein „online“/„free“/Support-Kürzel |
| 3 | Zu viele Menü-Icons (drei) | Bedienung | stört | Ja (Screenshot, Quelltext) | Ein Menü-Button; „Accessibility“ und „Guide“ sind Einträge im Menü (Kürzel I unverändert) |
| 4 | Viel Scrollen | Bedienung | stört | Ja (Screenshot, Messung) | Header oben schmaler, Visualisierung höchstens ca. 34 % der Bildschirmhöhe, engere Abstände |
| 5 | „Generell mehr verbessern“ | Wunsch | unklar | nicht prüfbar | offen, Rückfrage an Tester A |

### Nachweise

- `CI=true npm test`: 36 Suites, 195 Tests grün; `npm run build` ok.
- Messung im Browser (412 × 800): Unterkante Tempo-Regler 883 → 800 px, Seitenhöhe 1390 → 1283 px. Das Layout wurde nur als Web-Ansicht in der Browser-Vorschau geprüft.
- Signierte AAB `frontend/android/app/build/outputs/bundle/release/app-release.aab` (5,2 MB), aus committetem Stand, versionCode 2, versionName 0.6.1; `jarsigner -verify` meldet „verifiziert“.
- APK (`assembleRelease`): keine Berechtigung außer der internen Empfängerberechtigung, **kein INTERNET**.

### Nicht geprüft / offen

- **Emulator:** APK installiert, Prozess startet, keine Absturzmeldung im Log, aber der Bildschirm blieb schwarz (Emulator-Anzeige instabil wie in Abschnitt 12). **Der Start ist daher nicht sichtbar bestätigt.** Android-Icon (Beschnitt in Launcher-Masken) und Layout im App-Build nicht auf dem Gerät gesehen.
- Echtes Telefon: Klick-Latenz, Taktstabilität, Hintergrund-Audio weiterhin **nicht gemessen** (Abschnitt 12). Tester A hat dazu nichts gemeldet.
- Der Menü-Umbau ist nur per Browser-Vorschau und Testsuite geprüft; Fokus-Rückgabe nach Schließen von Accessibility/Guide nicht manuell getestet.
- `versionCode` 2: vor dem Upload im Bundle Explorer prüfen, dass Play ihn nicht schon kennt (bisher nur Code 1 hochgeladen).
- Teilnahme-Link-Fehler (13.4) weiterhin nicht geklärt.
