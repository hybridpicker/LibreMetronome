# LibreMetronome als App in Google Play und im App Store

Stand: 2026-10-22. **Anleitung für den Eigentümer, nur Vorbereitung.** Noch nichts gebaut, kein Konto angelegt, keine App-Kennung belegt, nichts hochgeladen. Ältere Notizen: [mobile-deployment.md](mobile-deployment.md) (Entwicklungs-Build am iPad), [release-plan.md](release-plan.md) (Web und App Store, Stand 2026-09-05).

**Keine Rechtsberatung.** Store-Regeln stehen unten mit Quelle und Lesedatum (Abschnitt 11). Was daraus rechtlich folgt (GPL, Verbraucherrecht, DSGVO), ist nicht geprüft.

## 0. Kurzfassung

| Frage | Empfehlung |
|---|---|
| Weg | **Capacitor 8** weiterführen (schon eingebaut: `frontend/ios`, `frontend/android`, `capacitor.config.ts`). Die React-App wird mit allen Klängen in die App gepackt und läuft **ohne Server**. |
| Konten | Die schon vorhandenen Konten des Eigentümers: Google Play „Schoensgibl.com“ (privat, verifiziert) und Apple-Einzelmitgliedschaft (Aktivierung ausstehend). Keine neuen Konten. |
| App-Kennung | Vorschlag: `com.hybridpicker.libremetronome` beibehalten (steht schon im Code). Unumkehrbar ab dem ersten Upload, Entscheidung des Eigentümers (Abschnitt 3). |
| Name im Store | „LibreMetronome“ (Vorschlag; Untertitel z. B. „Metronom für Übung und Unterricht“) |
| Daten | Keine Konten, keine Analyse, keine Werbung, kein Server nötig: Ziel „Keine Daten erhoben“ in beiden Stores |
| Spenden-Knopf | in den Apps **ausblenden** (Stripe-Link widerspricht den Zahlungsregeln beider Stores, Abschnitt 6) |
| Testphase | Play: interner Test → geschlossener Test mit mind. 12 Personen über 14 Tage → Produktion. Apple: TestFlight → App-Prüfung |
| Kosten | keine zusätzlichen Gebühren (Konten bestehen schon), Abschnitt 9 |

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

Befunde aus dem Code, Stand 2026-10-22, nicht auf Geräten geprüft:

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

**Datenschutzerklärung:** Beide Stores verlangen eine öffentlich erreichbare Datenschutz-URL, auch wenn die App nichts erhebt; Apple zusätzlich einen Link **in der App** (Richtlinie 5.1.1(i)). Heute gibt es auf `libremetronome.com` keine Datenschutzseite (im Repo nicht gefunden). Aufgabe: eine Seite anlegen (z. B. `https://libremetronome.com/privacy`) für Webseite **und** Apps, und im Info-Fenster der App verlinken. Inhalt (Vorschlag, vom Eigentümer zu prüfen): wer verantwortlich ist, dass die App keine Konten, keine Analyse und keine Werbung hat, dass Einstellungen (Tempo, Lautstärke, Barrierefreiheit) nur auf dem Gerät gespeichert werden, was der Webserver protokolliert (gilt nur für die Webseite oder für die App, falls sie online nachlädt).

**Apple App Privacy:** Nur auf dem Gerät verarbeitete Daten gelten nicht als „erhoben“. Ohne Netzanfragen: „Data Not Collected“.

**Google Datensicherheit:** Pflicht für jede App außerhalb des internen Tests, auch ohne Datenerhebung. Ohne Netzanfragen: „Keine Daten erhoben, keine Daten weitergegeben“; die Fragen zur Datenlöschung trotzdem beantworten.

**Kontolöschung:** entfällt, die App hat keine Konten (Apple 5.1.1(v) und Google gelten nur für Apps mit Kontoerstellung).

**Exportkontrolle:** siehe Abschnitt 2, Punkt 6.

**EU-Händlerstatus (DSA):** Apple verlangt von jedem Konto eine Erklärung „Händler“ oder „kein Händler“. Händler zeigen Adresse (oder Postfach), Telefon und E-Mail öffentlich auf der Produktseite in der EU. Apple nennt als Anzeichen für Händler u. a. Einnahmen aus der App; Hobby-Apps ohne Absicht zur Vermarktung sind „vielleicht“ keine Händler. Die Erklärung gilt für das ganze Konto, also auch für SPÖ Connect. Google Play hat eine ähnliche Abfrage; die Play-Hilfeseite dazu wurde nicht gefunden **[offen]**. **Entscheidung des Eigentümers**, bei Zweifel mit Beratung.

## 6. Spenden und Zahlungen

Die Webseite hat einen Stripe-Spendenlink (`supportUtils.js`, Spendenseite).

- **Apple:** Trinkgeld an den Entwickler nur über In-App-Kauf (3.1.1). Außerhalb des US-Stores dürfen App und Metadaten keine Knöpfe oder Links zu anderen Zahlungswegen enthalten (3.1.1(a)). Spendensammeln ohne In-App-Kauf nur für anerkannte gemeinnützige Organisationen (3.2.1(vi), 3.2.2(iv)).
- **Google:** Apps dürfen nicht zu anderen Zahlungswegen als Google Play Billing führen (Links, Knöpfe), Ausnahmen u. a. für steuerbefreite Spenden und für Sonderprogramme in bestimmten Ländern. Trinkgeld an Entwickler erwähnt die Seite nicht.

**Empfehlung:** in beiden Apps keinen Spendenlink zeigen. Später optional ein Trinkgeld per In-App-Kauf (Apple) bzw. Play Billing; das macht die App kostenpflichtig im Sinn der Abrechnung (Steuer, Auszahlung, wahrscheinlich Händlerstatus). **Entscheidung des Eigentümers.**

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

1. Play Console (Konto „Schoensgibl.com“): App anlegen (Name, Standardsprache, App, kostenlos). **Ab dem ersten Upload ist die Kennung belegt.**
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
| Store-Provision | 0 | App kostenlos, keine In-App-Käufe |
| Geräte zum Testen | vorhanden (iPad, Android-Emulator) | ein echtes Android-Telefon empfohlen (Audio-Latenz) |

Apple zeigt bei Einzelmitgliedschaften den **bürgerlichen Namen** als Anbieter, Google den Namen des Entwicklerkontos („Schoensgibl.com“).

## 10. Offene Entscheidungen des Eigentümers

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
