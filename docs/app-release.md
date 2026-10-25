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

### 14.1 Nachtrag: Scrollen auf dem Handy (Build 0.6.2, versionCode 3)

Tester A: „sehr viel scrollen“. Ursache: Überlänge der Hauptseite gegenüber dem Bildschirm, gemessen mit einem Headless-Browser (Skript nicht im Repo) bei 412×805, 360×740 und 393×780: **455 bis 943 px je Modus** (Sequence am meisten).

- Änderung: kompaktes Handy-Layout (nur Breite < 600 px, Desktop unverändert): einzeilige Kopfzeile, einzeilige Mode-Leiste, höhenabhängige Größe der Visualisierung (`frontend/src/utils/phoneLayout.js`), Beats und Noten nebeneinander, Tempo/Lautstärke/Swing als einzeilige Regler, schmale Fußzeile (`frontend/src/styles/phone-compact.css`).
- Nachweis: Überlänge nach der Änderung **0 px in allen 15 Kombinationen** (5 Modi × 3 Größen), nichts unterhalb des Bildschirmrands. Tests 36 Suites / 195 Tests grün. Zwei Prüf-Durchgänge anhand der Screenshots (Bedienbarkeit, Optik), 2 Runden Umbau.
- Bekannte Schwächen: Regler-Spuren sind in den Zweier-Zeilen kurz (bei 360 px etwa 100–110 px, Polyrhythm-Tempo am kürzesten); Beat-Zahlen in Polyrhythm bei 360 px am Mindestmaß 40 px; in Analog und Grid bleibt Leerraum unten. Die Fußzeile mit Spendenknopf gibt es nur in der Web-Version; im App-Build entfällt sie (mehr Platz), das wurde nicht eigens gemessen.
- Nicht geprüft: echtes Gerät (Samsung), Gesten-Leiste und große Systemschrift, App-Build im Emulator (Anzeige instabil), Hintergrund-Audio und Latenz.
- Vor dem Upload: versionCode 3 in der Play Console frei (Release 2 / 0.6.1 nur hochgeladen, falls du es bereits getan hast; sonst darf 0.6.2 den Code 2 überspringen).

### 14.2 Nachtrag: Redesign Handy-Layout (Build 0.6.3, versionCode 4)

Auf dem Samsung (Screenshots Tester A/Eigentümer) sichtbar: Sequence mit 4 Kreisen überlappte, Beschriftungen stießen an Buttons, unten blieb Platz leer, Fußzeile belegte zwei Zeilen. Daraufhin Redesign in drei unabhängigen Entwürfen (Karten, Daumenzone, Tempo zuerst); gewählt: **Karten-Layout** (Modus-Leiste, Visualisierungskarte, eine Reglerkarte, feste Start-/Tap-Leiste unten). Nur Breite ≤ 600 px; Desktop unverändert (Agent-Screenshots bei 1280/1000/768/601 px verglichen, nicht pixelgenau von mir).

- Nachweis: 18 Fälle (6 Darstellungen × 412×805, 393×780, 360×740) Überlänge 0 px; 195 Tests grün; AAB signiert (`jarsigner` verifiziert), versionCode 4, kein INTERNET.
- Verhaltensänderung: „Beats pro Takt“ ist auf Handys ein −/+-Zähler statt 1–9-Direktwahl (ab 520 px Breite bleiben die Felder). Sequence erlaubt auf Handys höchstens 4 Kreise.
- Bekannte Schwächen: Kreise in Sequence mit 4 Kreisen nur etwa 104 px; Mode-Beschriftungen 12 px; Fußzeile auf Handys eine Zeile; Großschrift/Hoher Kontrast nur an wenigen Fällen geprüft; App-Build (Capacitor) nicht im Emulator gestartet, Guide-Fußzeilentext dort nicht sichtbar bestätigt.
- Offen: Prüfung auf dem Samsung, Latenz/Takt/Hintergrund-Audio weiterhin ungemessen.

## 15. Redesign: ein Design für alle Geräte (Build 0.7.0, versionCode 5)

### Ziel

Das 0.6.3-Handydesign war zu verspielt, und Desktop/Tablet sahen anders aus als das Handy. Jetzt gilt eine Gestaltung, eine Token-Basis, ein Komponenten-Satz für Web, Android-App und iOS-/macOS-Hülle; nur die Anordnung folgt der Breite. Regeln und Tokens: `docs/design-system.md`. Vorher/Nachher: `docs/redesign-before-after.png`.

### Änderungen

- Fast monochrom (Weiß, `#F6F7F7`, `#111`, Haarlinien); ein Akzent (Teal) nur für aktiven Zustand, aktuellen Schlag und Start; Gold nur als Kontur oder Punkt. Keine Schatten, Verläufe, Pillen, Karten mit Rahmen, Legenden-Punkte. Eine Schrift (Lato, mitgeliefert, damit die Maße auf jedem Gerät gleich sind), Skala 12/14/17/22/44.
- Ein Raster für alle Breiten (`styles/layout.css`): Handy einspaltig, Tablet hoch wie Handy, Tablet quer und Desktop zweispaltig (Inhalt höchstens 1200 px). `phone-compact.css`, `phone-modern.css`, `App.css` und mehrere tote Stylesheets entfielen; `phoneLayout.js` heißt jetzt `utils/layoutSize.js` und gilt für alle Breiten.
- Modi (Hoher Kontrast, Großschrift, Farbenblind) sind jetzt Token-Überschreibungen (`styles/accessibility-modes.css`) statt 1000 Zeilen Sonderregeln.
- Analog nur Stab, Drehpunkt, Gewicht; Polyrhythm ohne gestrichelte Außenbahn; Grid mit Rasterlinien; Mode-Wahl nur Text; Logo einfarbig; Menü-Icon ohne Rahmen; Footer eine Zeile (nur Web, mit Donate-Link; im App-Build kein Footer).
- Tests: `ThemeSystem.test.js` und `BasicThemeTest.test.js` prüften die alte Gold-Palette und sind durch `DesignTokens.test.js` ersetzt.

### Messwerte

`frontend/scripts/measure-layout.mjs` (Headless Chrome, playwright-core, nur Dev). Überlänge der Hauptseite in px:

| Fall | 412×805 | 393×780 | 360×740 | 768×1024 | 1024×768 | 1280×800 | 1440×900 |
|---|---|---|---|---|---|---|---|
| Analog | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Beat | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Grid | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Sequence | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Sequence, 4 Kreise | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Polyrhythm | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Das sind 42 von 42 Fällen ohne Überlänge, keine Touch-Fläche unter 40 px, kein Text unter 12 px (Skript, Endlauf mit `--strict`). Modi (alle 6 Ansichten): Hoher Kontrast und Farbenblind bei 412×805 und 1280×800, Großschrift bei 360×740, 393×780, 412×805 und 1280×800, jeweils 0 px. `CI=true npm test`: 35 Suites, 187 Tests grün. `npm run build` ok. Signierte AAB (versionCode 5, versionName 0.7.0): `jarsigner` verifiziert, im APK (`aapt`) keine Berechtigung INTERNET.

Prüfung: drei getrennte Prüfer (Optik, Handy-Daumen, Desktop/Tablet) auf Basis der Screenshots, eine Runde mit Nachbesserungen; danach keine zweite Prüfrunde.

### Nicht geprüft

- Echtes Gerät (Samsung), iOS, macOS; App-Build im Emulator; Latenz, Takt, Hintergrund-Audio weiterhin ungemessen.
- Training-Panel (liegt jetzt als Überlagerung über der Visualisierung) und die Dialoge (Menü, Guide, Barrierefreiheit) nur grob angesehen (412 und 1280 px).
- Hoher Kontrast, Großschrift und Farbenblind nicht in allen Größen.
- Kontrast nur nach Augenmaß und Token-Werten (ink-2 4,9:1, accent-ink 5,2:1), nicht mit einem Werkzeug über alle Zustände gemessen. Start-Label (22 px fett auf Teal `#00A0A0`, 3,2:1) erfüllt AA nur als großer Text.
- Web: noch nicht gepusht; Server-Build und Kopieren der Icons nach `static_cdn/assets` stehen aus.

### 15.1 Nachtrag: nur Teal, mehr Charakter (Build 0.7.1, versionCode 6)

Build 0.7.0 (versionCode 5) wurde vom Eigentümer im internen Test veröffentlicht (nicht von mir geprüft). Rückmeldung: Design besser, aber nur eine Farbe (Teal), Gold entfällt, und „einen Tick zu clean“.

- Gold entfernt: Akzent-Schlag ist ein Teal-Ring, erster Schlag Teal-Ring mit Punkt, Grid-Konturen teal. Neutrale Töne leicht teal getönt (`--surface` `#eff6f6`, Linien `#dbe7e7`/`#bdd0d0`, `--ink-2` `#5c6e6e`).
- Mehr Charakter innerhalb der Regeln: Beat-Modus mit Zifferblatt-Ring und 60 Haarlinien-Strichen (Fünferstriche teal), Analog mit Haarlinien-Skala über dem Pendel, Halo um den aktuellen Schlag.
- Nachweis: 42 von 42 Fälle Überlänge 0 px; Modi (Kontrast, Großschrift, Farbenblind) bei 412×805, 360×740, 1280×800 je 0 px; 187 Tests grün.
- Nicht geprüft: wie vorher (echtes Gerät, iOS, macOS); Kontrast der neuen Töne nur nach Token-Werten.

## 16. Design-Runde 3: „Score“ (nicht veröffentlicht, Version unverändert 0.7.1)

Die Versionsnummer und der `versionCode` wurden nicht angehoben; das entscheidet die Veröffentlichung. Vorher/nachher: `docs/redesign-before-after-round3.png`. Die Gestaltung steht in `docs/design-system.md`.

### Entscheidungen des Eigentümers

- Richtung „Score“: flach, kein 3D, keine Schatten; die Beat-Ansicht ist ein Takt auf einer fünfzeiligen Notenzeile. Weiße Seite, Akzent ist das Okabe-Ito-Paar `#005a8d` (Text) und `#0072b2` (Füllung), `#004b78` nur für gedrücktes Start; blaugetönte Neutraltöne. Teal ist kein Akzent mehr.
- Icon B (Pendel mit Notenkopf-Gewicht); Tempowort („Allegro“) nur über der Notenzeile; Lato Light statt Thin im Bundle.

### Änderungen (ein Commit je Schritt, 1 bis 10)

1. Tokens und `DesignTokens.test.js` (maßgeblich, prüft jetzt auch Kontrast, Schriftschnitte, Modi und alle ausgelieferten Stylesheets); Lato Light; `measure-layout.mjs` mit Tritanopie, Monochrom und `--beats N`.
2. Tasten: quadratisch, 1 px `ink-2`, aktiv blau gefüllt, Fokusring 2 px mit 3 px Abstand.
3. Tempozeile „♩ = 120 bpm“ (Ziffer Light 64/80/104 px), Regler mit 1,5-px-Fortschritt und Notenkopf-Griff (`RangeInput`), Labels in Satzschreibung, keine Linien zwischen den Zeilen.
4. Modusleiste, Start (56 px, „Pause“ umrandet) und Tap.
5. Dialoge, Trainingsleiste, Support-Seite; Reste von Schatten und rohen Farben aus `accessibility.css` und den Hilfe-Knöpfen entfernt.
6. Beat als Notenzeile (`Score/BeatStaff.js`, `staffLayout.js`); bei zu engen Schlägen bricht der Takt auf eine zweite Zeile um. Die Darstellung folgt weiter nur `currentSubdivision`, es gibt keine neuen Zeitgeber.
7. Notenköpfe in Grid (bricht bei neun Spalten auf zwei Blöcke um), Sequence, Polyrhythm (stumme Schläge als Pause) und im Guide.
8. Analog: Pendel über der Notenzeile, Notenkopf-Gewicht, Tempoangabe.
9. Modi geprüft; Protanopie und Deuteranopie brauchen keinen Ersatz (Hinweis im Dialog), Tritanopie `#a13f00`/`#c24d00`, Monochrom Tinte.
10. Icon, Store-Grafik, Manifest (`theme_color` `#0072b2`, Hintergrund `#ffffff`), Doku.

### Messwerte

`measure-layout.mjs`, Build mit `CI=false`: **42 von 42 Fällen ohne Überlänge, keine Touch-Fläche unter 40 px, kein Text unter 12 px** in jedem dieser Läufe: normal, Hoher Kontrast, Großschrift, Tritanopie, Monochrom, und jeweils zusätzlich mit neun Schlägen pro Takt. Tests: 37 Suiten, alle grün (darunter neu `BeatStaff`, `GridLayout`, `DesignTokens`).

Beim Neun-Schläge-Lauf zeigte der alte Stand des Grids Spalten unter 40 px Breite (32 px bei 360×740); das Grid bricht jetzt um.

### Nicht geprüft

- Echtes Gerät (Android, iOS, macOS), App-Build im Emulator; iOS-Simulator, Android-Adaptive-Icon und Splash nur als erzeugte Dateien, nicht gestartet.
- Der Beat-Zeitgeber und das Audio wurden nicht angefasst und nicht neu gemessen.
- Kontrast nach Token-Werten berechnet (Test), nicht mit einem Werkzeug über alle Zustände gemessen; Staff-Linien (`--line`, 1,3:1) sind bewusst Dekor.
- Bildschirmleser nicht ausprobiert; die Namen der Beat-Tasten sind unverändert.
- Tastatur: nur die Reihenfolge der Beat-Tasten im DOM ist getestet, nicht die Tab-Reihenfolge im Browser; eine Pfeiltasten-Steuerung gibt es nicht.
- Hoher Kontrast: Staff-Linien sind weiß und 1 px; nur im Screenshot gesehen.
- Web: nicht gepusht; Server-Build und Kopieren der Icons nach `static_cdn/assets` stehen aus.
- Der Android-Build wurde nicht gebaut; `capacitor-assets` hat die Ressourcen neu geschrieben (61 Android-Dateien, 4 iOS).

### 16.1 Nachtrag: erste Rückmeldung des Eigentümers

„Das Design ist schon sehr schön“, vier Korrekturen, am selben Tag umgesetzt:

- Pendel: das Gewicht ist wieder eine Scheibe (hohl in Ruhe, blau im Lauf), kein Notenkopf; die Notenzeile dahinter bleibt.
- Notenwerte: Schläge sind Viertelnoten (gefüllter Kopf), im Achtelmodus Achtelnoten mit Fähnchen; hohle Köpfe lasen sich als halbe Noten. Der aktuelle Schlag wird blau und 18 % größer, damit er auch in Monochrom erkennbar bleibt.
- Grid: wieder gefüllte Quadrate (aktuelle Spalte blau) und keine Akzentzeichen mehr; die Stufe (ein, zwei, drei Quadrate) ist der Zustand. Der Umbruch bei neun Spalten bleibt.
- Akzentzeichen: bei Sequence und Polyrhythm stehen „>“ und „^“ mit 4 px Luft über dem Kopf (zweite und dritte Rückmeldung; die erste Fassung hatte sie unter dem Kopf, die zweite ohne Abstand). Pausen sind auf den Ringen kleiner. Auf kleinen Ringen steht die Kreisnummer allein in der Mitte.
- Klick auf einen Schlag schaltet in jedem Modus dieselben Zustände durch (stumm, normal, Akzent, erster Schlag). In Polyrhythm waren die Schläge bisher nicht klickbar; die Ringe sind jetzt Flächen mit einer Auswahltaste darunter, jeder Schlag eine eigene Taste mit Namen für den Screenreader.
- Notenköpfe sind schlanker und stärker geneigt (Verhältnis 1,58, 24°), damit sie nicht als Kreise gelesen werden.

Nachweis wie in 16: 42 von 42 Fälle in jedem Modus und mit neun Schlägen ohne Überlänge; alle Tests grün.


## 17. Release 0.8.0: Score auf allen Geräten (Build 7, Stand 2026-10-25)

Version 0.8.0, `buildNumber` 8. `versionCode` 7 war in der Play Console schon vergeben (Upload abgelehnt am 2026-10-25), daher 8; 8 wurde von der Play Console akzeptiert. Am 2026-10-25 auf `origin/main` gepusht (bis `aff6f60`, einschließlich der Runde-3-Commits); nichts deployt, nichts hochgeladen.

### Nachweise je Ziel

| Ziel | Befehl | Ergebnis |
|---|---|---|
| Tests | `CI=true npx react-scripts test --watchAll=false` | 37 Suiten, 262 Tests grün |
| Layout | `node scripts/measure-layout.mjs --strict --mode M` für normal, contrast, large, colorblind, tritanopia, monochromacy, dazu `--beats 9` | je 42 von 42 Fälle ohne Überlänge |
| Web (lokal) | `REACT_APP_BACKEND_URL=https://libremetronome.com CI=false npm --prefix frontend run build` | läuft durch, `main.5baffe33.js` (107 kB gzip), `main.9d947f7a.css`; bekannte Lint-Warnung in `AccessibilityMenu.js` unverändert |
| Android Build | `npm run mobile:sync`; `./gradlew assembleRelease bundleRelease` (JDK 21, Schlüssel über `LIBREMETRONOME_KEY_PROPERTIES`) | BUILD SUCCESSFUL |
| Android AAB | `jarsigner -verify` | „JAR-Datei verifiziert“; 4 044 322 Byte; `versionName` 0.8.0 aus dem AAB-Manifest |
| Android APK | `aapt2 dump badging/permissions` | `versionCode` 7, `versionName` 0.8.0; einzige Berechtigung ist die app-eigene `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, **kein INTERNET**; 4 246 448 Byte |
| Store-Grafiken | Playwright/Chrome, App im Store-Modus (`androidBridge` gesetzt, keine Donate-Links) | `docs/store/feature-graphic-1024x500.png`; `docs/store/screenshots/` mit 5 Telefon- (1236 x 2415) und 2 Tablet-Bildern (1536 x 2048) |
| iOS (Gerät) | `xcodebuild … -destination id=<iPad> -allowProvisioningUpdates` mit freiem Personal Team; `devicectl device install app`, `process launch` | BUILD SUCCEEDED, Installation und Start gemeldet |
| iOS (Simulator) | `xcodebuild` für iPad Air 13" (M4), `simctl install/launch/io screenshot` | läuft, Hochformat, Analog: `docs/release-0.8.0/ios-ipad-sim-analog-portrait.png` |
| macOS | `macos/build.sh --install --dock` | gebaut, ad hoc signiert, nach `/Applications` installiert, Dock-Eintrag war schon da, Version 0.8.0, Prozess läuft. Dock-Icon-Quelle ist `AppIcon-512@2x.png` aus Commit `c56ea99` (neues Icon); `make-icon.swift` musste nicht geändert werden |
| Linux | nur gelesen | `desktop/icon.png` (512 px) stammt aus `c56ea99`; `main.js` lädt `build/`, das `install.sh` frisch aus `frontend/` baut |

### Nicht geprüft

- **Android auf dem Samsung:** kein Gerät per adb verbunden (`adb devices` leer). Der Emulator `GP_Test` stürzte in dieser Umgebung beim Start ab (Exit 139). Damit fehlen: Installation, Screenshots der fünf Modi und des Dialogs, Homescreen-Icon, Splash, Statusleiste weiß, Tasten 44 px, Lato Light im App-Build, kein Scrollen. Die Telefon-Store-Bilder stammen aus Chrome (412 x 805), nicht vom Gerät.
- `versionCode` direkt aus der AAB gelesen: nicht möglich (`aapt2` öffnet keine AAB, kein `bundletool`); der Wert 7 stammt aus der APK desselben Gradle-Laufs.
- **iPad:** App wurde installiert und gestartet, die Bildschirminhalte auf dem Gerät konnte ich nicht ansehen (kein Screenshot-Weg vom Gerät). Der Zugriff auf das Simulator-Panel war nicht freigegeben, daher gibt es nur einen Simulator-Screenshot im Hochformat, Modus Analog; Modi, Querformat, Statusleiste und Scrollen sind offen. In diesem Screenshot ist die Analog-Ansicht im iPad-Hochformat links unten angeordnet, rechts oben die Bedienung, viel freie Fläche dazwischen: kein Fehler gemeldet, aber ein Punkt zum Ansehen (Design nicht geändert).
- **TestFlight/App Store:** nicht geprüft und nichts angelegt. Xcode listet neben dem Personal Team ein Team vom Typ „Individual“; ob die Mitgliedschaft aktiv ist, lässt sich von hier nicht bestätigen.
- **macOS:** Dock-Badge, Menü, globaler Shortcut und Icon im Dock nicht geprüft; `screencapture` lieferte kein Bild („could not create image from display“), also kein Screenshot. Keine Notarisierung (nicht Teil des Auftrags).
- **Linux:** Paket nicht gebaut, App nicht gestartet.
- **Web live:** nicht deployt; Asset-Hashes, Favicon, `manifest.json`, Audio-Start, Tap Tempo, Tastatur und Fokusring auf dem Server offen.
- Beat-Planung und Audio nicht angefasst, nicht neu gemessen.

### Web-Deploy (Server-Session auf almalinux9, 2026-10-25, Bericht des Eigentümers)

- Checkout `libreMetronome/` unter dem App-Ordner, Stand sauber, `main`, HEAD war `45948c4`. Rollback-Kopie vor dem Deploy angelegt (`release-backups/pre-581143e-…`, 9,6 MB); vorher live: `main.0e8aeeb6.js` / `main.c6eee00a.css`.
- Build erfolgreich, Kopie nach `static_cdn` (assets, js, css, media). Nicht angefasst: sudo, Nginx, Datenbank, Zertifikate, gunicorn, andere Projekte.
- Per HTTP: `/static/js/main.js` und `/static/css/main.css` entsprechen `main.5baffe33.js` und `main.9d947f7a.css`; `/assets/favicon.ico` neu; `/assets/manifest.json` mit `theme_color` `#0072b2`, alle 7 Icons 200.
- Headless Chromium gegen die Live-Seite, 412x805 und 1280x800: 24 von 24 Prüfungen bestanden (fünf Modi ohne Scrollen, AudioContext läuft, Leertaste startet und stoppt, Fokusring 2 px, keine Seitenfehler).
- **Offen 1:** Favicon und Manifest erreichen den Browser nicht, weil das Django-Template `backend/metronome_api/templates/index.html` sie nicht verlinkte (`/favicon.ico` und `/manifest.json` landen bei Django). Fix im Repo (Links, `theme-color`), wirkt erst nach Commit, Pull auf dem Server und gunicorn-Neustart (sudo, Eigentümer).
- **Offen 2:** Das Template lädt `main.js`/`main.css` ohne Hash; Nginx cached JS 7 und CSS 30 Tage, Wiederkehrende sehen bis dahin alte oder gemischte Stände. Fix im Repo: `?v=0.8.0` an beiden Links, bei jedem Release anheben.
- Nicht geprüft: Audio nur technisch (nicht gehört), Fokusring nur am Skip-Link, keine echten Geräte, kein Safari/iOS.

### 17.1 Nachtrag: neues Icon (Richtung A, 2026-10-25)

Das Icon aus Abschnitt 16 gefiel dem Eigentümer nicht. Moodboard mit sechs Richtungen, gewählt: A (weiße Metronom-Silhouette auf Blau `#0072b2`) mit kleinerem Notenkopf als Gewicht (63 x 44 statt 84 x 58 bei 1024 px). Quelle `frontend/assets/icon-source.svg`; daraus wurden neu erzeugt: iOS-, Android- (Vordergrund Silhouette, Hintergrund Blau), PWA-Sets, Favicons, `desktop/icon.png`, `docs/store/icon-512.png`, Splash und die Feature Graphic. Das Dock-Icon der macOS-App war ein Cache-Fall: Die installierte `.icns` war neu, der Dock zeigte aber das alte Icon. Neu registrieren und Dock neu starten halfen nicht; erst das Entfernen des Dock-Eintrags, Leeren der Benutzer-Icon-Caches und erneutes Hinzufügen (`defaults write com.apple.dock persistent-apps`) zeigte das neue Icon, vom Eigentümer am 2026-10-25 bestätigt. Der Eintrag steht danach am Ende der Dock-Leiste.

Nachweis: 37 Suiten grün, `measure-layout.mjs` 42 von 42 ohne Überlänge, AAB neu gebaut und signiert (4 135 640 Byte), APK `versionCode` 7, weiterhin kein INTERNET. Das Gewicht ist bei 32 px nur noch ein Punkt; auf Gerät nicht gesehen. Die Telefon-Screenshots in `docs/store/` enthalten kein Icon und bleiben gültig. Der Server deployt bei jedem Push automatisch (Webhook, `test-webhook.txt`); die Pushes von `b834582` und `b53d639` haben das Live-Deploy ausgelöst, Tor (b) war damit faktisch mit dem Push verbunden. Ergebnis laut Server-Bericht: neues Icon, Template-Links und `?v=0.8.0` live, Favicon und `theme_color` korrekt, fünf Modi, Audio-Start, Leertaste und Fokusring bestanden. Die sieben Manifest-Icons lieferten 404, weil `manifest.json` relative Pfade hatte und unter `/assets/` ausgeliefert wird (schon vor 0.8.0 so). Fix `7bce1f7` (absolute Pfade) ist gepusht; beim letzten Abruf war das Manifest live noch nicht aktualisiert, danach nicht neu geprüft.

### Offen beim Eigentümer

- Play (Tor c): AAB mit `versionCode` 8 am 2026-10-25 vom Eigentümer hochgeladen, gespeichert und veröffentlicht (interner Test). Noch offen: Update auf dem Samsung installieren und prüfen, Samsung anschließen, Simulator-Zugriff freigeben, Manifest auf dem Server prüfen.
