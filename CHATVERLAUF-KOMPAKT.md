# TALENTEXPERTE – komprimierter Projekt- und Chatverlauf

Stand: 17. Juli 2026

Zweck: Schneller Wiedereinstieg in das Projekt, ohne frühere Chats oder lange Statusdokumente erneut lesen zu müssen.

## 1. Kurzfassung

TALENTEXPERTE ist eine statische Website für Fußball-Feriencamps in Aachen. Die öffentliche Website arbeitet mit Supabase für Camps und Anmeldungen, Stripe für Online-Zahlungen, Resend für E-Mails und einem internen Admin-Dashboard für Betrieb, Anwesenheit und Controlling.

Der aktuelle Schwerpunkt ist die zuverlässige Weiterentwicklung der gesamten Strecke:

- responsive Website für Desktop und Mobilgeräte
- SEO und GEO
- sichere und verständliche Anmeldung
- persönliche Bestätigung an Eltern
- nachgelagerte Übernahme in Google Kontakte
- vollständiges Anmeldungs- und Zahlungscontrolling im Admin-Dashboard
- korrektes Zusammenspiel von Supabase und Stripe

Das verbindliche Einstiegsdokument ist `PROJEKT-HANDBUCH.md`. Diese Datei ersetzt das Handbuch nicht, sondern komprimiert den bisherigen Projektverlauf und verweist auf die jeweils zuständige Dokumentation.

## 2. Verbindliche Entscheidungen

1. **Zahlungsstände:** Ausschließlich Supabase beziehungsweise das Admin-Dashboard und Stripe sind verbindlich. Gmail, Google Drive, Google Sheets, Google Kontakte, CSV-Dateien und historische Markdown-Berichte sind keine Zahlungsquellen.
2. **Live-Daten:** Campdaten, Preise, Kapazitäten, Anmeldungen und Zahlungen müssen vor operativen Aktionen live geprüft werden. Werte in dieser Zusammenfassung sind keine dauerhafte Wahrheit.
3. **Datenschutz:** Keine personenbezogenen Anmeldedaten, Zugangsdaten, Sponsorcodes oder signierten Links in Chats, Dokumentation oder Git übernehmen.
4. **Anmeldungsarten:** Elternzahlung, Sponsoring und Firmenanmeldung sind fachlich getrennte Fälle. Sponsor- und Firmenanmeldungen dürfen keine Eltern-Zahlungserinnerung erhalten.
5. **Historie erhalten:** Stornieren ist grundsätzlich besser als Löschen. Löschen ist nur für echte Fehleinträge vorgesehen.
6. **Veröffentlichung:** Git-Push, Website-Deployment, Supabase-Deployment, E-Mail-Versand und Social Publishing sind voneinander getrennte Aktionen und jeweils separat zu prüfen.

## 3. Bisheriger Projektverlauf

### Februar bis März 2026 – Anmeldung, Zahlungen und Admin

- Eltern- und Firmenanmeldung, Bestätigungsseiten und PDF-Abläufe wurden aufgebaut.
- Google-Kontakte-Sync wurde als nachgelagerter Prozess ergänzt.
- Stripe-/Supabase-Zahlungsabgleich, Backfill-Werkzeuge und Resend-Versand wurden eingeführt beziehungsweise gehärtet.
- Das Admin-Dashboard erhielt manuelle Erfassung, Bearbeitung, Zahlungsaktionen, Filter, Sammelaktionen und Anwesenheitsfunktionen.
- Anwesenheits- und Leistungsdaten wurden um eine lokale Offline-Warteschlange und automatische Session-Erneuerung ergänzt.

### April 2026 – Betriebsstabilität

- Die Offline-Queue wurde auf Mehrgeräte- und Wiederanmeldeverhalten geprüft.
- Firmenbezeichnungen wurden normalisiert.
- Verwaiste Anwesenheitsdatensätze nach gelöschten Anmeldungen führten zur Betriebsregel „stornieren statt löschen“.

### Mai 2026 – Content und Automation

- Blog- und Social-Automationen sowie Planungs-, Freigabe- und Publishing-Skripte wurden ergänzt.
- Veröffentlichung bleibt freigabepflichtig; Dry Runs sind der Standard vor externen Aktionen.

### Juli 2026 – Sicherheit, Gutscheine und Website-Stabilität

- Anmeldung, Bestätigungslinks, RLS, Sponsor-/Gutscheinlogik und Payment-Zuordnung wurden sicherheitstechnisch gehärtet.
- Die Gutscheinprüfung wurde codegebunden und im Formular automatisiert.
- Abgelaufene Camps wurden im Formular und in strukturierten Daten korrekt behandelt.
- Ein RLS-bedingter Ausfall der öffentlichen Camp-Verfügbarkeit wurde behoben.
- Das fehlerhafte externe Bewertungswidget wurde durch einen nativen, responsiven und indexierbaren Bewertungsbereich ersetzt und live geprüft.
- Das zentrale `PROJEKT-HANDBUCH.md` wurde als verbindliche Betriebs- und Entwicklungsgrundlage eingeführt.

Details und genaue Änderungsnachweise stehen in `CHANGELOG.md` und in der Git-Historie.

## 4. Aktueller dokumentierter Stand

- Aktueller Branch bei Erstellung: `codex/security-hardening-workflows`
- Letzter dokumentierter Commit: `c51e73b` – zentrales Projekt- und Betriebshandbuch
- Lokale, bereits vorhandene Fremdänderung: `AGENTS.md`; diese Änderung wurde bei der Komprimierung nicht verändert.
- Die Sicherheitsprüfungen und das Deployment des nativen Bewertungsbereichs waren laut `CHANGELOG.md` am 13. Juli 2026 erfolgreich.
- Das Projekt verwendet weiterhin HTML, CSS und JavaScript ohne Framework, Bundler oder CMS.

## 5. Offene Punkte und notwendige Verifikation

Die folgenden Punkte stammen teilweise aus älteren Statusdateien. Vor einer Umsetzung muss zuerst im aktuellen Code und gegebenenfalls in Supabase oder Stripe geprüft werden, ob sie noch offen sind.

### Betrieb und Daten

- Gutschein-/Sponsor-Deployment, Migration und Import aus dem Juli-Verlauf auf tatsächlichen Produktionsstand prüfen.
- Stripe-Webhook und neue echte Zahlungen weiterhin stichprobenartig gegen Supabase kontrollieren.
- Anwesenheitsdaten aus einem historischen Google Sheet nur bei weiter bestehendem Bedarf übernehmen.
- Optionalen CSV-Export für Anwesenheits- und Leistungsdaten bewerten.
- Verwaiste `teilnahme`-Datensätze kontrolliert behandeln; keine Anmeldungen zur Bereinigung vorschnell löschen.

### Website, SEO und GEO

- Punkte aus `ACTION-PLAN.md` nicht ungeprüft als offen übernehmen; viele Einträge können durch spätere Änderungen bereits erledigt sein.
- Prioritär aktuellen Code und Live-Seite auf Performance, strukturierte Daten, lokale Entity-Konsistenz, Inhalte der Anmeldung und mobile Darstellung prüfen.
- Historische SEO-Scores und Auditwerte nur als Ausgangspunkt verwenden.

### Dokumentationspflege

- `todo.md` ist zuletzt auf den 29. März 2026 datiert und daher nur historischer Backlog.
- `STRIPE-SUPABASE-STATUS.md` ist ein Reparaturbericht, kein aktueller Zahlungsstand.
- Bei grundlegenden Änderungen zuerst `PROJEKT-HANDBUCH.md` aktualisieren; Tagesstände gehören nicht dauerhaft in Markdown-Dateien.

## 6. Dokumenten-Navigation

| Bedarf | Zuständiges Dokument |
|---|---|
| Projektregeln, Architektur und Betrieb | `PROJEKT-HANDBUCH.md` |
| Lokaler Einstieg | `README.md` |
| Fehlerdiagnose | `RUNBOOK.md` |
| Chronologischer Änderungsnachweis | `CHANGELOG.md` |
| Sicherheitsarchitektur | `SECURITY-IMPLEMENTATION.md` |
| Formular- und Spam-Schutz | `SPAM-SCHUTZ-DOKUMENTATION.md` |
| Sponsoring und Gutscheine | `SPONSORING-RUNBOOK.md` |
| Historischer Stripe-/Supabase-Reparaturstand | `STRIPE-SUPABASE-STATUS.md` |
| SEO-/GEO-Ausgangslage | `FULL-AUDIT-REPORT.md`, `SEO-UMSETZUNGSBASIS.md` |
| Historische SEO-Maßnahmenliste | `ACTION-PLAN.md` |
| Social Publishing | `SOCIAL-PUBLISHING-SETUP.md` |
| Blog-/Social-Automation | `BLOG-SOCIAL-AUTOMATION.md` |

## 7. Empfohlener Einstieg in eine neue Arbeitssitzung

1. `PROJEKT-HANDBUCH.md` vollständig lesen.
2. `git status --short`, aktuellen Branch und Remote prüfen.
3. Die für die konkrete Aufgabe zuständigen Runbooks lesen.
4. Historische offene Punkte gegen aktuellen Code und Live-Systeme verifizieren.
5. Änderungen minimal und aufgabenbezogen umsetzen.
6. Passende Tests, mobile Prüfung und gegebenenfalls Dry Runs ausführen.
7. Nur aufgabenbezogene Dateien stagen, Diff prüfen, committen und zum Upstream pushen.
8. Deployment oder externe Aktionen nur ausführen, wenn sie ausdrücklich zur Aufgabe gehören.

## 8. Empfohlene Skills

Je nach nächster Aufgabe sind insbesondere diese Skills sinnvoll:

- `frontend-design` oder `redesign-existing-projects` für visuelle und responsive Website-Arbeit
- `seo-audit`, `technical-seo-checker` und `ai-seo` für SEO-/GEO-Prüfungen
- `content-quality-auditor` und `geo-citability` für Inhalte und KI-Zitierfähigkeit
- `schema-markup-generator` für strukturierte Daten
- `contao-static-converter` nur bei Arbeiten an einem tatsächlichen Contao-zu-Static-Workflow
- `gmail:gmail` nur bei ausdrücklich angeforderten E-Mail-Aufgaben

## 9. Abgrenzung dieser Zusammenfassung

Diese Datei enthält keine vollständigen Chatprotokolle, keine personenbezogenen Daten und keine geheimen Werte. Sie verdichtet den aus Projektunterlagen, Git-Historie und aktuellem Projektkontext nachvollziehbaren Arbeitsstand. Bei Widersprüchen gilt die im `PROJEKT-HANDBUCH.md` festgelegte Quellenreihenfolge.
