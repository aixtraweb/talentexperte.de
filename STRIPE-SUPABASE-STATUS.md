# Stripe / Supabase / Dashboard Status

Stand: 2026-03-25

## Ziel
- Eltern-Buchungen sollen weiterhin funktionieren.
- Bezahlte Stripe-Buchungen sollen im Dashboard als `bezahlt` erscheinen.
- Interne Views sollen aus Datenschutzgruenden nicht wieder oeffentlich gemacht werden.

## Ausgangsprobleme

### 1) Oeffentliche Supabase-Views waren zu offen
Betroffen:
- `public.alle_anmeldungen_dashboard`
- `public.camp_plaetze_view`
- `public.camp_verfuegbarkeit`

Risiko:
- Personenbezogene Daten und interne Auslastungsdaten waeren im Frontend erreichbar gewesen.

### 2) Frontend und Admin hingen an alten/gemischten Views
Symptome:
- `anmeldung.html` und `firmen-anmeldung.html` lasen `camp_verfuegbarkeit`
- `admin.html` las `camp_verfuegbarkeit` und `alle_anmeldungen_dashboard`
- nach der Absicherung fehlten Camp-Daten oder die Uebersicht blieb auf `Laden...`

### 3) Admin-Login war kurzzeitig kaputt
Symptom:
- `admin.html` liess keinen Login mehr zu

Ursache:
- JavaScript-Syntaxfehler in der Camp-Render-Funktion

### 4) Stripe-Zahlungen synchronisierten nicht ins Dashboard
Symptome:
- bezahlte Stripe-Buchungen erschienen im Dashboard weiter als offen
- Stripe deaktivierte den Live-Webhook nach mehrtaegigen Fehlern

Stripe-Hinweis:
- Webhook-Endpoint: `https://yxygwwoocsdnneqykiym.supabase.co/functions/v1/stripe-webhook`
- Stripe meldete wiederholte Fehler und deaktivierte den Endpoint

## Festgestellte Ursachen

### A) Webhook war JWT-geschuetzt
Live-Test am 2026-03-25:
- `GET` auf `stripe-webhook` -> `401 Missing authorization header`
- `POST` auf `stripe-webhook` -> `401 Missing authorization header`

Bewertung:
- Stripe sendet keinen Supabase-JWT
- dadurch kamen echte Stripe-Events gar nicht bis zur Function-Logik

### B) Webhook-Code war nicht sauber fuer Supabase Edge Runtime
Supabase-Logs zeigten:
- `Deno.core.runMicrotasks() is not supported in this environment`

Bewertung:
- bisherige Stripe-/Runtime-Kombination crashte in der Edge Runtime

### C) Historische Zahlungen fehlen in `public.anmeldungen`
SQL-Check:
```sql
select
  count(*) as total,
  count(*) filter (where zahlungsstatus = 'bezahlt') as status_bezahlt,
  count(*) filter (where stripe_payment_id is not null or zahlung_am is not null) as payment_signal
from public.anmeldungen;
```

Ergebnis:
- `total = 57`
- `status_bezahlt = 9`
- `payment_signal = 9`

Bewertung:
- ein einfaches SQL-Nachziehen bringt derzeit keine weiteren Zahlungen ins Dashboard
- viele alte Stripe-Zahlungen wurden nie in `anmeldungen` markiert

## Bereits umgesetzte Loesungen

### 1) Datenschutz-Fix fuer Views
Bereits ausserhalb dieses Repos umgesetzt:
- interne Views abgesichert
- oeffentliche Rechte entzogen
- `camp_verfuegbarkeit_public` als neue reduzierte Frontend-View eingefuehrt

### 2) Frontend auf oeffentliche View umgestellt
Geaendert:
- `/anmeldung.html`
- `/firmen-anmeldung.html`

Neu:
- beide Seiten lesen jetzt `camp_verfuegbarkeit_public`

### 3) Admin von gesperrten Views entkoppelt
Geaendert:
- `/admin.html`

Neu:
- keine direkte Abhaengigkeit mehr von `camp_verfuegbarkeit` oder `alle_anmeldungen_dashboard`
- Camp-Uebersicht hat Fallback auf `camp_verfuegbarkeit_public`
- Admin zeigt im Fallback Lesemodus statt kaputt zu laufen

### 4) Admin-Login-Hotfix
Geaendert:
- `/admin.html`

Fix:
- Syntaxfehler in der Camp-Ansicht behoben
- Login funktioniert wieder

### 5) Stripe-Webhook reparatur begonnen
In Supabase bereits umgesetzt:
- `Verify JWT` fuer `stripe-webhook` ausgeschaltet
- Endpoint in Stripe wieder aktiviert
- Code der Function auf Deno-kompatiblere Signaturpruefung umgestellt

Aktueller Beobachtungsstand:
- keine neuen sofortigen Runtime-Fehler in den Supabase-Logs

## Aktueller Status

### Was funktioniert
- `admin.html` Login funktioniert
- Camp-Uebersicht in Frontend/Admin ist wieder stabil
- `stripe-webhook` ist nicht mehr durch JWT blockiert
- richtige Stripe-Events sind im Endpoint eingetragen:
  - `checkout.session.completed`
  - `payment_intent.succeeded`

### Was noch nicht abschliessend verifiziert ist
- ob neue echte Stripe-Zahlungen jetzt wieder korrekt `anmeldungen` aktualisieren
- ob alte Stripe-Zahlungen vollstaendig nachgezogen werden koennen

## Neue Werkzeuge im Repo

### 1) Einmaliges Backfill-Skript
Datei:
- `/scripts/stripe-backfill-sync.mjs`

Zweck:
- historische Stripe-Zahlungen gegen `public.anmeldungen` matchen
- passende Datensaetze auf `bezahlt` setzen

Matching aktuell:
- `email + betrag_euro`

Dry Run:
```bash
MY_SUPABASE_URL=... MY_SUPABASE_SERVICE_ROLE_KEY=... node scripts/stripe-backfill-sync.mjs --from 2023-08-01
```

Echte Ausfuehrung:
```bash
MY_SUPABASE_URL=... MY_SUPABASE_SERVICE_ROLE_KEY=... node scripts/stripe-backfill-sync.mjs --from 2023-08-01 --apply
```

### 2) Bestehendes Steuerberater-Skript bleibt getrennt
Datei:
- `/steuerberater/stripe-sync.js`

Hinweis:
- das ist fuer private Beleg-/Steuerberater-Exporte
- nicht fuer Dashboard-Synchronisierung

## Naechste Schritte / Aufgaben

### Prioritaet 1: Dry Run des Stripe-Backfills ausfuehren
Ziel:
- sehen, wie viele historische Stripe-Zahlungen sauber einer Anmeldung zugeordnet werden koennen

Erwartung:
- wenn viele Matches gefunden werden, danach `--apply` ausfuehren

### Prioritaet 2: Nach dem Backfill Dashboard erneut pruefen
Pruefen:
- Anzahl `bezahlt`
- Anzahl `offen`
- Stichprobe einzelner betroffener Anmeldungen

### Prioritaet 3: Neue echte Stripe-Zahlung verifizieren
Ziel:
- sicherstellen, dass der reparierte Webhook neue Zahlungen live synchronisiert

Pruefen:
- Supabase `stripe-webhook` Logs
- `public.anmeldungen.zahlungsstatus`
- Dashboard-Anzeige

### Prioritaet 4: Webhook-Matching spaeter robuster machen
Aktueller Schwachpunkt:
- Matching nur ueber `email + betrag_euro`

Besser spaeter:
- `anmeldung_id` oder eindeutige IDs in Stripe `metadata` schreiben
- Webhook dann per eindeutiger ID statt heuristisch matchen

### Prioritaet 5: Optionales Monitoring
Sinnvoll:
- in Supabase Logs regelmaessig auf `stripe-webhook` achten
- in Stripe Webhook-Zustellungen auf neue Fehler achten

## Kurzfazit
- Datenschutz-Fix fuer Views bleibt erhalten.
- Frontend/Admin wurden darauf angepasst.
- der groesste Stripe-Bug war der JWT-Schutz des Webhooks.
- fuer alte Zahlungen braucht es jetzt sehr wahrscheinlich einen einmaligen Stripe-Backfill.
