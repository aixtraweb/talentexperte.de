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
├── README.md
└── AGENTS.md
```

## Kernseiten und Zweck
- `anmeldung.html`: normale Eltern-Anmeldung (zahlungspflichtig)
- `firmen-anmeldung.html`: Mitarbeiter-/Firmen-Anmeldung (nicht zahlungspflichtig für Elternteil)
- `bestaetigung.html`: Bestätigung normaler Anmeldung + FAQ-PDF
- `bestaetigung-firma.html`: kurze Bestätigung Firmenanmeldung + PDF-Download mit Logo/Fußzeile + FAQ-Mitarbeiter-PDF
- `admin.html`: Admin-Dashboard (Camps, Anmeldungen, Status, Umsatz, Löschen)

## Supabase Datenfluss (Ist-Stand)
### Tabellen
- `anmeldungen`: private/Eltern-Anmeldungen
- `firmen_anmeldungen`: Mitarbeiter-/Firmen-Anmeldungen
- Views wie `alle_anmeldungen` / `alle_anmeldungen_dashboard` können zusätzliche/aggregierte Felder liefern

### Dashboard-Logik
- `Bezahlt/Umsatz`: basiert auf **Privat-Anmeldungen**, nicht auf Mitarbeiter/Firma
- `Offen`: zeigt nur tatsächlich offene, zahlungspflichtige Einträge
- Mitarbeiter-Anmeldungen werden im Status im Dashboard als `FIRMA` dargestellt und nicht als offener Zahlungsfall geführt

### Status-Felder (wichtig)
Je nach Quelle können Felder variieren. Relevante Felder im Projektcode:
- `zahlungsstatus` (Enum, z. B. `offen`, `bezahlt`, `storniert`, `erstattet`)
- optionale Zahlungssignale: `stripe_payment_id`, `zahlung_am`, weitere `stripe_*` / `payment_*` Felder je View

## Admin-Dashboard Funktionen
- Camp-Übersicht und Anmeldungs-Tabelle
- Filter: Camp, Status, Mitarbeiter
- Schnellfilter über Karte `Offen`
- Status-Aktionen: bezahlt / storniert / erstattet
- **Löschen**: `🗑` in der Tabelle, mit Bestätigung und Reload-Verifikation

Hinweis zu Löschen:
- Erfolgreiches Löschen hängt von RLS-`DELETE`-Policies in Supabase ab
- Falls Einträge nicht verschwinden: Policies für `anmeldungen` und `firmen_anmeldungen` prüfen

## Bestätigungsseiten und PDFs
- `bestaetigung.html`: Bestätigung nach Zahlung, PDF mit Logo + Umlauten + Buchungsnr.
- `bestaetigung-firma.html`: kurze Bestätigung Firmenanmeldung + PDF
- PDF-Workflow:
  - Vor Zahlung: `downloadRegistrationPDF()` in `anmeldung.html` — Status „ZAHLUNG AUSSTEHEND"
  - Auto-PDF: wird beim Klick auf „Jetzt bezahlen" automatisch gespeichert
  - Nach Zahlung: `downloadPDF()` in `bestaetigung.html` — Status „BEZAHLT"
  - FAQ Normal: `/pdf/faq-camps.pdf`
  - FAQ Mitarbeiter: `/pdf/faq-camps-mitarbeiter.pdf`
- Buchungsnummer-Lookup: `bestaetigung.html?id=<uuid>` falls localStorage leer

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
3. Ausschlüsse (`.git`, `.DS_Store`, `ci/`)

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
