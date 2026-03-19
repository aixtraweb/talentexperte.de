# Changelog

## 2026-03-19

### Steuerberater / Stripe-Belegarchiv

- `steuerberater/stripe-sync.js` — wiederverwendbares Node.js-Script für den monatlichen Stripe-Datenexport
  - Lädt Charges + Balance Transactions für einen beliebigen Monat oder Datumsbereich
  - Erstellt pro Monat: `stripe-zahlungen-YYYY-MM.csv`, `stripe-kontoauszug-YYYY-MM.csv`, `ZUSAMMENFASSUNG-YYYY-MM.txt`, Einzelbelege als JSON
  - Aufruf: `node stripe-sync.js` (Vormonat), `node stripe-sync.js 2025-06` (einzelner Monat), `node stripe-sync.js 2024-01 2024-12` (Bereich)
- `steuerberater/.env` — STRIPE_SK (Secret Key, gitignored)
- Historische Daten vollständig exportiert (Aug 2023 – März 2026): 289 Zahlungen, 33.725,00 € Bruttoumsatz, 674,50 € Stripe-Gebühren (als Betriebsausgaben absetzbar)
- Crontab-Eintrag gesetzt: läuft am **1. jeden Monats um 02:07 Uhr**, lädt automatisch den Vormonat
  - Log: `~/Library/Logs/stripe-sync.log`
- `.gitignore` ergänzt: `steuerberater/` ausgeschlossen (keine Belege im Repo)

## 2026-03-05

### Bestätigung / PDF-Workflow (Eltern-Kommunikation)
- **Kritischer Bugfix:** `bestaetigung.html` war abgebrochen (Zeile 384, `doc.save()` fehlte) → komplette Neuerstellung, PDF-Download jetzt funktionsfähig.
- `ci/logo.png` in beide PDFs (vor und nach Zahlung) integriert.
- Deutsche Umlaute (ä, ö, ü, ß) in PDFs korrekt dargestellt (ISO-8859-1 Encoding-Helper).
- **Auto-PDF beim Stripe-Klick:** Wenn Eltern auf „Jetzt bezahlen" klicken, wird das PDF automatisch gespeichert, danach Weiterleitung zu Stripe.
- Pre-Payment-PDF ergänzt: Eltern können Anmeldedaten bereits vor der Zahlung herunterladen (gelber Statusbalken „ZAHLUNG AUSSTEHEND").
- Buchungsnummer wird im Success-Overlay von `anmeldung.html` prominent angezeigt.
- Buchungsnummer-Lookup auf `bestaetigung.html`: Wenn localStorage leer (anderes Gerät / Browser), kann die Bestätigung per vollständiger UUID erneut abgerufen werden.
- Backups angelegt: `anmeldung.html.bak`, `bestaetigung.html.bak`.

### Google Kontakte Sync (`code.gs`)
- Kontakt-Format geändert: **Kind als Name**, **Elternteil als Unternehmen** (vorher: Elternteil als Name).
- Eingehende Anrufe zeigen jetzt Kindname + Elternname im Unternehmsfeld.
- `fullResync()`-Funktion ergänzt: löscht alle TALENTEXPERTE-Kontakte, setzt Synced-Spalte zurück, liest alle Zeilen neu ein.
- `deleteAllTalentexperteContacts()`: Stapelweises Löschen per People API (max. 500 pro Request).
- `resetSyncedColumn()`: Setzt alle „JA"-Einträge auf leer für erneuten Sync-Durchlauf.

## 2026-02-12

### Anmeldung / Firmenprozess
- `firmen-anmeldung.html` an Live-Schema von `firmen_anmeldungen` angepasst.
- Insert-Flow stabilisiert (inkl. kompatibler Feldzuordnung).
- Firmenanmeldungen werden als nicht-zahlungspflichtig behandelt.

### Bestätigung / PDF
- `bestaetigung-firma.html` auf kurze, klare Bestätigung reduziert.
- Professionelle PDF-Ausgabe ergänzt:
  - Logo aus `ci/logo.png`
  - strukturierte Footer-Angaben (Kontakt + Trainingsadresse)
- FAQ-Download für Mitarbeiter ergänzt: `/pdf/faq-camps-mitarbeiter.pdf`
- FAQ-Download für normale Anmeldungen ergänzt: `/pdf/faq-camps.pdf`

### Admin-Dashboard
- Datenzusammenführung aus Supabase-Quellen robuster gemacht.
- Statistik-Karten für `Bezahlt`, `Offen`, `Umsatz` mit Fokus auf zahlungspflichtige Privat-Anmeldungen.
- Mitarbeiter-Filter (`👔 Mitarbeiter`) ergänzt.
- Offen-Schnellfilter über Stat-Karte verbessert.
- **Löschfunktion** ergänzt (`🗑`), inkl. Sicherheitsabfrage und Reload-Verifikation.

### Betrieb / Debugging
- SQL-Troubleshooting für ENUM-Feld `zahlungsstatus` dokumentiert.
- Hinweise zu RLS-Policies für `DELETE` ergänzt.
