# www.talentexperte.de - Projekt-Dokumentation

## Überblick
Dieses Repository enthält den statischen Code für `www.talentexperte.de` (HTML/CSS/JS, Assets, PDFs).

- Kein Build-Tool
- Kein Framework
- Kein CMS

## Projektstruktur
```text
repo/
├── *.html
├── css/
├── images/
├── fonts/
├── pdf/
├── favicon/
├── ci/
│   └── deploy.sh
├── scripts/
│   └── stripe-backfill-sync.mjs
├── supabase/
│   └── functions/
│       └── send-reminder/index.ts
├── README.md
├── CHANGELOG.md
├── RUNBOOK.md
├── STRIPE-SUPABASE-STATUS.md
└── AGENTS.md
```

## Kernseiten und Zweck
- `anmeldung.html`: Eltern-Anmeldung für Selbstzahler und vollständig gesponserte Kinder; Sponsorcodes werden vor dem Absenden gegen Kind und Camp geprüft
- `zahlung-start.html`: sicherer Übergang zur jeweils richtigen Stripe-Zahlung, ohne Buchungstoken in Referrer oder Verlauf offenzulegen
- `firmen-anmeldung.html`: Mitarbeiter-/Firmen-Anmeldung (nicht zahlungspflichtig für Elternteil)
- `bestaetigung.html`: signiert abrufbare Bestätigung für Eltern- und Sponsor-Anmeldungen + statusgerechtes PDF
- `bestaetigung-firma.html`: kurze Bestätigung Firmenanmeldung + PDF-Download mit Logo/Fußzeile + FAQ-Mitarbeiter-PDF
- `admin.html`: Admin-Dashboard (Camps, Anmeldungen, Status, Umsatz, Löschen)

## Supabase Datenfluss (Ist-Stand)
### Tabellen
- `anmeldungen`: private/Eltern-Anmeldungen
- `firmen_anmeldungen`: Mitarbeiter-/Firmen-Anmeldungen
- `sponsoring_partners` und `sponsoring_entitlements`: Partner und einmalig einlösbare, nur gehasht gespeicherte Sponsor-Berechtigungen
- `sponsored_anmeldungen_dashboard`: codefreie Service-Role-View für Sponsor-, Eltern- und Abrechnungsbeträge
- Views wie `alle_anmeldungen` / `alle_anmeldungen_dashboard` können zusätzliche/aggregierte Felder liefern

### Dashboard-Logik
- `Bezahlt/Umsatz`: basiert auf **Privat-Anmeldungen**, nicht auf Mitarbeiter/Firma
- `Offen`: zeigt nur tatsächlich offene, zahlungspflichtige Einträge
- Mitarbeiter-Anmeldungen werden im Status im Dashboard als `FIRMA` dargestellt und nicht als offener Zahlungsfall geführt
- Sponsor-Anmeldungen werden separat als `ÖF`/Sponsor ausgewiesen: Elternbetrag 0 €, Sponsorbetrag und Abrechnungsstatus sind getrennt sichtbar
- Stornierte oder erstattete Sponsor-Fälle zählen nicht als aktive Sponsorplätze oder aktives Sponsorvolumen

### Status-Felder (wichtig)
Je nach Quelle können Felder variieren. Relevante Felder im Projektcode:
- `zahlungsstatus` (Enum, z. B. `offen`, `bezahlt`, `storniert`, `erstattet`)
- `payer_type` (`parent`, `sponsor`, `company`)
- `list_price_euro`, `parent_amount_euro`, `sponsor_amount_euro`
- `parent_payment_status`, `sponsor_settlement_status`, `sponsoring_partner_id`
- optionale Zahlungssignale: `stripe_payment_id`, `zahlung_am`, weitere `stripe_*` / `payment_*` Felder je View

## Admin-Dashboard Funktionen
- Camp-Übersicht und Anmeldungs-Tabelle
- Filter: Camp, Status, Sponsor/Mitarbeiter
- Schnellfilter über Karte `Offen`
- Status-Aktionen: bezahlt / storniert / erstattet
- **Bulk-Auswahl**: Checkbox pro Zeile + "Alle auswählen"
- **Bulk-Aktionen**: Bezahlt setzen, Stornieren, Zahlungserinnerung senden, Löschen
- **Zahlungserinnerung**: Per Resend Edge Function (mit mailto-Fallback)
- **Löschen**: `🗑` in der Tabelle, mit Bestätigung und Reload-Verifikation

Hinweis zu Löschen:
- Erfolgreiches Löschen hängt von RLS-`DELETE`-Policies in Supabase ab
- Falls Einträge nicht verschwinden: Policies für `anmeldungen` und `firmen_anmeldungen` prüfen

## E-Mail-Versand (Resend)
- Edge Function: `supabase/functions/send-reminder/index.ts`
- Absender: `TALENTEXPERTE Fußballschule <kontakt@talentexperte.de>`
- Domain: `talentexperte.de` (DKIM, SPF, DMARC via Resend)
- DNS-Einträge: `dns-eintraege-resend.txt`
- Supabase Secret: `RESEND_API_KEY`
- Deploy: `supabase functions deploy send-reminder --no-verify-jwt`
- DB-Spalte: `erinnerung_gesendet_am` in `anmeldungen` (Timestamp der letzten Erinnerung)

## Bestätigungsseiten und PDFs
- `bestaetigung.html`: sichere Bestätigung nach Anmeldung/Zahlung, PDF mit Logo + Umlauten + Buchungsnr.
- `bestaetigung-firma.html`: kurze Bestätigung Firmenanmeldung + PDF
- PDF-Workflow:
  - Vor Zahlung: `downloadRegistrationPDF()` in `anmeldung.html` — bei Selbstzahlern „ZAHLUNG AUSSTEHEND", bei Sponsor-Fällen „VOLLSTÄNDIG GESPONSERT / 0 €"
  - Auto-PDF: wird beim Klick auf „Jetzt bezahlen" automatisch gespeichert
  - Nach Zahlung: `downloadPDF()` in `bestaetigung.html` — Status „BEZAHLT"
  - FAQ Normal: `/pdf/faq-camps.pdf`
  - FAQ Mitarbeiter: `/pdf/faq-camps-mitarbeiter.pdf`
  - FAQ Sponsoring: `/pdf/faq-camps-sponsoring.pdf`
- Sicherer Bestätigungsabruf: persönlicher, signierter Link mit Buchungs-ID und Token; eine Buchungs-ID allein wird bewusst abgewiesen
- Sponsor-Bestätigung, E-Mail und PDF enthalten weder Zahlungsaufforderung noch Stripe-Link; Zahlungserinnerungen schließen Sponsor-Fälle serverseitig aus

Die Einrichtung und Abnahme des Öcher-Fans-for-Kenger-Workflows (ÖF) ist in `SPONSORING-RUNBOOK.md` beschrieben.

## Google Kontakte Sync
- Script: `code.gs` (Google Apps Script, im Google Sheet hinterlegt)
- Läuft automatisch alle 5 Minuten via Trigger
- Kontakt-Format: **Kind = Name**, **Elternteil = Unternehmen**, Details in Notizen
- Resync aller Kontakte: Funktion `fullResync()` im Apps Script ausführen

## Lokales Testen
Projektpfad:
```text
/Users/alejandromedina/PROJEKTENTWICKLUNG/www.talentexperte.de/repo
```

Einfach per lokalem HTTP-Server testen, z. B.:
```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

## Deployment
Script:
```bash
./ci/deploy.sh
```

Ablauf:
1. Server-Backup
2. `rsync --delete` Deployment
3. Ausschlüsse: `.git`, `.DS_Store`, `ci/`, `steuerberater/`, `.claude/`, `.agents/`, `.agent/`, `.orchids/`, `node_modules/`, `*.bak*`

## Git-Workflow
```bash
git add .
git commit -m "Kurzbeschreibung"
git push
```

## Troubleshooting
### Fall: Dashboard zeigt `Bezahlt = 0` trotz eingegangener Zahlungen
1. Prüfen, ob in `anmeldungen` bezahlte Einträge markiert sind:
```sql
select
  count(*) as total,
  count(*) filter (where zahlungsstatus = 'bezahlt') as status_bezahlt,
  count(*) filter (where stripe_payment_id is not null or zahlung_am is not null) as payment_signal
from public.anmeldungen;
```
2. Falls nötig, Status nachziehen:
```sql
update public.anmeldungen
set
  zahlungsstatus = 'bezahlt',
  zahlung_am = coalesce(zahlung_am, now())
where
  (stripe_payment_id is not null or zahlung_am is not null)
  and zahlungsstatus is distinct from 'bezahlt';
```

## Server
- Host: `r20.hostingwerk.de`
- User: `medina-82`
- Document Root: `/srv/www/medina-82/public/talentexperte`
- Backup-Pfad: `/srv/www/medina-82/backups/talentexperte/`
