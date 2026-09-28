# TALENTEXPERTE – Projekt- und Betriebshandbuch

Stand: 20. Juli 2026
Dokumentationsstatus: bestätigt für den Repository-Stand; Live-Betriebsdaten sind nicht enthalten
Geltungsbereich: Fußballschule TALENTEXPERTE, Website, Anmeldung, Camp-Betrieb, Zahlungen, Kommunikation und Social Media

## 1. Zweck und Verbindlichkeit

Dieses Handbuch ist der zentrale Einstieg für alle Arbeiten am Projekt. Es beschreibt nicht nur den Code, sondern auch die fachlichen Regeln und den sicheren Betriebsablauf.

Bei widersprüchlichen Angaben gilt diese Reihenfolge:

1. Aktueller Produktionszustand in Supabase und Stripe
2. Aktueller Code und aktuelle Migrationen im Repository
3. Dieses Handbuch
4. Spezialisierte Runbooks
5. Historische Status-, Audit- und Kampagnendokumente

Die fachlich gegliederte Entwicklungsdokumentation liegt unter `docs/`. Die Bewertung und Rangfolge vorhandener Dokumente steht in `docs/DOCUMENTATION-INVENTORY.md`. Bei Widersprüchen zwischen diesem Handbuch und einer Fachdokumentation darf keine Angabe stillschweigend überschrieben werden; aktueller Code und live geprüfte Systemdaten entscheiden.

Camp-Termine, Preise, Kapazitäten, Zahlungsstände und Empfängerlisten sind veränderliche Betriebsdaten. Sie müssen vor jeder Aktion live geprüft werden. Historische Zahlen aus Markdown-Dateien sind keine aktuelle Auskunft.

## 2. Die wichtigste Betriebsregel: Zahlungsdaten

### Verbindliche Quellen

Für die Frage „Wer hat bezahlt?“ oder „Wer muss erinnert werden?“ sind ausschließlich diese Systeme maßgeblich:

1. **Supabase**: kanonische Anmeldung und zugeordneter Zahlungsstatus
2. **Admin-Dashboard**: operative Ansicht auf dieselben Supabase-Daten
3. **Stripe**: tatsächliche Online-Zahlung und Payment Intent

**Google Drive, Google Sheets, Google Kontakte, Gmail, CSV-Exporte und alte Berichte sind keine Zahlungsquelle.** Sie dürfen nicht verwendet werden, um offene Forderungen abschließend festzustellen.

### Kanonische Definition einer offenen Elternzahlung

Eine Erinnerung darf nur versendet werden, wenn alle Bedingungen erfüllt sind:

```text
anmeldungen.payer_type = 'parent'
anmeldungen.parent_payment_status = 'open'
anmeldungen.parent_amount_euro > 0
gültige E-Mail-Adresse vorhanden
Anmeldung gehört zum gewünschten Camp
```

Zusätzlich muss vor einem Sammelversand geprüft werden, ob Stripe zwischenzeitlich eine erfolgreiche Zahlung enthält, die noch nicht nach Supabase synchronisiert wurde. Der Legacy-Wert `zahlungsstatus='offen'` allein reicht nicht aus.

Sponsor- und Firmenanmeldungen erhalten niemals eine Eltern-Zahlungserinnerung:

- Sponsor: `payer_type='sponsor'`, `parent_amount_euro=0`, `parent_payment_status='not_required'`
- Firma: `payer_type='company'`, Elternzahlung nicht erforderlich

### Standardablauf für Zahlungsprüfung und Erinnerung

Bei einzelnen Rückfragen von Eltern ist der vollständige, reproduzierbare Ablauf in [`docs/PAYMENT-INQUIRY-WORKFLOW.md`](docs/PAYMENT-INQUIRY-WORKFLOW.md) verbindlich. Der produktive Supabase- und Stripe-Operationszugang ist für dieses Repository bestätigt; bei einer neuen Zahlungsrückfrage wird der Live-Abgleich direkt begonnen, ohne den Nutzer erneut nach vorhandenen Zugängen zu fragen. Eine fehlende Anmeldung im Browser-Dashboard ist kein Abbruchgrund, solange der verknüpfte Supabase-Zugang und der geschützte Stripe-Zugang funktionieren.

1. In Supabase bzw. im Admin-Dashboard exakt das Camp auswählen.
2. Nur Elternanmeldungen mit offenem Elternzahlungsstatus und positivem Elternbetrag betrachten.
3. Offene Datensätze mit Stripe abgleichen:
   - bevorzugt über die Anmeldungs-ID bzw. `client_reference_id`
   - zusätzlich über Payment Intent, E-Mail, Betrag und Datum, falls eine Altzahlung keine eindeutige ID trägt
4. Erfolgreiche, aber noch nicht synchronisierte Stripe-Zahlungen zuerst korrekt in Supabase nachziehen.
5. Stornierte, erstattete, gesponserte, Firmen- und unklare Fälle ausschließen.
6. Empfängerzahl, Namen, Camp, Betrag und letzte Erinnerung prüfen.
7. Im Admin-Dashboard nur diese Zeilen auswählen und **Zahlungserinnerung** auslösen.
8. Versandresultat prüfen: `sent`, `failed`, `payment_deadline_reminder_sent_at` und `reservation_expires_at`.
9. Fehlgeschlagene Zustellungen in der privaten `email_outbox` prüfen und über **E-Mail-Warteschlange** erneut verarbeiten.
10. Ergebnis mit Anzahl versendet, fehlgeschlagen und bewusst ausgeschlossen dokumentieren.

Nie pauschal „alle offenen“ über alle Camps anschreiben. Campfilter und Zahlungsabgleich sind Pflicht.

### Stripe-Abgleich und Backfill

Der aktuelle Webhook ordnet Zahlungen exakt über die Anmeldungs-ID zu und akzeptiert nur erfolgreiche EUR-Zahlungen mit passendem Betrag. Relevante Function:

- `supabase/functions/stripe-webhook/index.ts`

Historische Stripe-Zahlungen können zunächst im Dry Run geprüft werden. Die benötigten Werte `STRIPE_SECRET_KEY`, `MY_SUPABASE_URL` und `MY_SUPABASE_SERVICE_ROLE_KEY` müssen dabei aus einer geschützten Umgebung kommen:

```bash
node scripts/stripe-backfill-sync.mjs --from YYYY-MM-DD
```

Änderungen erst nach Prüfung und mit sicher bereitgestellten Umgebungsvariablen anwenden:

```bash
MY_SUPABASE_URL=... MY_SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/stripe-backfill-sync.mjs --from YYYY-MM-DD --apply
```

PayPal-Zahlungen werden separat per CSV abgeglichen:

```bash
node scripts/paypal-backfill-sync.mjs --csv /geschuetzter/pfad/Download.CSV
node scripts/paypal-backfill-sync.mjs --csv /geschuetzter/pfad/Download.CSV --apply
```

Wichtig:

- In `anmeldungen` heißt das Legacy-Feld `zahlungsstatus`, nicht `status`.
- Ein Apply-Lauf erfolgt nie ohne geprüften Dry Run.
- Service-Role-, Stripe- und Resend-Schlüssel werden nie ausgegeben oder committed.
- Manuelles „Bezahlt“-Setzen ist nur für extern sicher bestätigte Zahlungen wie Bank oder Bar vorgesehen.

## 3. Kurzprofil der Fußballschule

- Marke: **TALENTEXPERTE Fußballschule**
- Angebot: Fußball-Feriencamps in Aachen
- Bestehen: seit 2005
- Erfahrungssignal: mehr als 4.000 Kinder und mehr als 150 Camps
- Zielgruppe: Kinder von 5 bis 14 Jahren, Anfänger bis Vereinsspieler
- Regelzeit: täglich 09:00–15:00 Uhr; Ankunft spätestens 08:45 Uhr
- Inklusive: Training, Spiele/Turniere, Mittagessen, Getränke, Obst, Urkunde, Erinnerungsfoto und Medaille
- Camp-Ort: Kunstrasenplatz am Branderhofer Weg, 52066 Aachen-Burtscheid
- Kontakt: `kontakt@talentexperte.de`
- Telefon/WhatsApp: `+49 1523 4678108`
- Website: `https://www.talentexperte.de`
- Instagram: `https://instagram.com/talentexperte`

Die Geschäftsanschrift steht im Impressum und darf nicht mit dem Camp-Ort verwechselt werden.

## 4. Technische Architektur

```text
Öffentliche Website (HTML/CSS/JS)
  ├─ Eltern-Anmeldung ──────────────┐
  ├─ Firmen-Anmeldung ──────────────┤
  └─ Bestätigung / Zahlungsstart    │
                                    ▼
                         Supabase Edge Functions
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             Supabase DB       Stripe API       Resend API
                    │               │               │
                    └──── Admin-Dashboard ──────────┘
                                    │
                                    └─ optionaler Export/Google-Kontakte-Sync
```

Der öffentliche Browser erhält nur den Supabase-Anon-Key. Personen-, Zahlungs- und Administrationsaktionen sind durch RLS, Admin-Allowlist, signierte Tokens oder serverseitige Edge Functions geschützt.

## 5. Repository und Ordner

Das Projekt ist eine statische Website ohne Framework, Bundler oder CMS.

| Pfad | Zweck |
|---|---|
| `index.html` | Startseite, Camp-Angebot, FAQ, Galerie, strukturierte Daten |
| `anmeldung.html` | Eltern- und Sponsor-Anmeldung, PDF vor Zahlung, Stripe-Übergang |
| `zahlung-start.html` | Sicherer Übergang zum individuellen Stripe-Link |
| `firmen-anmeldung.html` | Nicht zahlungspflichtige Firmen-/Mitarbeiteranmeldung |
| `bestaetigung.html` | Signierte persönliche Bestätigung und statusgerechtes PDF |
| `bestaetigung-firma.html` | Bestätigung für Firmenanmeldung |
| `admin.html` | Internes Dashboard, Finanzen, Anmeldungen, Anwesenheit und Aktionen |
| `css/` | Seitenbezogene Stylesheets und Design-Tokens |
| `fonts/` | Lokal eingebundene Webfonts |
| `images/` | Website-Bilder; Unterordner für Galerie, Social Input/Output und Camps |
| `ci/` | Logos, Jubiläumslogo, Deployment und nginx-Header-Vorlage |
| `pdf/` | FAQ-PDFs für Normal-, Mitarbeiter- und Sponsorfälle |
| `scripts/` | Backfills, Social-/Blog-Automation, Sicherheitstests und Imports |
| `supabase/functions/` | Produktionsnahe Edge Functions |
| `supabase/migrations/` | Datenbank-, RLS- und Sicherheitsänderungen |
| `drafts/` | Lokale Content-Entwürfe; nicht als veröffentlichte Wahrheit behandeln |
| `automation-runs/` | Lokale Laufprotokolle der Content-Automation |

Nicht umbenennen oder verschieben, sofern die Aufgabe es nicht ausdrücklich verlangt. Interne Quellen, Secrets, Runbooks und Automationsdaten dürfen nicht in den öffentlichen Webroot gelangen.

## 6. Corporate Identity und Typografie

### Primäre Gestaltung

- Primärrot: `#e50000`
- Dunkelrot: `#cc0000`
- Tiefrot: `#990000`
- Schwarz: je nach Fläche `#0a0a0a` bis `#1a1a1a`
- Weiß: `#ffffff` bzw. `#f2f2f2`
- Sponsoring-Akzent: Türkis `#20c7b7` / `#0d9488`
- Statusfarben: Grün für bezahlt/verfügbar, Gelb für offen/knapp, Violett für erstattet

### Schriften

- Überschriften/Display: **Bebas Neue**, Gewicht 400
- Fließtext/UI: **Plus Jakarta Sans**, Gewichte 400, 500, 600, 700 und 800
- Fonts liegen lokal in `fonts/` und werden DSGVO-konform über `css/fonts.css` eingebunden.

### Logos

- Standard: `ci/logo.png` bzw. `ci/logo.webp`
- Jubiläumsvariante: `ci/talentexperte-logo-jubilaeum-2005-2025.png`

### Gestaltungsprinzipien

- dunkel, sportlich, hochwertig und kontrastreich
- Rot als klare Handlungsfarbe, nicht als flächige Dauerreizung
- große, kondensierte Headlines; gut lesbarer Bodytext
- echte Campfotos vor generischen Stockmotiven
- mobile Ansicht und Tastaturfokus immer mitprüfen
- Sponsoring klar türkis und ohne Zahlungsaufforderung darstellen
- keine Fantasietexte in KI-Bildern; Text und Logo anschließend kontrolliert setzen

## 7. Sprache, Ton und E-Mail-Stil

### Website und Social Media

- Deutsch, warm, sportlich, vertrauenswürdig und lokal auf Aachen bezogen
- elternnah, aber nicht kitschig oder marktschreierisch
- Nutzen konkret benennen: Betreuung, Freude, Freunde, Teamgeist, Selbstvertrauen und Entwicklung
- keine unbelegten Superlative oder künstliche Verknappung
- in Social-Posts den Verein „JSC BW Aachen“ nicht nennen; als Ort reicht Aachen/Burtscheid bzw. der Camp-Ort

### Geschäftliche E-Mails

- klar, direkt, freundlich und professionell
- kurze Absätze, aktive Sätze, konkrete nächste Handlung
- Namen und passende Anrede verwenden
- keine Emojis, außer der Kontext verlangt sie ausdrücklich
- keine unnötigen Entschuldigungen oder Formulierungen wie „ich wollte mal fragen“
- standardmäßig Betreff und vollständigen Mailtext liefern

### Verbindliche Trennung von TALENTEXPERTE und AIXTRA-WEB

**Bestätigte Betreiberentscheidung, präzisiert am 20. Juli 2026:** TALENTEXPERTE ist in sämtlichen betrieblichen und öffentlichen Vorgängen strikt von AIXTRA-WEB zu trennen. Einzige Ausnahme ist der bestätigte Git-Remote `github.com/aixtraweb/talentexperte.de`, der als korrekter Repository-Speicher verwendet wird.

- TALENTEXPERTE-Kommunikation darf ausschließlich über eindeutig TALENTEXPERTE zugeordnete Konten und Identitäten erfolgen.
- AIXTRA-WEB darf weder als Absender, Anzeigename, Reply-To, Signatur, Hauptempfänger, technischer Fallback noch als zwischengeschaltetes Konto erscheinen.
- Insbesondere darf `kontakt@aixtra-web.de` niemals als Absender, Alias, Reply-To, Weiterleitung oder technischer Versandweg für TALENTEXPERTE verwendet werden.
- Die Trennung gilt ebenso für Social Publishing, Cloud-Speicher, Google-Dienste, Zahlungsdienste, Hosting, Connectoren, API-Projekte, Exporte und Tests.
- Die Git-Ausnahme gilt nur für Fetch, Pull und Push dieses Repositorys. Sie begründet keine Freigabe für irgendeinen anderen AIXTRA-WEB-Dienst oder eine sichtbare AIXTRA-WEB-Identität.
- Vor jeder externen Aktion ist die im Zielsystem tatsächlich aktive Identität zu prüfen. Dateiinhalte, Empfängerfelder oder Signaturen können einen falschen Systemabsender nicht korrigieren.
- Wenn ausschließlich ein AIXTRA-WEB-Zugang verfügbar ist, wird die TALENTEXPERTE-Aktion nicht ausgeführt. Zuerst muss der korrekte TALENTEXPERTE-Zugang verbunden oder der vorgesehene TALENTEXPERTE-Systemweg genutzt werden.
- Eine Versand- oder Veröffentlichungsfreigabe autorisiert nur die Aktion, niemals die Nutzung eines fachfremden Kontos.

Für TALENTEXPERTE-E-Mails gilt als Mindestprüfung unmittelbar vor dem Versand:

1. Absenderadresse gehört zu TALENTEXPERTE; für die bestehende Camp-Kommunikation ist `kontakt@talentexperte.de` belegt.
2. Anzeigename lautet passend zur Marke, beispielsweise `TALENTEXPERTE Fußballschule`.
3. Reply-To und Signatur enthalten ausschließlich TALENTEXPERTE-Angaben.
4. Empfänger stammen aus der live geprüften TALENTEXPERTE-Datenquelle und werden bei Sammelmails datenschutzgerecht adressiert.
5. Testzustellung und finale Nachricht zeigen keine AIXTRA-WEB-Identität.
6. Bei jeder Abweichung wird der Versand vor dem Senden gestoppt.

Zahlungserinnerungen werden in der Sie-Ansprache versendet. Sie nennen Kind, Camp, Zeitraum, offenen Betrag, sicheren Zahlungslink und persönlichen Bestätigungslink.

## 8. Camp-Daten und Aktualität

Camp-Daten werden in der Supabase-Tabelle `camps` gepflegt. Relevante Felder sind insbesondere:

- `id`
- `name`
- `datum_von`, `datum_bis`
- `uhrzeit_von`, `uhrzeit_bis`
- `ort`, `adresse`
- `preis_euro`, ggf. `fruehbucher_preis`
- `stripe_link`
- `status`
- Kapazität/Verfügbarkeit

Die öffentliche Camp-Auswahl liest aus `camp_verfuegbarkeit_public`. Vor Änderungen an Website, Schema.org, Social Posts, Erinnerungen oder PDFs müssen Campname, Datum, Dauer, Preis und Status gegen Supabase und die sichtbare Website geprüft werden.

Aktuell auf der Website für 2026 ausgewiesen:

- Sommercamp I: 20.07.–23.07.2026, 4 Tage
- Sommercamp II: 24.08.–27.08.2026, 4 Tage
- Herbstcamp I: 19.10.–22.10.2026, 4 Tage
- Herbstcamp II: 26.10.–29.10.2026, 4 Tage

Diese Liste ist ein dokumentierter Stand, keine dauerhafte Datenquelle.

## 9. Anmeldungsarten und Finanzierungslogik

### Elternzahlung

- Quelle: `anmeldungen`
- `payer_type='parent'`
- `parent_payment_status`: `open`, `paid`, `cancelled`, `refunded`
- `parent_amount_euro` ist der von Eltern zu zahlende Betrag
- Legacy-Spiegel: `zahlungsstatus` mit `offen`, `bezahlt`, `storniert`, `erstattet`

### Vollständiges Sponsoring

- Quelle: `anmeldungen`
- `payer_type='sponsor'`
- `parent_amount_euro=0`
- `parent_payment_status='not_required'`
- separater `sponsor_amount_euro` und `sponsor_settlement_status`
- keine Stripe-Weiterleitung, keine Eltern-Zahlungserinnerung
- Legacy-`zahlungsstatus='bezahlt'` bedeutet hier nicht, dass Eltern gezahlt haben

### Firma/Mitarbeiter

- kanonische Quelle: `firmen_anmeldungen`
- im Dashboard als `FIRMA` gekennzeichnet
- keine Elternzahlung und nicht Teil von Eltern-Umsatz oder offenen Elternforderungen
- historische Mirrorzeilen in `anmeldungen` dürfen nicht doppelt gezählt werden

### Storno und Erstattung

- Stornieren ist der Standard, weil Historie und Anwesenheitsbezug erhalten bleiben.
- Löschen ist nur für echte Fehleinträge gedacht und doppelt zu bestätigen.
- Codegebundene Sponsorplätze werden aus Nachweisgründen nicht gelöscht.
- Stripe-Erstattungen laufen ausschließlich über `admin-payment-action`; der Datenbankstatus wird erst nach erfolgreicher Stripe-Erstattung geändert.

## 10. Anmelde- und Bestätigungsworkflow

### Eltern-/Sponsor-Anmeldung

1. Browser lädt Camp-Verfügbarkeit.
2. Formular holt ein kurzlebiges, signiertes Anti-Spam-Token.
3. `register` prüft Honeypots, Zeitfenster, Rate Limit, Daten und Camp.
4. Bei Sponsorcode werden Code, Camp und Einmal-Einlösung serverseitig geprüft.
5. Anmeldung wird gespeichert.
6. Eine signierte, ID-gebundene Bestätigung wird erzeugt.
7. Resend verschickt die Bestätigung; bei Fehlern greift die Outbox.
8. Nur bei Elternzahlung wird ein Stripe-Link mit `client_reference_id=<anmeldung_id>` erzeugt.
9. `zahlung-start.html` übergibt sicher an Stripe.
10. Stripe-Webhook setzt die exakt zugeordnete Anmeldung auf bezahlt.

### Firmen-Anmeldung

1. `firmen-anmeldung.html` nutzt `company-register`.
2. Anti-Spam-, Token- und Servervalidierung greifen wie beim Elternformular.
3. Die kanonische Firmenanmeldung wird gespeichert.
4. Eltern-/Mitarbeiterzahlung ist nicht erforderlich.
5. Bestätigungsseite und passendes FAQ-PDF werden angeboten.

### Bestätigungslinks und PDFs

- Buchungs-ID allein reicht nicht; der Link benötigt ein gültiges, gespeichertes Token.
- Tokens sind an Datensatz und Laufzeit gebunden.
- Vor Zahlung zeigt das Eltern-PDF klar „Zahlung ausstehend“.
- Nach Zahlung zeigt die Bestätigung „bezahlt“.
- Sponsorbestätigung und Sponsor-PDF zeigen „vollständig gesponsert / keine Zahlung erforderlich“ und enthalten keinen Stripe-Link.
- FAQ-Dateien:
  - `pdf/faq-camps.pdf`
  - `pdf/faq-camps-mitarbeiter.pdf`
  - `pdf/faq-camps-sponsoring.pdf`

## 11. Admin-Dashboard

Das Dashboard unter `admin.html` ist die operative Oberfläche für:

- Camp- und Kapazitätsübersicht
- private Camp-Aufgaben mit Priorität, Fälligkeit, Erledigt-Status und optionaler Verknüpfung zur Anmeldung
- Eltern-, Sponsor- und Firmenanmeldungen
- private Zahlungs-KPIs und Umsatz
- Camp-, Status-, Sponsor- und Suchfilter
- CSV-Export
- manuelle Erfassung und Bearbeitung
- Bezahlt/Storniert/Erstattet
- Sammelauswahl, Reminder und Löschung
- Sponsorabrechnungsstatus
- Anwesenheit pro Camptag
- Sprint-, Torschuss- und Dribblingwerte
- Verarbeitung der E-Mail-Warteschlange

Zugriff erhalten nur Supabase-Auth-Konten, die in `dashboard_admins` aktiv freigeschaltet sind. Die Sitzung endet nach 30 Minuten Inaktivität. Aufgaben liegen privat in `admin_todos`, sind durch dieselbe Allowlist geschützt und werden über `security_audit_log` journalisiert. Anwesenheitsänderungen besitzen eine Offline-Warteschlange und werden bei wiederhergestellter Verbindung übertragen.

## 12. Zahlungserinnerungen

Aktuelle Function: `supabase/functions/send-reminder/index.ts`

Sicherheits- und Versandregeln:

- nur authentifizierte Dashboard-Admins
- maximal 50 IDs pro Aufruf
- serverseitige erneute Filterung auf echte offene Elternzahlungen
- Campname und Campdaten aus Supabase
- persönlicher sicherer Stripe- und Bestätigungslink
- Absender: `TALENTEXPERTE Fußballschule <kontakt@talentexperte.de>`
- Reply-To: `kontakt@talentexperte.de`
- Betreff: `Zahlung erforderlich: Platz bis [Datum] sichern – [Camp] | TALENTEXPERTE`
- erfolgreicher Versand setzt `payment_deadline_reminder_sent_at` und `reservation_expires_at`; der kompatible Legacy-Zeitstempel `erinnerung_gesendet_am` wird nur gefüllt, wenn dort noch keine frühere Erinnerung dokumentiert ist
- Resend-Fehler werden in `email_outbox` aufgenommen

### Verbindliche Zahlungs- und Freigabefrist

Für neue zahlungspflichtige Elternanmeldungen gilt nach Aktivierung des Workflows:

1. Die Anmeldung hält den Platz zunächst **72 Stunden vorläufig frei** (`payment_due_at`).
2. Ist die Zahlung danach weiterhin offen, erfolgt genau eine Letzterinnerung mit Kind, Camp, Zeitraum, Betrag, persönlichem Zahlungs-/Bestätigungslink und einer konkreten Frist.
3. Die Nachfrist beträgt mindestens **24 Stunden ab erfolgreichem Versand** (`reservation_expires_at`). Ein Outbox-Fehler startet die Freigabefrist ausdrücklich noch nicht.
4. Direkt vor Erinnerung und Freigabe gleicht `process-payment-deadlines` offene Datensätze nochmals mit Stripe ab; ein späterer Outbox-Retry wiederholt den Abgleich unmittelbar vor dem Versand. Schlägt der Stripe-Abgleich fehl oder ist eine Zahlung nicht eindeutig, wird weder erinnert noch freigegeben.
5. Bleibt die Zahlung bis zur genannten Frist offen, wird die Anmeldung auf `cancelled`/`storniert` gesetzt und mit `released_due_to_nonpayment_at` gekennzeichnet. Erst dadurch wird der Platz wieder in der Campkapazität verfügbar.
6. Sponsor- und Firmenanmeldungen sind ausgeschlossen. Am ersten Camptag und danach erfolgt keine automatische Stornierung.

Bestehende offene Elternanmeldungen werden beim Rollout zunächst nur für die neue Erinnerung fällig. Sie erhalten die eindeutige Letztfrist und werden nicht ohne diese Nachricht rückwirkend storniert.

Der Automationslauf benötigt `PAYMENT_DEADLINE_PROCESSOR_SECRET`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, Supabase-URL und Service Role. Migration, Functions, Secrets und der geplante Aufruf sind getrennt zu aktivieren und anschließend mit kontrollierten Testdaten zu prüfen. Ein Git-Push aktiviert diesen Prozess nicht.

Ein Mailto-Fallback ist für die verbindliche Letztfrist nicht zulässig, weil individuelle Frist, Betrag und sichere Links sowie der erfolgreiche Versandnachweis fehlen. Bei Function- oder Versandfehlern wird nicht automatisch freigegeben.

`CAMP-EMAIL-WORKFLOW.md` beschreibt eine historische Wiederholer-Kampagne. Die damalige Einmal-Function ist stillgelegt und darf nicht für Zahlungs- oder Marketingversand reaktiviert werden. Neue Marketingkampagnen benötigen aktuelle Empfängerauswahl, Datenschutzprüfung, Test und explizite Versandfreigabe.

## 13. Google-Export und Kontakte

Google ist ein nachgelagerter Arbeitsweg, nicht das Kernsystem.

- `google-sheet-sync` kann Daten aus Supabase in ein Sheet übertragen.
- `code.gs` synchronisiert neue Zeilen aus dem Sheet in Google Kontakte.
- Kontaktname: Kind
- Organisation: Elternteil
- Notizen: Camp, Geburtsdatum/Alter, Allergien, Erfahrung, Adresse und Status
- Label: `TALENTEXPERTE`

Der Sync dient Kontaktpflege und Kommunikation. Er ersetzt weder Supabase noch Stripe und beweist keinen aktuellen Zahlungsstand. In Kontaktnotizen vorhandene Beträge/Status können veraltet sein.

## 14. Social Media und Content-Produktion

**Betriebspause seit 05.09.2026 auf ausdrücklichen Nutzerwunsch:**
Sommercamp-/TALENTEXPERTE-Instagram- und Facebook-Posts vorläufig einstellen.
Keine Wiederaufnahme aus alten Saisonplänen oder Freigaben. Vier Codex-Aufgaben
und vier LaunchAgents sind pausiert; [Nachweis und Grenzen](docs/SOCIAL-PAUSE-2026-09-05.md).

### Kanäle

- Instagram
- Facebook Page
- Google Unternehmensprofil
- Website/Blog

### Ordner und Dateien

- Rohmaterial: `images/social-input/`
- fertige Visuals: `images/social-output/`
- Pläne: `drafts/social-plan/`
- Social-Entwürfe: `drafts/social/`
- Blog-Entwürfe: `drafts/blog/`
- Veröffentlichung: `scripts/social-publish.mjs`
- wöchentliche Produktion: `scripts/weekly-blog-social.mjs`
- Sommercamp-Planung/Freigabe: `scripts/sommercamp-plan.mjs`, `scripts/sommercamp-approve.mjs`, `scripts/sommercamp-publish-approved.mjs`

### Formate

- Instagram/Facebook Feed: 1080 × 1350, 4:5
- Story/Reel: 1080 × 1920, 9:16
- Google Unternehmensprofil: 1080 × 1080, 1:1

### Content-Leitlinien

- echte Bilder, natürliche Gesichter und authentische Camp-Atmosphäre
- Fokus auf Kinderfreude, Betreuung, Teamgeist, Selbstvertrauen und praktische Elterninformationen
- Daten, Preise, Altersangaben und CTA vor Freigabe prüfen
- Alt-Text, CTA und plattformspezifische Caption mitliefern
- keine wiederholten Standard-Captions
- keine automatische Live-Veröffentlichung ohne ausdrücklich aktivierten Publish-Modus

### Standardbetrieb

```bash
npm run weekly:blog-social
npm run social:dry
npm run social:publish
```

`social:publish` verändert externe Kanäle und darf nur mit eindeutiger Freigabe bzw. bewusst aktivierter Automation ausgeführt werden. Zugangsdaten liegen in `.env.social` und werden nie committed.

## 15. SEO, GEO und strukturierte Daten

Wichtige Ziele:

- lokale Auffindbarkeit für „Fußballcamp Aachen“, „Feriencamp Aachen“ und „Fußballschule Aachen“
- konsistente Organisation-, Orts-, Event- und FAQ-Angaben
- hilfreiche, konkrete Inhalte für Eltern und KI-Suchsysteme
- korrekte Canonicals, Sitemap, robots.txt und `llms.txt`
- gute mobile Darstellung, Performance und Barrierearmut

Bei Campänderungen sind mindestens diese Stellen abzugleichen:

- sichtbare Campkarten in `index.html`
- JSON-LD Events in `index.html` und `anmeldung.html`
- Supabase `camps`
- Anmeldeauswahl
- Sitemap/Detailseiten, falls betroffen
- Social- und Content-Pläne

SEO-/GEO-Audits sind Momentaufnahmen. `FULL-AUDIT-REPORT.md`, `ACTION-PLAN.md` und `SEO-UMSETZUNGSBASIS.md` liefern Hintergrund, aber der aktuelle Code entscheidet, ob ein Punkt noch offen ist.

## 16. Sicherheit und Datenschutz

- Keine personenbezogenen Anmeldedaten in öffentliche Dateien, Logs, Git-Commits oder Chat-Antworten kopieren.
- Keine Service-Role-, Stripe-, Resend-, OAuth- oder Sponsor-Geheimnisse ausgeben.
- Öffentliche Keys nicht mit geheimen Keys verwechseln.
- RLS und `dashboard_admins` begrenzen den Zugriff auf Personen-/Finanzdaten.
- Formulare nutzen Token, Honeypots, Rate Limits und serverseitige Validierung.
- Sponsorcodes werden gehasht gespeichert; Klartextlisten bleiben außerhalb des Repositories.
- Bestätigungslinks sind signiert und ID-gebunden.
- Stripe-Webhooks werden signaturgeprüft und in `stripe_webhook_events` journalisiert.
- E-Mail- und Sicherheitsjournale sind nicht öffentlich.
- Stornieren ist aus Nachweisgründen meist besser als Löschen.
- CSV-Exporte mit personenbezogenen Daten nur geschützt speichern und nach Zweckfortfall löschen.

Sicherheitsdetails: `SECURITY-IMPLEMENTATION.md`, `SPAM-SCHUTZ-DOKUMENTATION.md`, `SPONSORING-RUNBOOK.md`.

## 17. Entwicklung, Tests und Deployment

### Lokal starten

```bash
npm install
npm run dev
```

Alternative:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

### Prüfungen

```bash
npm run test:security
npm run test:security:deployment
```

Zusätzlich je nach Änderung:

- Desktop und Mobile visuell prüfen
- Formular- und Fehlerpfade testen
- Browser-Konsole kontrollieren
- signierten Bestätigungslink in privatem Fenster testen
- bei Zahlungsänderungen Stripe-Test und Supabase-Status abgleichen
- bei E-Mails Testzustellung und Outbox prüfen

### Website-Deployment

```bash
./ci/deploy.sh
```

Das Script:

1. erstellt ein Server-Backup,
2. deployed nur eine explizite Allowlist öffentlicher Dateien,
3. prüft, dass interne Quellen nicht im Webroot liegen,
4. behält die letzten drei Backups.

Ziel:

- Host: `r20.hostingwerk.de`
- User: `medina-82`
- Webroot: `/srv/www/medina-82/public/talentexperte`
- Backups: `/srv/www/medina-82/backups/talentexperte/`

Ein Git-Push ist kein Deployment. Ein Website-Deployment ist keine Freigabe für Supabase-Migrationen, E-Mail-Versand oder Social Publishing.

### Git-Abschluss

- Arbeitsbaum und Remote vorab prüfen.
- Nur aufgabenbezogene Dateien stagen; nie `git add .` oder `git add -A` in einem Dirty Worktree.
- Staging-Diff prüfen.
- Relevante Tests ausführen.
- Committen, aktuellen Branch zu seinem Upstream pushen und Sync-Status prüfen.

## 18. Spezial-Runbooks und Dokumentenindex

| Dokument | Verwendung |
|---|---|
| `RUNBOOK.md` | schnelle Fehlerdiagnose für Anmeldung, Zahlung, Dashboard und Anwesenheit |
| `SECURITY-IMPLEMENTATION.md` | Sicherheitsarchitektur, Deploy-Stand und Rollbackhinweise |
| `SPONSORING-RUNBOOK.md` | Sponsorcodes, Import, Abnahme und Abrechnung |
| `SPAM-SCHUTZ-DOKUMENTATION.md` | Formularschutz und RLS-Härtung |
| `STRIPE-SUPABASE-STATUS.md` | historischer Reparatur-/Statusbericht, nicht aktueller Zahlungsstand |
| `CAMP-EMAIL-WORKFLOW.md` | historischer Wiederholer-Kampagnenbericht, nicht aktueller Reminderweg |
| `GOOGLE-REVIEW-WORKFLOW.md` | Review-Anfragen nach abgeschlossenem Camp |
| `SOCIAL-PUBLISHING-SETUP.md` | Meta-/Google-Zugänge und Publisher |
| `BLOG-SOCIAL-AUTOMATION.md` | lokale Wochenautomation |
| `SOCIAL-CONTENT-PLAN.md` | Content-Leitlinien und Materialauswahl |
| `FULL-AUDIT-REPORT.md` | historisches SEO-/GEO-Audit |
| `SEO-UMSETZUNGSBASIS.md` | SEO-Umsetzungsgrundlage |
| `docs/PROJECT.md` | Projektprofil, Ziele, Grenzen und Quellenrang |
| `docs/ARCHITECTURE.md` | technische Architektur und Datenflüsse |
| `docs/DATA-MODEL.md` | Datenobjekte, Finanzstatus und Invarianten |
| `docs/DESIGN-SYSTEM.md` / `docs/COMPONENTS.md` | CI, responsive Regeln und Komponenten |
| `docs/CONTENT-GUIDE.md` | Website-, Social- und E-Mail-Inhalte |
| `docs/SEO-GEO.md` / `docs/STRUCTURED-DATA.md` | Suchsichtbarkeit und strukturierte Daten |
| `docs/DEVELOPMENT.md` / `docs/DEPLOYMENT.md` / `docs/QA-CHECKLIST.md` | Entwicklung, Veröffentlichung und Abnahme |
| `docs/INTEGRATIONS.md` | externe Systeme und Schnittstellen |
| `docs/DECISIONS.md` / `docs/OPEN-QUESTIONS.md` | verbindliche Entscheidungen und offene Klärungen |
| `docs/DOCUMENTATION-INVENTORY.md` | geprüfte Bewertung der gesamten Dokumentation |
| `docs/PAYMENT-INQUIRY-WORKFLOW.md` | verbindlicher Live-Abgleich einzelner Zahlungsrückfragen in Supabase, Stripe und Dashboard |

## 19. Standard-Checklisten für künftige Aufgaben

### „Welche Eltern haben noch nicht bezahlt?“

- [ ] Camp in Supabase eindeutig identifiziert
- [ ] nur `payer_type='parent'`
- [ ] nur `parent_payment_status='open'`
- [ ] nur `parent_amount_euro>0`
- [ ] Stripe auf verspätete/nicht synchronisierte Zahlung geprüft
- [ ] Storno, Erstattung, Sponsor und Firma ausgeschlossen
- [ ] Ergebnis ohne unnötige personenbezogene Details berichtet

### „Bitte Zahlungserinnerungen senden“

- [ ] vorherige Zahlungscheckliste vollständig
- [ ] Campfilter gesetzt
- [ ] Namen, E-Mail, Betrag und letzte Erinnerung plausibel
- [ ] Versand im Dashboard bestätigt
- [ ] `sent/failed` kontrolliert
- [ ] Outbox bei Fehlern bearbeitet
- [ ] Versandanzahl und Ausschlüsse dokumentiert

### „Camp aktualisieren“

- [ ] Supabase-Campdaten
- [ ] Website-Campkarten
- [ ] JSON-LD
- [ ] Anmeldung/Verfügbarkeit
- [ ] Stripe-Link und Preis
- [ ] PDFs/FAQ, falls inhaltlich betroffen
- [ ] Social-/Content-Pläne
- [ ] mobile Ansicht und Sicherheitstest

### „Social Post erstellen/veröffentlichen“

- [ ] aktuelles Camp, Datum, Preis und Plätze geprüft
- [ ] echtes, freigegebenes Bild gewählt
- [ ] CI, Format, Safe Zones und Logo geprüft
- [ ] Caption, CTA, Alt-Text und Kanalversionen erstellt
- [ ] Dry Run geprüft
- [ ] externe Veröffentlichung ausdrücklich freigegeben

## 20. Pflege dieses Handbuchs

Das Handbuch wird aktualisiert, wenn sich eine der folgenden Grundlagen ändert:

- System of Record oder Datenmodell
- Zahlungs-, Reminder- oder Bestätigungsworkflow
- neue/entfernte Edge Function
- CI, Typografie oder Markenregeln
- Ordnerstruktur oder Deployment
- Social-Automation oder Kanäle
- Sicherheits- und Datenschutzgrenzen

Reine Tagesstände wie Teilnehmerzahl, offene Zahlungen oder aktuelle Platzanzahl gehören nicht dauerhaft in dieses Handbuch, sondern werden live aus den Produktionssystemen ermittelt.
