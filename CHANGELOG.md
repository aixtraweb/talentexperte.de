# Changelog

## 2026-03-31 (Sitzung 2)

### Admin-Dashboard: Offline-Queue + Session Auto-Refresh (`admin.html`)

**Problem:** Trainerdaten (Sprint/Torschuss/Dribbling, Anwesenheit), die auf dem iPad während des Camps eingetragen wurden, gingen verloren — weil entweder die WLAN-Verbindung fehlte oder die Supabase-Session abgelaufen war (401 → automatischer Logout).

**Lösung — Offline Write Queue:**
- Jede Änderung (Checkbox, Metrik) wird **zuerst in `localStorage` persistiert** (`teilnahme_q`) bevor der Server kontaktiert wird
- Bei fehlender Verbindung (`navigator.onLine === false`) bleibt der Eintrag in der Queue, das UI reagiert normal (optimistisches Update)
- `window.addEventListener('online', flushQueue)` — sobald WLAN zurückkommt, werden alle ausstehenden Writes automatisch an Supabase gesendet
- Mehrere Offline-Änderungen am selben Kind werden gemergt (letzter Wert gewinnt pro Feld)
- Beim nächsten Seitenaufruf / Login wird die Queue sofort geflusht (`setTimeout(flushQueue, 1500)` in `showDashboard`)
- `loadTeilnahme()` legt Queue-Daten über DB-Daten (lokal ist immer neuer als der letzte DB-Stand)

**Lösung — Session Auto-Refresh:**
- Token-Ablaufzeit (`expires_in`) wird bei Login in `localStorage` gespeichert
- `doRefreshToken()` erneuert den Token per `grant_type=refresh_token`
- `setInterval` ruft Refresh automatisch alle **50 Minuten** auf (Token läuft nach 1h ab)
- Bei einem 401-Fehler im Upsert: einmaliger Refresh-Versuch + Retry — kein sofortiger Logout mehr
- `ensureFreshToken()` prüft vor jedem Upsert ob der Token < 2 Min vor Ablauf steht

**Lösung — Sync-Indikator:**
- Neuer `<span id="syncIndicator">` neben dem Aktualisieren-Button im Anwesenheits-Tab
- **✓ Gespeichert** (grün) — alle Daten in Supabase
- **⏳ N ausstehend** (gelb, pulsierend) — Offline-Queue nicht leer

**Multi-Device-Sicherheit (iPad + Office gleichzeitig):**
- Jedes Feld (Sprint, Torschuss, Dribbling) wird einzeln gesendet — überschreibt nie Felder anderer Geräte
- `Prefer: resolution=merge-duplicates` auf PostgREST-Ebene stellt sicher, dass nur die tatsächlich gesendeten Spalten aktualisiert werden

## 2026-03-31

### Admin-Dashboard: Anwesenheit in Anmeldungen-Tab integriert (`admin.html`, `css/admin.css`)
- **Anwesenheits-Checkboxen direkt in der Haupttabelle**: Wenn ein Camp im Filter ausgewählt ist, erscheinen die Tages-Spalten (Mo, Di, …) direkt in der Anmeldungs-Tabelle — kein Tab-Wechsel mehr nötig
- **Camp-Spalte auto-ausblendet**: Bei aktivem Camp-Filter wird die Camp-Spalte automatisch ausgeblendet (kein Informationsgewinn, da Camp bekannt)
- **Neue Spaltenreihenfolge**: Kind → Alter → Status → [Anwesenheits-Tage] → Aktionen → Eltern → E-Mail → Telefon → Betrag → Datum
- **Standard-Sortierung**: Vorname aufsteigend (vorher: Datum absteigend); Kind-Sortierung nutzt jetzt Vorname statt Nachname
- **Dynamischer Tabellenkopf**: `<thead>` wird per JS generiert — Spaltenanzahl passt sich je nach Camp-Auswahl an
- **`toggleAnwesenheitMain()`**: Neue Funktion für Anwesenheitsklicks in der Haupttabelle (nimmt `campId` als Parameter statt globale Variable)
- **Anwesenheit lädt automatisch**: `filterTable()` lädt `teilnahme`-Daten wenn Camp-Filter gesetzt wird; `loadAll()` aktualisiert Cache bei Reload

### PayPal CSV Backfill-Script (`scripts/paypal-backfill-sync.mjs`)
- Neues Script zum Abgleich von PayPal-Zahlungen gegen offene Supabase-Anmeldungen
- Matching per E-Mail (primär) + Nachname (Fallback für abweichende PayPal-E-Mails)
- Dry-Run-Modus (Standard) zeigt Treffer ohne Änderungen; `--apply` führt Updates durch
- Liest `.env` aus `steuerberater/` automatisch ein
- Felder: `zahlungsstatus=bezahlt`, `zahlung_am` (PayPal-Datum), `stripe_payment_id` (PayPal-TX-ID)

### Manuelle Zahlungskorrekturen (6 Anmeldungen via PayPal CSV abgeglichen)
- Laurens Derks, Jonah Schmittkamp, Nicolas Schmittkamp, Benjamin Sun, Tim Sun, Haval Mohamad per direktem Supabase-PATCH auf `bezahlt` gesetzt

## 2026-03-29 (Sitzung 2)

### Admin-Dashboard: Anwesenheit & Leistungsdaten (`admin.html`, `css/admin.css`)
- **Neuer Tab "📅 Anwesenheit"**: Dritter Tab neben Camps und Anmeldungen
- **Camp-Auswahl**: Dropdown lädt alle Camps inkl. Datumsbereich
- **Anwesenheitsliste**: Zeigt alle Kinder des Camps (privat + Saint-Gobain + ÖF), sortiert nach Vorname
- **Tages-Checkboxen**: Spalten automatisch aus `datum_von`/`datum_bis` generiert; Klick speichert sofort per Upsert in Supabase (`teilnahme`-Tabelle, JSONB-Feld `anwesenheit`)
- **Leistungsspalten**: Sprint (s), Torschuss, Dribbling (s) als Zahleneingabe; speichert on blur
- **Tageszusammenfassung**: Anzeige wieviele Kinder pro Tag anwesend waren (z.B. `8/12`)
- **Timezone-Fix**: `getCampDays()` nutzt lokale Datumsformatierung statt `toISOString()` (verhinderte Off-by-one-Tag bei UTC+2)
- **Neue Supabase-Tabelle `teilnahme`**: `referenz_id` + `quelle` + `camp_id` + `anwesenheit` (jsonb) + `sprint` + `torschuss` + `dribbling`; unique auf `(referenz_id, camp_id)`

## 2026-03-29

### Admin-Dashboard: Manuelle Anmeldung & Datenbearbeitung (`admin.html`, `css/admin.css`)
- **Manuell erfassen**: Neues Modal (➕-Button) zum Eingeben von Kindern, die über andere Kanäle (Telefon, Vor Ort, E-Mail) angemeldet wurden — alle Felder inkl. Camp-Auswahl, Betrag-Autofill, Zahlungsstatus direkt setzbar
- **Anmeldetyp**: Dropdown „Privat" / „ÖF (Förderverein)" im Erfassungsformular
- **Daten bearbeiten**: ✏️-Button in Tabellenzeile und Detail-Panel öffnet Edit-Modal mit vorausgefüllten Feldern; speichert per PATCH
- **`apiPost`**: Neue Hilfsfunktion mit `Prefer: return=minimal` und echtem Fehlertext im Toast

### Admin-Dashboard: Zahlungsstatus & UX (`admin.html`, `css/admin.css`)
- **Zahlungsstatus manuell setzen**: Dropdown im Detail-Panel (Offen / Bezahlt Banküberweisung / Bezahlt Barzahlung / Storniert / Erstattet) — funktioniert von jedem Ausgangsstatus
- **Barzahlung**: Als eigene Option in Detail-Panel und Erfassungsformular; DB-Wert bleibt `bezahlt`
- **„→ Bezahlt"-Button**: Von „✓ Bezahlt" umbenannt, Farbe gelb wie OFFEN-Badge — kein visueller Widerspruch mehr
- **E-Mail-Farbe**: Grau wie Telefonnummern (nicht mehr rot)
- **Spalten-Toggle**: Buttons „👤 Eltern" und „💶 Betrag" blenden Spalten ein/aus; standardmäßig ausgeblendet

### Admin-Dashboard: Saint-Gobain & ÖF-Typ (`admin.html`, `css/admin.css`)
- **„Mitarbeiter" → „Saint-Gobain"**: Filterbutton und Badge umbenannt; Badge-Farbe lila (`.status-sg`)
- **ÖF (Förderverein)**: Neuer Anmeldungstyp mit türkisem Badge (`.status-oef`), eigenem Filterbutton; Betrag 0, Status automatisch „bezahlt"; Typ-Marker `[TYP:ÖF]` wird in `notizen` gespeichert und in `normalize()` erkannt — keine DB-Schema-Änderung nötig
- **Stats-Zeile**: Zeigt Saint-Gobain- und ÖF-Anzahl separat an

### Deploy & Infrastruktur
- **Permissions-Fix**: Lokale Datei-Permissions auf `644` gesetzt; verhindert 403-Fehler nach rsync-Deploy

## 2026-03-25

### Stripe-Zahlungssync (Backfill)
- Stripe-Backfill über Browser-JS ausgeführt: 25 Anmeldungen von `offen` auf `bezahlt` gesetzt
- Matching-Logik: E-Mail + Betrag + Zeitfenster (24h vor bis 60 Tage nach Anmeldung)
- Ergebnis: 35 bezahlt / 24 offen, 5.215 € Umsatz (vorher: 10 bezahlt / 48 offen)
- Verbleibende 24 offene: entweder tatsächlich unbezahlt oder E-Mail-/Betrags-Mismatch zwischen Stripe und Supabase

### Admin-Dashboard: Bulk-Aktionen (`admin.html`, `css/admin.css`)
- **Checkbox-Auswahl**: Einzelne oder alle Anmeldungen per Checkbox markieren
- **Bulk-Leiste**: Erscheint bei Auswahl mit Aktionen: Bezahlt setzen, Stornieren, Zahlungserinnerung, Löschen, Auswahl aufheben
- **Bulk-Status**: Mehrere Anmeldungen gleichzeitig auf bezahlt/storniert setzen
- **Bulk-Löschen**: Mehrere Einträge mit Sicherheitsabfrage gleichzeitig löschen
- **Zahlungserinnerung**: Per Resend Edge Function (primär) oder mailto-Fallback (wenn Server nicht erreichbar)
- **📨 Badge**: Zeigt an, wenn eine Erinnerung bereits versendet wurde (mit Datum im Tooltip)
- Feld `erinnerung_gesendet_am` in der Detailansicht ergänzt

### Admin-Dashboard: UI-Optimierung (`css/admin.css`)
- **Link-Farben**: Kein Browser-Blau mehr. E-Mail-Links rot (Theme-konform), Telefon grau mit Hover-Effekt
- **Datums-Spalte**: `min-width:130px` + Tabular-Nums, Format TT.MM.JJ HH:MM — wird nicht mehr abgeschnitten
- **Betrag-Spalte**: Rechtsbündig mit Tabular-Nums für saubere Ausrichtung
- **Bulk-Bar**: Größere Buttons, Gradient-Hintergrund, animierter Pulse-Dot, Hover-Lift mit Shadow
- **Action-Buttons**: Größer, mit Hover-Lift-Effekt, doppeltes `class`-Attribut gefixt
- **E-Mail-Spalte**: max-width mit Ellipsis bei langen Adressen

### Resend E-Mail-Integration (NEU)
- `supabase/functions/send-reminder/index.ts`: Supabase Edge Function für Zahlungserinnerungen per Resend API
- Personalisierte HTML-E-Mails mit TALENTEXPERTE-Branding (roter Header, Pay-Button mit Stripe-Link)
- Absender: `TALENTEXPERTE Fußballschule <kontakt@talentexperte.de>`
- DNS-Einträge für Domain-Verifizierung erstellt: DKIM, SPF (MX + TXT), DMARC
- `dns-eintraege-resend.txt`: Fertige Vorlage für den Hosting-Provider

### Stripe-Backfill-Script (NEU)
- `scripts/stripe-backfill-sync.mjs`: Node.js-Script zum Abgleich von Stripe-Zahlungen gegen Supabase
- Dry-Run-Modus (Default) + `--apply` für echte Updates
- Matching per E-Mail + Betrag + Zeitfenster

### Dokumentation
- `RUNBOOK.md`: Backfill-Anleitung und Verweis auf `STRIPE-SUPABASE-STATUS.md` ergänzt
- `STRIPE-SUPABASE-STATUS.md`: Neues Statusdokument für Stripe/Supabase/Webhook-Probleme

## 2026-03-19

### UI-Fixes (index.html, css/main.css)
- **Photo Strip mobil:** Bildgröße 140×94px → 200×133px, Animationsdauer 18s → 24s, Gap 6px → 8px
- **Hero-Video-Overlay mobil:** Opacity-Werte von `.5/.85/.95` auf `.3/.62/.78` reduziert — Video ist deutlich besser sichtbar
- **Galerie Lightbox deaktiviert:** Kein Vergrößern von Bildern per Klick; Zoom-Icon, Hover-Dunkeleffekt und Click-Handler entfernt; `cursor:default`

### Deploy-Sicherheit (ci/deploy.sh)
- `steuerberater/`, `.claude/`, `.agents/`, `.agent/`, `.orchids/`, `node_modules/`, `*.bak`, `*.bak2` von rsync-Auslieferung ausgeschlossen
- Verhindert versehentliches Deployment von Stripe-Belegen, API-Keys und internen Werkzeugordnern
- Hotfix: `steuerberater/` nach versehentlichem erstem Deployment manuell vom Server entfernt (`ssh rm -rf`)

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
