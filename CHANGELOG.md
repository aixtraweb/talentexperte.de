# Changelog

## 2026-08-23 — Persistente Aufgabenliste im Admin-Dashboard

### Admin-Dashboard und Supabase

- Neuer Tab „Aufgaben“ mit Offen-/Alle-/Erledigt-Filter, offener Anzahl, Priorität, Fälligkeit und responsiver Camp-Einsatz-Ansicht.
- Aufgaben können angelegt, bearbeitet, erledigt, wieder geöffnet und gelöscht werden; eine optionale Anmeldungsverknüpfung öffnet direkt den privaten Teilnehmerdatensatz.
- Neue Tabelle `admin_todos` ausschließlich für freigeschaltete Dashboard-Admins; anonyme Rollen bleiben gesperrt und jede Änderung wird im vorhandenen `security_audit_log` protokolliert.
- Migration ohne konkrete Teilnehmernamen oder Zahlungsdetails gehalten; operative Sommercamp-II-Aufgaben wurden separat als private Live-Daten angelegt.
- Anonymer Negativtest für `admin_todos` in den Sicherheitstest aufgenommen.
- Migration und Dashboard produktiv ausgerollt; lokale und entfernte Hashes von `admin.html` und `css/admin.css` stimmen überein, der Deployment-Sicherheitstest besteht.
- Rollbackpunkt des Website-Rollouts: `/srv/www/medina-82/backups/talentexperte/backup_2026-08-23_21-48-32.tar.gz`.

## 2026-07-20 — Tagesgesamtzahl der anwesenden Kinder im Dashboard

### Admin-Dashboard

- Bei ausgewähltem Camp zeigt die Anmeldeliste oberhalb der Tabelle für jeden Camptag die Anzahl der bereits als anwesend markierten Kinder im Verhältnis zu allen aktiven Camp-Anmeldungen.
- Die Tagesgesamtzahl steigt oder sinkt unmittelbar mit jedem Anwesenheitshaken und bleibt durch den vorhandenen lokalen Cache auch bei ausstehender Offline-Synchronisierung aktuell.
- Stornierte und erstattete Anmeldungen werden wie in der bestehenden Anwesenheitsansicht nicht in die Gesamtzahl einbezogen; Such- und Statusfilter verfälschen den Camp-Gesamtwert nicht.
- Die gemeinsame Tagesanzeige wurde für Desktop und Mobilgeräte kontrastreich und responsiv gestaltet.
- Das sichtbare Format auf die reine Anwesenheitszahl reduziert: beispielsweise `48` statt `48 / 59`.
- Produktiv auf das bestätigte TALENTEXPERTE-Hostingwerk-Ziel ausgerollt; der Dry-Run enthielt ausschließlich `admin.html` und `css/admin.css`, ohne Löschungen.
- Aktueller Rollbackpunkt nach der Formatkorrektur: `/srv/www/medina-82/backups/talentexperte/backup_2026-07-20_20-56-25.tar.gz`. Lokale, serverseitige und öffentlich ausgelieferte SHA-256-Hashes der beiden Dateien stimmen überein; Deployment-Sicherheitstest und Schutz interner Pfade bestanden.

## 2026-07-20 — Workflow für einzelne Zahlungsrückfragen dokumentiert

### Dokumentation

- `docs/PAYMENT-INQUIRY-WORKFLOW.md` als verbindliches operatives Runbook ergänzt: vorhandene Live-Zugänge zu Supabase, Admin-Dashboard und Stripe werden bei neuen Rückfragen ohne erneute Zugangsklärung direkt verwendet.
- Suchreihenfolge über Anmeldungs-ID, unterschiedliche E-Mail-Adressen, Namen, Betrag und Zeitfenster festgelegt; PayPal-Zahlerdaten innerhalb von Stripe ausdrücklich aufgenommen.
- Sichere Verbuchung für Einzel- und gemeinsame Geschwisterzahlungen, Schutz vor doppelter Erstattung, Erhalt der ursprünglichen Namensschreibweise und abschließende Reminder-/Outbox-Prüfung dokumentiert.
- Handbuch, Root-Runbook, Integrationsübersicht, Dokumentationsinventar, Entscheidungslog und README mit dem neuen Workflow verknüpft.

## 2026-07-20 — Zahlungsfrist auf neue Anmeldungen begrenzt

- Automatik unmittelbar gestoppt, nachdem klargestellt wurde, dass aktuell vorhandene Anmeldungen während des laufenden Campbetriebs nicht verändert werden dürfen; bis dahin war kein Platz automatisch freigegeben worden.
- Eine additive Policy-Grenze ergänzt: Nur Anmeldungen ab dem produktiven Aktivierungszeitpunkt werden vom Zahlungsfrist-Prozessor berücksichtigt.
- Bestehende Anmeldungen werden weder nachträglich erinnert noch automatisch storniert oder freigegeben; der Prozessor arbeitet bei fehlender Policy-Konfiguration fail-closed.
- Die sieben bereits versendeten Letzterinnerungen können nicht zurückgerufen werden. Die betroffenen bestehenden Anmeldungen sind von der automatischen Freigabe ausgeschlossen; ihre fachlichen Anmeldungs-, Zahlungs-, Camp- und Kapazitätswerte werden nicht weiter verändert.
- Policy ab 20.07.2026, 15:15:34 Uhr MESZ produktiv aktiviert. Dry-Run und kontrollierter Echtlauf lieferten jeweils 0 Kandidaten, 0 Mails und 0 Freigaben; die anonymen Fingerabdrücke aller 166 bestehenden Anmeldungen und 6 Camps blieben über den Rollout identisch.

## 2026-07-20 — Git-Ausnahme und absolutes E-Mail-Verbot präzisiert

- Den bestehenden Remote `github.com/aixtraweb/talentexperte.de` als korrekten und einzigen erlaubten Berührungspunkt mit AIXTRA-WEB bestätigt; Fetch, Pull und Push sind zulässig.
- Festgelegt, dass diese Git-Ausnahme keinerlei AIXTRA-WEB-Freigabe für andere Dienste begründet.
- `kontakt@aixtra-web.de` als Absender, Alias, Reply-To, Weiterleitung, Signaturbestandteil und technischen Versandweg für TALENTEXPERTE ausdrücklich ausgeschlossen.

## 2026-07-20 — Zahlungsfrist produktiv aktiviert

### Produktionsstand

- Supabase-Projekt `feriencamps` in der Organisation `TALENTEXPERTE`, Stripe-Konto `FUSSBALLSCHULE TALENTEXPERTE` und die verifizierte Resend-Domain `talentexperte.de` vor dem Rollout bestätigt.
- Migrationen für Zahlungsfristen, sichere Platzfreigabe, `pg_cron`, Vault-Secrets und zwei kontrollierbare 15-Minuten-Jobs produktiv angewendet.
- Abhängige Edge Functions und statische Website mit vorherigem Hosting-Backup aktualisiert; produktive Sicherheits- und Webroot-Tests bestanden.
- Der erste Dry-Run meldete sieben fällige offene Elternzahlungen für das Sommercamp II ohne Stripe- oder Zuordnungskonflikt.
- Sieben eindeutige Letzterinnerungen erfolgreich über TALENTEXPERTE versendet; die Plätze bleiben bis 21.07.2026, 14:15 Uhr MESZ reserviert. Beim Rollout wurde kein Platz freigegeben.
- Zahlungsfrist-Prozessor und E-Mail-Outbox laufen geheimnisgeschützt alle 15 Minuten. Ein erneuter Dry-Run war idempotent und meldete keine weiteren Kandidaten; der erste automatische Doppellauf um 14:15 Uhr lieferte zweimal HTTP 200.

## 2026-07-19 — Verbindliche Zahlungsfrist und automatische Platzfreigabe vorbereitet

### Umsetzung

- Für neue Elternanmeldungen eine 72-Stunden-Zahlungsfrist und eine Letzterinnerung mit mindestens 24 Stunden Nachfrist als gemeinsame Datenbankregel ergänzt.
- `process-payment-deadlines` gleicht fällige Anmeldungen vor jeder Mail und Freigabe mit Stripe ab, stoppt bei API-/Zuordnungsfehlern und schließt Sponsor, Firma sowie begonnene Camps aus.
- Remindertext nennt Kind, Camp, Betrag sowie konkretes Datum/Uhrzeit und kommuniziert eindeutig die automatische Stornierung ohne weitere Nachricht.
- Outbox und atomare RPCs verhindern Doppelversand und stellen sicher, dass eine fehlgeschlagene Mail keine Freigabefrist startet.
- Anmeldung, Bestätigung, PDF, Zahlungsstart und Admin-Dashboard zeigen den Friststatus konsistent; alte Zahlungslinks prüfen vor Stripe den aktuellen Buchungsstatus.
- Bestehende offene Elternanmeldungen werden beim Rollout zuerst für die neue Letzterinnerung fällig und nicht ohne diese rückwirkend storniert.
- Ein geschützter Dry-Run liefert vor Aktivierung nur anonymisierte Kandidatenzahlen je Camp und führt weder Versand noch Datenbankänderungen oder Platzfreigaben aus.

### Rolloutgrenze

- Repository-Umsetzung ist vorbereitet. Produktiv sind Migration, Functions, ausschließlich TALENTEXPERTE zugeordnete Resend-/Stripe-/Supabase-Identitäten, `PAYMENT_DEADLINE_PROCESSOR_SECRET`, Zeitplan und kontrollierte Testfälle getrennt zu aktivieren. Es wurden keine Mails versendet und keine Plätze freigegeben.

## 2026-07-19 — Strikte Trennung von TALENTEXPERTE und AIXTRA-WEB festgelegt

### Dokumentation

- Die Betreiberentscheidung dokumentiert, TALENTEXPERTE auf Marken-, Konto-, Absender-, Connector-, Speicher-, Publishing-, Zahlungs-, Hosting- und Integrationsebene vollständig von AIXTRA-WEB zu trennen.
- Ein verbindliches Versand-Gate ergänzt: tatsächlichen Absender, Anzeigenamen, Reply-To, Signatur, Empfänger und sichtbare Testdarstellung unmittelbar vor jeder TALENTEXPERTE-Mail prüfen.
- AIXTRA-WEB-Konten dürfen nicht als Testweg, Fallback oder technisches Zwischenkonto für TALENTEXPERTE verwendet werden; allgemeine Versand-/Publish-Freigaben heben diese Regel nicht auf.
- Einen priorisierten Bestandsaudit für vorhandene AIXTRA-WEB-Verknüpfungen in E-Mail, GitHub, Testskripten und weiteren externen Diensten aufgenommen.

### Bekannte offene Punkte

- Der bestehende AIXTRA-WEB-Gmail-Connector und hart codierte AIXTRA-WEB-Testempfänger sind bis zu ihrer kontrollierten Ablösung für externe TALENTEXPERTE-Aktionen gesperrt. Der später ausdrücklich bestätigte Git-Remote ist davon ausgenommen.

## 2026-07-18 — Projektdokumentation konsolidiert

### Dokumentation

- Das gesamte Repository, alle vorhandenen Markdown-Dateien, produktiven Seiten, Styles, Skripte, Supabase-Funktionen und Migrationen sowie die Deployment-Allowlist wurden inventarisiert.
- `AGENTS.md`, `README.md` und `PROJEKT-HANDBUCH.md` wurden als kurze verbindliche Einstiegsebene ergänzt, ohne bestehende fachliche Regeln oder lokale Fremdänderungen zu verwerfen.
- Unter `docs/` wurden ausschließlich die für die komplexe Website-, Anmelde-, Zahlungs-, Admin-, SEO/GEO- und Integrationsarchitektur erforderlichen Fachdateien angelegt.
- Historische Audit-, Status-, Kampagnen- und Wochenplan-Dateien bleiben unverändert erhalten; ihre Gültigkeit, Widersprüche und empfohlene Behandlung sind in `docs/DOCUMENTATION-INVENTORY.md` dokumentiert.

### Bekannte offene Punkte

- Live-Stände von Campdaten, Sponsor-Rollout, Hosting-Headern, Social-API-Zugängen und Zahlungsabgleich wurden bei dieser Repository-Dokumentation nicht als bestätigt ausgegeben.
- Die Deployment-Allowlist veröffentlicht derzeit den gesamten Ordner `images/` mit Ausnahme von `images/social-input/`; darin liegen große Rohmedien und PSD-Dateien. Eine Einschränkung erfordert eine gesonderte, geprüfte Umsetzungsaufgabe.
- Geschäfts-, Datenschutz- und Camp-Ortsadressen sind im Bestand nicht vollständig konsistent und dürfen ohne fachliche/rechtliche Klärung nicht vereinheitlicht werden.

## 2026-07-13 — Bewertungsbereich repariert und live deployt

- Das nicht mehr initialisierende Elfsight-Bewertungswidget auf der Startseite wurde durch einen nativen, responsiven Bewertungsblock ersetzt. Dadurch bleiben die Bewertungen ohne externe Widget-Konfiguration sichtbar und für Suchmaschinen sowie Screenreader lesbar.
- Eingebunden sind drei öffentlich verifizierte Google-Rezensionen, die Gesamtbewertung von 5,0 Sternen bei 43 Rezensionen und ein Link zum Google-Unternehmensprofil.
- Desktop- und Mobilansicht geprüft: drei Spalten auf Desktop, eine Spalte auf Mobilgeräten; das alte Bewertungswidget ist nicht mehr im DOM vorhanden.
- Sicherheitsprüfungen `npm run test:security` und `npm run test:security:deployment` bestanden. Der rsync-Dry-Run enthielt ausschließlich `index.html` und `css/main.css`; keine Live-Dateien wurden gelöscht.
- Deployment mit `ci/deploy.sh` nach `/srv/www/medina-82/public/talentexperte`. Vor dem Upload wurde das Remote-Backup `/srv/www/medina-82/backups/talentexperte/backup_2026-07-13_22-09-13.tar.gz` erstellt.
- Live-Verifikation bestanden: lokale, ausgelieferte und serverseitige SHA-256-Prüfsummen von `index.html` und `css/main.css` stimmen überein; Startseite, Anmeldung, Impressum, Datenschutz, Sitemap, robots.txt und Stylesheet liefern HTTP 200.

## 2026-07-12 — Hotfix: Camp-Auswahl lud nicht mehr („Camps konnten nicht geladen werden")

Die RLS-Härtung aus `20260710090000` entzog `anon` den Lesezugriff auf `anmeldungen`/`firmen_anmeldungen`. Die öffentliche View `camp_verfuegbarkeit_public` lief aber mit `security_invoker=true` und zählt `freie_plaetze` über genau diese Tabellen → `permission denied` beim `select *` des Anmeldeformulars (Teilselektionen ohne `freie_plaetze` funktionierten weiter, daher fiel es erst im Formular auf). Fix: View auf Besitzerrechte umgestellt (`security_invoker=false`, Migration `20260712100000`) — sie liefert ausschließlich Camp-Metadaten und aggregierte Zahlen. Direkt in Prod angewendet und verifiziert; alle übrigen Views bleiben invoker-basiert und ohne anon-Zugriff.

## 2026-07-10 (Sitzung 3) — Gutschein-Prüfung automatisch, ohne Button

- **„Code prüfen"-Button entfernt** (`anmeldung.html` + CSS): Die Nummer wird automatisch im Hintergrund geprüft, sobald mind. 4 Zeichen eingegeben und ein Camp gewählt sind (debounced, 700 ms; auch bei Camp-/Namensänderung). Ohne Camp: neutraler Hinweis „Bitte wähle oben ein Camp aus …" statt Fehlermeldung.
- **Keine Pflichtfelder mehr für die Prüfung**: `validate_sponsor` verlangt serverseitig nur noch Nummer + Camp (Name/Geburtsdatum optional, nur für namensgebundene Berechtigungen relevant; Geburtsdatum wird als `null` toleriert).
- **Submit bleibt Sicherheitsnetz**: Vor dem Absenden wird ein eingegebener Code immer erneut geprüft; ein Code-Versuch fällt nie still in den Zahlweg.
- Fehlermeldungen vereinheitlicht („Diese Gutschein-Nummer wurde nicht gefunden …", „… bereits verwendet").

**Hinweis:** Bis `supabase functions deploy register --no-verify-jwt` ausgeführt ist, antwortet die alte Live-Function bei leeren Namensfeldern mit einem generischen Fehler — der Client zeigt dafür eine freundliche Fallback-Meldung. Nach Function-Deploy + Import ist der Ablauf vollständig.

## 2026-07-10 (Sitzung 2) — ÖF-Gutscheinliste angebunden

Der Verein hat die echte Gutscheinliste geliefert (`gutschein-nummern.ods`, 30 Nummern): Format `Talent <Camp-Startdatum TTMMJJJJ> <4 Ziffern>`, nur Nachnamen/Einrichtungsnamen (11 von 30 sind Einrichtungen wie Haus1/ZFSA/Maria im Tann), keine Geburtsdaten.

- **Prüfung ist jetzt code-gebunden statt namensgebunden**: `register`-Function expandiert Elterneingaben („1118" → `TALENT200720261118` anhand des gewählten Camps) und prüft zusätzlich zur Kindesnamen-Identität die Code-Identität (Berechtigungen aus `--code-only`-Importen). Einmal-Verwendung bleibt atomar garantiert.
- **Import-Skript**: neuer Modus `--code-only` (Namen optional, `child_name_normalized` = normalisierter Code, Platzhalter für Pflicht-Namensspalten, `import_mode` in Metadata). Self-Test erweitert.
- **`gutschein-nummern-import.csv`** aus der ODS generiert: 29 Berechtigungen (22× Sommercamp I, 7× Sommercamp II). **Konflikt:** `Talent 20072026 2061` doppelt vergeben (Bazaiba + Sheptytska) → nur Bazaiba in der CSV; Sheptytska braucht neue Nummer vom Verein.
- Formular-Platzhalter: „z. B. 1118 (die letzten 4 Ziffern genügen)".
- Deploy-/Git-Ausschlüsse für `*.ods` und `gutschein-nummern*` (Klartext-Codes dürfen nie auf Webserver/Git).
- Fehlertexte sprechen jetzt von „Gutschein-Nummer".

**Noch offen:** `supabase functions deploy register --no-verify-jwt`, dann Import mit `--code-only --apply` (Secrets erforderlich), Testfall laut Abnahme-Checkliste, ODS + CSV nach Import sicher verschieben/löschen.

## 2026-07-10 — ÖF-Gutschein-Feinschliff + Ostercamps als Vergangenheit

### Vereinsname korrigiert: „Öcher Fans for Kenger e.V." (ÖF)
Der Kooperationsverein heißt „Öcher Fans for Kenger e.V.", nicht „Öcher Kenger e.V.". Korrigiert in: Migration-Seed (`20260710090000`), neuer idempotenter Migration `20260710150000_rename_sponsor_partner_oef.sql` (greift auch, wenn der alte Seed schon angewendet wurde), `register`-Fehlertext, `send-missing-confirmations`-Fallback, `admin.html` (Filter-Button jetzt „🤝 ÖF / Sponsoring" + Fallback-Name), `SPONSORING-RUNBOOK.md`, `README.md`.

### Anmeldeformular: Gutschein-Panel klar erkennbar
Panel-Copy in `anmeldung.html` nennt jetzt explizit „Gutschein-Nummer" und den Verein: Kicker „Optional · Gutschein vom Verein / Förderpartner", Überschrift „Gutschein-Nummer vom Verein erhalten?", Label „Gutschein-Nummer / Vereinscode".

### Abgelaufene Camps im Formular + serverseitiger Schutz
- `loadCamps()` markiert Camps mit `datum_bis < heute` als „⏳ Abgelaufen · Vergangenheit" (sichtbar, aber deaktiviert, ans Listenende sortiert) — betrifft die in der DB noch `aktiv` stehenden Ostercamps.
- `register`-Function lehnt Buchungen für beendete Camps mit 409 ab (Datumsprüfung zusätzlich zum Status).
- JSON-LD: Ostercamp-Events auf `EventCompleted` + `SoldOut` gesetzt (`index.html` Ostercamp II, `anmeldung.html` beide).

### Deploy
Website via `ci/deploy.sh` deployt (Remote-Backup vorab). Neu: `SPONSORING-RUNBOOK.md` vom Deploy ausgeschlossen (internes Ops-Dokument). Live verifiziert: Gutschein-Panel, Ostercamp-Markierung, tokenbasierte `bestaetigung.html`, Admin-ÖF-Filter.

**Noch offen (braucht Supabase-CLI/Secrets):** `supabase functions deploy register --no-verify-jwt` (Datums-Guard + Fehlertext), Migration `20260710150000` anwenden (bzw. `update sponsoring_partners set name='Öcher Fans for Kenger e.V.' where slug='oecher-kenger';` im SQL-Editor), ÖF-Vereinsliste importieren (Runbook), ggf. `resend-signed-confirmation-links.mjs --scope=all_future` (Alt-Links aus E-Mails vor der RLS-Härtung sind bereits jetzt ungültig).

## 2026-04-11 — Offline-Queue-Audit + Saint-Gobain-Normalisierung

### Audit: Offline-Queue + Session-Refresh (`admin.html`)
Vollständige Prüfung nach Datenverlust-Sorge ("was, wenn ich mich erst Tage später am Mac einlogge?"). **Ergebnis: Mechanik ist robust, aber iPad-Queue ist gerätegebunden.**

- `doLogout()` (Zeile 200) löscht bewusst **nicht** `teilnahme_q` → Queue überlebt Logout
- `showDashboard()` (Zeile 201) flusht 1,5 s nach jedem Login/Reload → verspätete Syncs greifen automatisch
- `doRefreshToken()` (Zeile 962) schluckt Netzwerkfehler in `catch` → offline führt nicht zu Auto-Logout
- **Wichtig:** Daten, die auf dem iPad in `localStorage.teilnahme_q` liegen, erreichen den Server erst, wenn das iPad selbst wieder online geht. Der Mac kann iPad-Queue-Daten nicht abrufen.
- **Offene Lücken** (nicht kritisch, aber verbesserbar): kein `visibilitychange`-Flush; keine Warnung beim Tab-Schließen bei nicht-leerer Queue; iOS Safari kann localStorage unter Speicherdruck theoretisch purgen.

### Datenkorrektur: Saint-Gobain firma_name normalisiert
In `firmen_anmeldungen` lagen drei Schreibweisen nebeneinander: `"Firma"`, `"Compagnie de Saint-Gobain"`, `"Saint-Gobain Sekurit Deutschland GmbH"`. **7 Rows** (3 Kinder × mehrere Camp-Buchungen) auf einheitlich `"Saint-Gobain"` gesetzt — betrifft Anouar Hawali, Lukas Häuselmann, Gökay Yildiz.

### Gefunden: Verwaiste `teilnahme`-Rows in Ostercamp I
Diff `teilnahme=40` vs. `anmeldungen=36 + firmen_anmeldungen=2 = 38` → **2 Orphan-Rows**. Die zugehörigen Anmeldungen wurden via Dashboard-DELETE gelöscht, die `teilnahme`-Rows blieben zurück (keine FK-Kaskade). Konsequenz: Anwesenheits-Summen im Dashboard können um gelöschte Kinder abweichen, und gelöschte Anmeldungen sind nicht mehr rekonstruierbar. **Neue Regel: stornieren statt löschen** — siehe `RUNBOOK.md` §7d.

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
