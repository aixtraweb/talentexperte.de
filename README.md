# TALENTEXPERTE – Website und Camp-Plattform

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
- `RUNBOOK.md` – schnelle Fehlerdiagnose
- `SECURITY-IMPLEMENTATION.md` – Sicherheitsarchitektur und Betriebsstand
- `SPONSORING-RUNBOOK.md` – Sponsorcodes und gesponserte Plätze
- `SPAM-SCHUTZ-DOKUMENTATION.md` – Formularschutz
- `SOCIAL-PUBLISHING-SETUP.md` – Social-Publishing
- `BLOG-SOCIAL-AUTOMATION.md` – wöchentliche Content-Automation

Das Projekt verwendet kein Framework, keinen Bundler und kein CMS. Struktur und Dateinamen bleiben grundsätzlich erhalten.
