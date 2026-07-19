# Projektprofil

Stand: 19. Juli 2026
Dokumentationsstatus: teilweise bestätigt
Geltungsbereich: Ziele, Systemgrenzen, Quellenrang und Projektstruktur

## Kurzprofil

- **Bestätigt:** Projekt und Marke: TALENTEXPERTE Fußballschule.
- **Bestätigt:** Produktions-URL: `https://www.talentexperte.de/`.
- **Bestätigt:** Angebot: Fußball-Feriencamps in Aachen für Kinder von 5 bis 14 Jahren, Anfänger bis Vereinsspieler.
- **Bestätigt:** Hauptzielgruppe: Eltern und Erziehungsberechtigte; zusätzliche Strecken bestehen für Firmen/Mitarbeiter und gesponserte Plätze.
- **Bestätigt:** Primäre Conversion: Camp auswählen, Kind anmelden, persönliche Bestätigung erhalten und bei Elternzahlung sicher zu Stripe wechseln.
- **Bestätigt:** Sekundäre Handlungen: Kontakt per Telefon, WhatsApp oder E-Mail; Galerie/FAQ nutzen; Firmen- oder Sponsorstrecke durchlaufen.
- **Bestätigt:** Markenpositionierung im aktuellen Inhalt: lokal, sportlich, vertrauenswürdig, seit 2005, über 4.000 Kinder und über 150 Camps.

> **Offen:** Eine Staging-URL ist im Repository nicht belegt.
> **Vorläufiges Verhalten:** Lokale Vorschau verwenden und Produktionsänderungen nur über die getrennten Deploy-Prozesse ausrollen.
> **Risiko:** Direkte Tests gegen Produktion können echte Daten, E-Mails oder Zahlungen beeinflussen.
> **Erforderliche Klärung:** Staging-Strategie und Testdatenbestand festlegen.

## Projektziele

1. Desktop und mobile Website stabil, schnell und CI-konform betreiben.
2. Lokale SEO- und GEO-Sichtbarkeit für Fußballcamp/Feriencamp/Fußballschule in Aachen stärken.
3. Eltern-, Sponsor- und Firmenanmeldung verständlich, barrierearm und sicher ausführen.
4. Bestätigungen und Zahlungen eindeutig einer Anmeldung zuordnen.
5. Anmeldungen, Teilnahme und Zahlungsstatus im Admin-Dashboard kontrollieren.
6. Kontakte und Inhalte nur nachgelagert und ohne Änderung des Systems of Record synchronisieren.

## Quellenrang

Bei Widersprüchen gilt:

1. **Bestätigt:** aktueller Produktionszustand in Supabase und Stripe für veränderliche Betriebs- und Zahlungsdaten.
2. **Bestätigt:** aktueller Code und aktuelle Migrationen im Repository.
3. **Bestätigt:** [`../PROJEKT-HANDBUCH.md`](../PROJEKT-HANDBUCH.md).
4. **Bestätigt:** Fachdateien unter `docs/` und aktuelle Spezial-Runbooks.
5. **Bestätigt:** historische Audits, Statusberichte, Kampagnen- und Wochenpläne.

Google Drive, Sheets, Kontakte, Gmail, CSV-Exporte und historische Markdown-Zahlen sind keine verbindlichen Zahlungsquellen.

## Technologie und Umgebungen

- **Bestätigt:** Frontend: statisches HTML5, CSS und Browser-JavaScript; kein Framework, CMS oder Bundler.
- **Bestätigt:** lokaler Entwicklungsserver: `browser-sync` über `npm run dev`; Alternative `python3 -m http.server 8080 --bind 127.0.0.1`.
- **Bestätigt:** Backend/Datenbank/Auth: Supabase mit Deno/TypeScript Edge Functions und PostgreSQL/RLS.
- **Bestätigt:** Online-Zahlung: Stripe Payment Links/API/Webhook.
- **Bestätigt:** Transaktions- und Kampagnenmails: Resend mit privater Outbox.
- **Bestätigt:** Google-Nachlauf: Sheets-Export und Apps-Script-Kontaktesync; zusätzlich Social-Publishing-Integration.
- **Bestätigt:** Website-Hosting: Hostingwerk-Ziel ist in `ci/deploy.sh` konfiguriert.
- **Abgeleitet:** Produktion ist die einzige im Repository konkret belegte entfernte Umgebung.

## Produktiv relevante Bereiche

| Bereich | Status | Zweck |
|---|---|---|
| Root-HTML-Dateien | Bestätigt | öffentliche Seiten, Redirect-Stubs, Bestätigung und Admin |
| `css/`, `fonts/`, `images/`, `pdf/`, `favicon/` | Bestätigt | Darstellung und Medien |
| `supabase/functions/`, `supabase/migrations/` | Bestätigt | serverseitige Logik, Schema, RLS und Sicherheit |
| `scripts/` | Bestätigt | Backfills, Imports, Tests und Content-/Social-Automation |
| `ci/` | Bestätigt | Website-Deployment, Logos und Header-Vorlage |
| `code.gs` | Bestätigt | nachgelagerter Google-Kontakte-Sync |
| `docs/` und Root-Runbooks | Bestätigt | verbindliche und historische Dokumentation |

## Nicht als produktive Wahrheit behandeln

- **Bestätigt:** `*.bak`, `*.bak2`, `index Kopie.html`, `.DS_Store`, `.claude/`, `.orchids/`, Logs und lokale Payloads.
- **Bestätigt:** `drafts/`, `automation-runs/` und Social-Plan-Dateien sind Entwürfe/Laufstände.
- **Bestätigt:** `steuerberater/` enthält private Arbeitsdaten und ist vollständig von Git/Deployment ausgeschlossen.
- **Bestätigt:** `.env.social`, `.env.automation`, OAuth-Client-Dateien und ähnliche lokale Dateien sind Geheimnis-/Zugangsdaten und dürfen nicht gelesen, kopiert oder veröffentlicht werden, wenn die Aufgabe dies nicht zwingend und sicher erfordert.
- **Bestätigt:** Rohmedien und nicht referenzierte Originale sind keine automatische Löschfreigabe.

## Einschränkungen und unerwünschte Änderungen

- **Bestätigt:** TALENTEXPERTE und AIXTRA-WEB müssen auf Marken-, Konto-, Absender-, Connector-, Speicher-, Publishing-, Zahlungs-, Hosting- und Kommunikationsebene vollständig getrennt bleiben.
- Keine AIXTRA-WEB-Identität für TALENTEXPERTE-Aktionen verwenden, auch nicht testweise, als Fallback oder bei bereits erteilter allgemeiner Aktionsfreigabe.
- Bei einem ausschließlich als AIXTRA-WEB authentifizierten Dienst jede externe TALENTEXPERTE-Aktion stoppen und den korrekten TALENTEXPERTE-Zugang verlangen.
- Keine erfundenen Camps, Preise, Plätze, Qualifikationen, Bewertungen oder rechtlichen Aussagen.
- Keine Zusammenlegung von Eltern-, Sponsor- und Firmenzahlung.
- Keine direkte Browser-Schreibstrecke in private Tabellen.
- Keine Umgehung von Tokens, Admin-Allowlist, RLS, Stripe-Signatur oder serverseitiger Validierung.
- Keine globale CI- oder Adressvereinheitlichung ohne fachliche Freigabe.
- Kein Git-Push als Ersatz für Website-, Supabase-, E-Mail- oder Social-Deployment behandeln.

## Erfolgskriterien

- Anmeldung, Bestätigung, Zahlung und Admin-Auswertung bleiben eindeutig und negativ getestet.
- Website funktioniert responsiv, mit sinnvoller Tastaturbedienung und ohne neue Konsolenfehler.
- Suchmaschinen erhalten konsistente Canonicals, Metadaten, sichtbare Inhalte und valides JSON-LD.
- Deployment enthält ausschließlich erlaubte öffentliche Artefakte.
- Dokumentation nennt Fakten, Ableitungen, offene Punkte und Empfehlungen getrennt.

## Verwandte Dokumente

- [`ARCHITECTURE.md`](ARCHITECTURE.md)
- [`DATA-MODEL.md`](DATA-MODEL.md)
- [`INTEGRATIONS.md`](INTEGRATIONS.md)
- [`DEVELOPMENT.md`](DEVELOPMENT.md)
- [`DOCUMENTATION-INVENTORY.md`](DOCUMENTATION-INVENTORY.md)
