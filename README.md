# TALENTEXPERTE – Website und Camp-Plattform

Stand: 18. Juli 2026
Dokumentationsstatus: bestätigt für den Repository-Stand
Geltungsbereich: technischer Einstieg und Dokumentennavigation

Statische Website für `www.talentexperte.de` mit Supabase-Backend, Stripe-Zahlungen, Resend-E-Mails, Admin-Dashboard und Social-/Blog-Automation.

## Vor jeder Aufgabe lesen

Das zentrale [Projekt- und Betriebshandbuch](PROJEKT-HANDBUCH.md) beschreibt Architektur, Dateien, CI, Typografie, Anmeldung, Zahlungen, Erinnerungen, Admin, Social Media, Sicherheit, Tests und Deployment.

Die wichtigste operative Regel:

> Zahlungsstände werden ausschließlich in Supabase/Admin-Dashboard und Stripe geprüft. Google Drive, Google Sheets, Google Kontakte, Gmail, CSVs und alte Berichte sind keine verbindlichen Zahlungsquellen.

## Schnellstart

```bash
npm install
npm run dev
```

Sicherheitsprüfung:

```bash
npm run test:security
```

Website-Deployment:

```bash
./ci/deploy.sh
```

## Wichtige Dokumente

- `PROJEKT-HANDBUCH.md` – zentrale fachliche und technische Dokumentation
- `docs/PROJECT.md` – Projektprofil, Ziele, Grenzen und Quellenrang
- `docs/ARCHITECTURE.md` – Systemarchitektur und kritische Datenflüsse
- `docs/DATA-MODEL.md` – bestätigte Datenobjekte, Statuslogik und Invarianten
- `docs/DESIGN-SYSTEM.md` und `docs/COMPONENTS.md` – CI, responsive Regeln und Bestandskomponenten
- `docs/CONTENT-GUIDE.md` – Sprache, Inhalte und nicht zu erfindende Angaben
- `docs/SEO-GEO.md` und `docs/STRUCTURED-DATA.md` – Suchsichtbarkeit und Schema.org
- `docs/DEVELOPMENT.md`, `docs/DEPLOYMENT.md` und `docs/QA-CHECKLIST.md` – Umsetzung, Veröffentlichung und Abnahme
- `docs/INTEGRATIONS.md` – Supabase, Stripe, Resend und Google-Dienste
- `docs/DECISIONS.md` und `docs/OPEN-QUESTIONS.md` – dauerhafte Entscheidungen und ungeklärte Punkte
- `docs/DOCUMENTATION-INVENTORY.md` – Bewertung aller vorhandenen Markdown-Dateien
- `RUNBOOK.md` – schnelle Fehlerdiagnose
- `SECURITY-IMPLEMENTATION.md` – Sicherheitsarchitektur und Betriebsstand
- `SPONSORING-RUNBOOK.md` – Sponsorcodes und gesponserte Plätze
- `SPAM-SCHUTZ-DOKUMENTATION.md` – Formularschutz
- `SOCIAL-PUBLISHING-SETUP.md` – Social-Publishing
- `BLOG-SOCIAL-AUTOMATION.md` – wöchentliche Content-Automation

Das Projekt verwendet kein Framework, keinen Bundler und kein CMS. Struktur und Dateinamen bleiben grundsätzlich erhalten.

Historische Audit-, Status-, Kampagnen- und Wochenplan-Dateien sind Kontext, aber keine aktuelle Betriebsquelle. Ihre Einordnung steht in `docs/DOCUMENTATION-INVENTORY.md`.
