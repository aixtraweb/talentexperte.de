# Offene Fragen

Stand: 20. Juli 2026
Dokumentationsstatus: offen und priorisiert
Geltungsbereich: ungeklärte Punkte aus Repository- und Dokumentationsinventur

## Produktiver Rollout des Zahlungsfrist-Workflows

- Status: prospektiv produktiv aktiviert; Beobachtung neuer Anmeldungen läuft
- Priorität: hoch
- Betroffener Bereich: Supabase, Stripe, Resend, Anmeldung, Kapazität und Admin-Dashboard
- Aktueller Kenntnisstand: Supabase, Stripe und Resend sind als TALENTEXPERTE bestätigt. Am 20.07.2026 wurden sieben Letzterinnerungen für bereits bestehende Anmeldungen versendet; kein Platz wurde freigegeben. Nach der Klarstellung wurden die Jobs gestoppt und der Workflow prospektiv neu ausgerollt. Die verbindliche Policy-Grenze ist 20.07.2026, 15:15:34 Uhr MESZ. Alle 166 davor vorhandenen Anmeldungen sind ausgeschlossen. Dry-Run und kontrollierter Echtlauf meldeten 0 Kandidaten, 0 Mails und 0 Freigaben; die anonymen Fingerabdrücke der vorhandenen Anmeldungen und Camps blieben unverändert. Beide Jobs sind wieder aktiv.
- Offene Betriebsabnahme: den ersten regulär fälligen Fall einer nach dem Aktivierungszeitpunkt eingegangenen Anmeldung beobachten. Outbox-Fehler, Stripe-Ausfall und uneindeutige Stripe-Zuordnung nur mit Anmeldungen testen, die nach dem Aktivierungszeitpunkt angelegt wurden.
- Gültiges Verhalten: Die Automatik gilt ausschließlich für neue Anmeldungen ab `payment_deadline_policy.active_from`. Bestehende Anmeldungen bleiben unabhängig von bereits gesetzten Workflow-Feldern ausgeschlossen. Offene Bank-/Bar-/PayPal-Zahlungen neuer Anmeldungen müssen vor Ablauf im Admin-Dashboard korrekt als bezahlt bestätigt sein. Am ersten Camptag und danach storniert der Prozessor nicht automatisch.
- Verantwortlich: Supabase-/Stripe-/Resend-Administration und Betrieb
- Datum: 20.07.2026

## Bestandsaudit und Bereinigung aller AIXTRA-WEB-Verknüpfungen

- Status: wartet auf Technik
- Priorität: hoch
- Betroffener Bereich: E-Mail, Tests, Google, Meta, Supabase, Stripe, Hosting, Cloud-Speicher und Connectoren
- Aktueller Kenntnisstand: Die Trennung von TALENTEXPERTE und AIXTRA-WEB ist verbindlich entschieden. Der Git-Remote `github.com/aixtraweb/talentexperte.de` ist als einzige Ausnahme ausdrücklich bestätigt und korrekt. Weiter zu prüfen beziehungsweise zu bereinigen sind der AIXTRA-WEB-Gmail-Connector, AIXTRA-WEB-Testempfänger in `scripts/send-google-review-test.mjs` und historische E-Mail-/Review-Runbooks. `kontakt@aixtra-web.de` darf niemals für TALENTEXPERTE versenden oder als Alias, Reply-To oder Weiterleitung eingesetzt werden.
- Benötigte Entscheidung: Für jeden Dienst eine eigenständige TALENTEXPERTE-Identität, Zuständigkeit und gegebenenfalls Migrationsreihenfolge festlegen; nicht mehr zulässige AIXTRA-WEB-Verbindungen entfernen oder ersetzen.
- Vorläufiges Verhalten: Keine externe TALENTEXPERTE-Aktion über AIXTRA-WEB-Konten ausführen. Insbesondere keine Mails senden, Social-Posts veröffentlichen, Daten hochladen oder Deployments auslösen. Fetch/Pull/Push auf dem bestätigten Git-Remote bleiben als einzige Ausnahme zulässig.
- Verantwortlich: Betreiber/Technik
- Datum: 20.07.2026

## Öffentliche Rohmedien im Deployment

- Status: offen
- Priorität: hoch
- Betroffener Bereich: Deployment, Performance, Datenschutz
- Aktueller Kenntnisstand: `ci/deploy.sh` erlaubt fast den gesamten Ordner `images/`; dort liegen große JPEG/MOV/MP4- und PSD-Dateien.
- Benötigte Entscheidung: Produktionsassets explizit allowlisten oder Rohmedien außerhalb des öffentlichen Medienbaums halten.
- Vorläufiges Verhalten: vor Deploy Dateiliste/Größen prüfen; nichts ungeprüft löschen oder veröffentlichen.
- Verantwortlich: Projektleitung/Technik
- Datum: 18.07.2026

## Rechtliche und betriebliche Adressen

- Status: wartet auf Kunde
- Priorität: hoch
- Betroffener Bereich: Impressum, Datenschutz, Local SEO, Schema
- Aktueller Kenntnisstand: Impressum, Datenschutz und Personen-/Campangaben enthalten unterschiedliche Anschriften; der Camp-Ort ist separat.
- Benötigte Entscheidung: rechtlich korrekte Geschäfts-, Verantwortlichen- und Campanschrift sowie zulässige Schema-/NAP-Darstellung bestätigen.
- Vorläufiges Verhalten: keine globale Vereinheitlichung; bestehende Rechtstexte nur mit Freigabe ändern.
- Verantwortlich: Betreiber/rechtliche Prüfung
- Datum: 18.07.2026

## Aktueller Live-Stand von Camps und Preisen

- Status: wartet auf Technik
- Priorität: hoch
- Betroffener Bereich: Website, Anmeldung, JSON-LD, `llms.txt`, Social
- Aktueller Kenntnisstand: Repository nennt feste 2026-Termine und häufig 149 EUR; Supabase ist verbindlich.
- Benötigte Entscheidung: Live-Abgleich und Pflegeprozess für alle duplizierten Darstellungen.
- Vorläufiges Verhalten: vor jeder Veröffentlichung Supabase und sichtbare Website prüfen.
- Verantwortlich: Betrieb/Technik
- Datum: 18.07.2026

## Vollständiges Supabase-Basisschema

- Status: wartet auf Technik
- Priorität: hoch
- Betroffener Bereich: Datenmodell, Migrationen, RLS
- Aktueller Kenntnisstand: Repository-Migrationen beginnen im Juli 2026 und bilden die ursprüngliche Anlage der Kernobjekte nicht vollständig ab.
- Benötigte Entscheidung: geheimnisfreien Schema-only-Dump oder Baseline-Migration versionieren.
- Vorläufiges Verhalten: vor Schemaarbeit Live-`information_schema`, Constraints und Policies prüfen.
- Verantwortlich: Supabase-Administration
- Datum: 18.07.2026

## Sponsor-/Gutschein-Rollout Juli 2026

- Status: wartet auf Technik
- Priorität: hoch
- Betroffener Bereich: Sponsoring, Anmeldung, Migration/Function-Deploy
- Aktueller Kenntnisstand: historische Dokumente nennen offene Deploy-/Import-Schritte; Sicherheitsdokumentation nennt spätere Produktionsdeploys. Import-/Abnahmestand ist nicht eindeutig belegt.
- Benötigte Entscheidung: Live-Migrationen, Functions, Partnername, Berechtigungsimport und Testfall in Supabase prüfen.
- Vorläufiges Verhalten: keine Codes ausgeben/importieren und keinen Rolloutstatus behaupten.
- Verantwortlich: Supabase-Administration/Projektleitung
- Datum: 18.07.2026

## Hosting-Security-Header

- Status: wartet auf Technik
- Priorität: hoch
- Betroffener Bereich: Hosting, Security, SEO
- Aktueller Kenntnisstand: CSP-Meta ist aktiv; nginx-Header-Vorlage liegt vor; `SECURITY-IMPLEMENTATION.md` nennt Hosting-Freigabe als offen.
- Benötigte Entscheidung: Live-Header prüfen und Hostingprofil kontrolliert freigeben.
- Vorläufiges Verhalten: CSP-Meta beibehalten; Headerstatus nicht als erledigt ausgeben.
- Verantwortlich: Hosting-Administration
- Datum: 18.07.2026

## Consent für Drittanbieter

- Status: wartet auf Kunde
- Priorität: mittel
- Betroffener Bereich: Datenschutz, Elfsight, Leaflet/Carto, Social
- Aktueller Kenntnisstand: externe Ressourcen werden lazy geladen; eine bestätigte Consent-Entscheidung ist nicht dokumentiert.
- Benötigte Entscheidung: rechtliche Bewertung und gegebenenfalls Consent-/Fallback-Konzept.
- Vorläufiges Verhalten: keine weiteren Tracker/Drittanbieter ergänzen; Datenminimierung und Fallbacks beibehalten.
- Verantwortlich: Betreiber/Datenschutz
- Datum: 18.07.2026

## Browser- und Geräte-Support

- Status: offen
- Priorität: mittel
- Betroffener Bereich: QA, Formulare, Admin
- Aktueller Kenntnisstand: responsive Regeln und iPad-Nutzung sind belegt, aber keine Mindestversionen.
- Benötigte Entscheidung: verbindliche Browsermatrix und reale Testgeräte.
- Vorläufiges Verhalten: aktuelle Safari/iOS, Chrome/Android, Chrome/Firefox Desktop und reales iPad testen.
- Verantwortlich: Projektleitung/QA
- Datum: 18.07.2026

## Staging-/Testumgebung

- Status: offen
- Priorität: mittel
- Betroffener Bereich: Entwicklung, Supabase, Stripe, E-Mail
- Aktueller Kenntnisstand: keine Staging-URL oder getrennte Testdatenbank im Repository belegt.
- Benötigte Entscheidung: sichere Staging- und Testdatenstrategie.
- Vorläufiges Verhalten: lokale Vorschau; Stripe-Testmodus und kontrollierte Datensätze; keine unbeabsichtigten Live-Mails.
- Verantwortlich: Projektleitung/Technik
- Datum: 18.07.2026

## Google-/Meta-Publishing-Zugänge

- Status: wartet auf Technik
- Priorität: mittel
- Betroffener Bereich: Social Publishing
- Aktueller Kenntnisstand: Setup- und Authskripte vorhanden; historische Unterlagen belegen keinen aktuellen Live-Zugang.
- Benötigte Entscheidung: API-Freigaben, App-Review, Tokenrotation und Verantwortlichkeit prüfen.
- Vorläufiges Verhalten: Dry Run/Vorschau; kein Publish ohne explizite Freigabe.
- Verantwortlich: Social-/Technikverantwortung
- Datum: 18.07.2026

## Aufbewahrung privater Journale

- Status: wartet auf Kunde
- Priorität: mittel
- Betroffener Bereich: Datenschutz, Betrieb
- Aktueller Kenntnisstand: `security_audit_log`, `email_outbox`, Webhook- und Sync-Journale enthalten Betriebs-/teils personenbezogenen Kontext; Löschfristen sind nicht belegt.
- Benötigte Entscheidung: Aufbewahrungs- und Löschkonzept.
- Vorläufiges Verhalten: Zugriff streng privat; nichts exportieren oder pauschal löschen.
- Verantwortlich: Betreiber/Datenschutz/Supabase-Administration
- Datum: 18.07.2026

## Sitemap- und Live-SEO-Messwerte

- Status: wartet auf Technik
- Priorität: niedrig
- Betroffener Bereich: SEO/GEO
- Aktueller Kenntnisstand: Sitemap-`lastmod` ist älter als mehrere Codeänderungen; aktuelle Search-Console/CWV-Werte wurden nicht geprüft.
- Benötigte Entscheidung: Pflegeprozess und neue Baseline-Messung.
- Vorläufiges Verhalten: historische Auditwerte klar als Momentaufnahme kennzeichnen.
- Verantwortlich: SEO/Technik
- Datum: 18.07.2026
