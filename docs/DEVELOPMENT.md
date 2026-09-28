# Entwicklung

Stand: 18. Juli 2026
Dokumentationsstatus: bestätigt für den Repository-Stand
Geltungsbereich: lokale Arbeit, Konventionen, Tests und sichere Änderungsweise

## Voraussetzungen

- Node.js und npm für `browser-sync`, Skripte und Tests.
- Python 3 nur für ausgewählte Automations-/PDF-Skripte.
- Supabase CLI für Migrationen/Functions, wenn eine Aufgabe dies ausdrücklich umfasst.
- SSH/rsync für Website-Deployment.
- Keine Framework-, CMS- oder Bundler-Voraussetzung.

## Installation und Start

```bash
npm install
npm run dev
```

Alternative:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

`npm run dev` startet BrowserSync auf Port 3000 und beobachtet HTML/CSS/JS. Es gibt keinen Produktionsbuild.

## Relevante Befehle

```bash
npm run test:security
npm run test:security:deployment
npm run social:dry
npm run weekly:blog-social
```

- `test:security` führt Live-Negativtests gegen Supabase aus und verändert bei erwartungsgemäßem Verlauf keine Buchungsdaten.
- `test:security:deployment` prüft zusätzlich den produktiven Webroot; Netzwerk/Produktion erforderlich.
- Social-/Automation-Befehle standardmäßig im Dry Run/Vorschau-Modus; Publish-Flags sind externe Zustandsänderungen.

## Umgebungsvariablen

Nur Namen dokumentieren, niemals Werte. Relevante Gruppen:

- Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, kompatible `MY_*`-Varianten.
- Form/Bestätigung/Sponsoring: `REGISTRATION_FORM_SECRET`, `CONFIRMATION_LINK_SECRET`, `SPONSOR_CODE_PEPPER`.
- Admin/Outbox: `ADMIN_FUNCTION_SECRET`, `OUTBOX_PROCESSOR_SECRET`.
- Stripe/Resend: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`.
- Google: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID` sowie Social-OAuth-Variablen aus `.env.social.example`.
- Automation: Namen aus `.env.automation.example`.

Lokale `.env*`-Dateien außer expliziten `*.example`-Vorlagen bleiben gitignored. Secrets nicht in Shell-Historie, Logs, Markdown oder Chat kopieren.

## Dateikonventionen

- Struktur `css/`, `images/`, `fonts/`, `pdf/`, `favicon/`, `ci/`, `scripts/`, `supabase/` beibehalten.
- Keine Dateien umbenennen/verschieben, sofern nicht ausdrücklich beauftragt.
- HTML-Seiten besitzen seitenlokale Skripte; Änderungen gezielt halten und abhängige Flows prüfen.
- CSS-Tokens und bestehende Komponenten wiederverwenden; kein paralleles Designsystem.
- Deno/TypeScript-Functions teilen sicherheitskritische Hilfen aus `supabase/functions/_shared/`.
- Migrationen sind zeitgestempelt, additiv und gemeinsam mit Function-Versionen zu betrachten.
- Keine großen Refactorings, Minifizierung oder Buildkette allein für Stilvereinheitlichung einführen.

## Änderungsablauf

1. `PROJEKT-HANDBUCH.md`, `docs/PROJECT.md`, Fachdatei und `docs/OPEN-QUESTIONS.md` lesen.
2. Git-Wurzel, Status, Remote und geltende Anweisungen prüfen.
3. betroffene Seiten, Funktionen, Datenobjekte und Deploymentgrenzen untersuchen.
4. Wiederverwendung und Risiken benennen; bei Mehrdateiänderung Dateiliste nennen.
5. minimal umsetzen; fremde Änderungen schützen.
6. Syntax, Funktionen, Negativpfade und Desktop/Mobil prüfen.
7. Fachdoku, `docs/DECISIONS.md` bei Entscheidung, `CHANGELOG.md` und offene Punkte pflegen.
8. nur aufgabenbezogene Dateien selektiv stagen, Staging-Diff prüfen, committen und Upstream pushen, sofern keine Ausnahme greift.

## JavaScript- und Fehlerregeln

- Nutzerwerte vor HTML-Injektion escapen; vorhandene `escapeHtml`/`esc`-Hilfen nutzen.
- Keine Service-Role oder andere Secrets in Browsercode.
- Netzwerkfehler verständlich zeigen, aber keine sensiblen Rohantworten ausgeben.
- Doppelklick/Replay, Ladezustand, Timeout, Offline und Wiederholung berücksichtigen.
- Browserzustände in `localStorage` sind gerätegebunden und keine serverseitige Wahrheit.
- Payment-/Statuslogik nicht allein clientseitig entscheiden.

## Datenbank- und Function-Regeln

- Vor Migration Live-Schema/Policies prüfen; vollständiges Ursprungsschema liegt nicht im Repo.
- Öffentliche Functions validieren Token, Rate Limit und Eingaben selbst.
- Admin-Functions benötigen Adminprüfung oder bewusstes serverseitiges Geheimnis.
- Stripe-Webhook benötigt Signatur, Idempotenz, UUID-, Währungs- und Betragsprüfung.
- Dry Run vor Backfill/Import/Publish; Apply nur nach Ergebnisprüfung.
- Sponsor/Firma niemals in Elternzahlungslogik fallen lassen.

## Testumfang nach Risiko

- reine Doku: Links, Pfade, Markdown, Secretscan, Diff.
- Website-Inhalt/CSS: lokale Vorschau, Desktop/Mobil, Tastatur, Konsole, Links, SEO/Schema.
- Formular: Token, Validierung, Fehler, Campstatus, Sponsorpfad, E-Mail/Outbox, Bestätigung.
- Zahlung: Stripe-Test, Webhook, Betrag/Währung/ID, terminale Zustände und Dashboard.
- Admin: Auth/Allowlist, Filter/KPIs, Statusaktionen, Audit, Queue/Offline.
- Deployment: Allowlist-Dry-Run, Backup, interne Pfade, Smoke-URLs.

## Verwandte Dokumente

- [`QA-CHECKLIST.md`](QA-CHECKLIST.md)
- [`DEPLOYMENT.md`](DEPLOYMENT.md)
- [`ARCHITECTURE.md`](ARCHITECTURE.md)
