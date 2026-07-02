# Spam-Schutz fuer TALENTEXPERTE-Anmeldungen

Stand: 02.07.2026

## Ziel

Das Spam-Problem wird ohne sichtbares Captcha geloest. Die Umsetzung orientiert sich an der AIXTRA-WEB-Kontaktseite: technische Spam-Pruefungen, Honeypots, signiertes Token, Zeitfenster, serverseitige Inhaltspruefung und Rate-Limits. Graafen dient als Referenz fuer eine direkte, thematisch klare Anfragefuehrung ohne zusaetzliche Huerden fuer echte Nutzer.

## Umgesetzte Dateien

- `anmeldung.html`  
  Private Camp-Anmeldung sendet jetzt Honeypot-Felder, Formular-Startzeit und ein signiertes Formular-Token.
- `firmen-anmeldung.html`  
  Firmen-Anmeldung sendet nicht mehr direkt aus dem Browser in `firmen_anmeldungen`, sondern an die neue Edge Function `company-register`.
- `css/anmeldung.css`  
  Unsichtbare Honeypot-Klasse `.form-honeypot`.
- `supabase/functions/_shared/form-spam-protection.ts`  
  Gemeinsame Schutzlogik fuer Formular-Token, Honeypots, Zeitfenster, Inhaltspruefung und Rate-Limits.
- `supabase/functions/register/index.ts`  
  Bestehende private Anmeldung prueft Spam-Schutz serverseitig vor Validierung, Insert und E-Mail.
- `supabase/functions/company-register/index.ts`  
  Neue geschuetzte Firmen-Anmeldung mit serverseitigem Insert in `firmen_anmeldungen` und Mirror in `anmeldungen`.

## Schutzlogik

1. Beim Laden der Formularseite wird `form_started_at` gesetzt.
2. Das Formular holt per `GET` ein kurzlebiges, signiertes Token von der passenden Edge Function.
3. Beim Absenden werden drei Honeypots mitgesendet: `website_url`, `contact_url`, `fax_number`.
4. Die Edge Function lehnt ab, wenn:
   - ein Honeypot befuellt ist,
   - Token fehlt, ungueltig oder abgelaufen ist,
   - das Formular zu schnell oder nach zu langer Zeit abgeschickt wurde,
   - typische Spam-Muster oder zu viele Links enthalten sind,
   - IP oder E-Mail die Rate-Limits ueberschreiten.
5. Erst danach werden Daten bereinigt, validiert und gespeichert.

## Deployment

Vor dem Deploy ein Secret setzen:

```bash
supabase secrets set REGISTRATION_FORM_SECRET="$(openssl rand -hex 32)"
```

Functions deployen:

```bash
supabase functions deploy register --no-verify-jwt
supabase functions deploy company-register --no-verify-jwt
```

Hinweis: `register` war bereits als oeffentlicher Formular-Endpunkt gedacht. `company-register` muss ebenfalls oeffentlich erreichbar sein, weil Website-Besucher nicht eingeloggt sind. Die eigentliche Absicherung passiert ueber Token, Honeypots, Zeitfenster und Servervalidierung.

## Supabase-RLS-Haertung

Die direkte anonyme Insert-Moeglichkeit fuer `firmen_anmeldungen` wurde am 02.07.2026 live entfernt. Vorher existierte die Policy `Firmen können sich anmelden` mit `roles = public` und `with_check = true`; dadurch konnte der Browser direkt mit dem oeffentlichen Supabase-Anon-Key in `firmen_anmeldungen` schreiben. Das ist jetzt geschlossen, weil die Firmen-Anmeldung ueber die geschuetzte Service-Role-Edge-Function `company-register` laeuft.

Live ausgefuehrt:

```sql
drop policy if exists "Firmen können sich anmelden" on public.firmen_anmeldungen;
```

Die Änderung ist zusätzlich als Migration dokumentiert: `supabase/migrations/20260702185000_remove_public_company_registration_insert.sql`.

Policies pruefen:

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('anmeldungen', 'firmen_anmeldungen')
order by tablename, policyname;
```

Erwartung: Fuer `firmen_anmeldungen` gibt es keine `INSERT`-Policy fuer `public` oder `anon` mehr. Admin-Policies fuer eingeloggte Nutzer und Service-Role-Zugriff bleiben erhalten.

Wichtig: Die oeffentliche Camp-Auswahl liest weiter aus `camp_verfuegbarkeit_public`. Diese Leseberechtigung muss bestehen bleiben.

## Testfaelle

```bash
curl -s "https://yxygwwoocsdnneqykiym.supabase.co/functions/v1/register"
curl -s "https://yxygwwoocsdnneqykiym.supabase.co/functions/v1/company-register"
```

Erwartung: JSON mit `ok: true` und `token`.

Weitere Pruefungen:

- POST ohne `form_token` muss `400` liefern.
- POST mit befuelltem `website_url`, `contact_url` oder `fax_number` muss `400` liefern.
- Sehr schneller POST direkt nach Token-Erzeugung muss abgelehnt werden.
- Normale private Anmeldung muss speichern und Stripe-Link zurueckgeben.
- Normale Firmen-Anmeldung muss speichern, nach `bestaetigung-firma.html` weiterleiten und optional eine E-Mail senden.

## Betrieb

Die Rate-Limits laufen bewusst leichtgewichtig im Edge-Function-Prozess. Das reicht gegen einfache Bot-Wellen, ist aber nicht als globale Firewall zu verstehen. Falls weiterhin massiver Spam auftritt, naechster Schritt:

- table-basiertes Rate-Limit in Supabase,
- Cloudflare Turnstile als unsichtbarer Zusatzschutz,
- restriktivere RLS-Policies nach Deploy konsequent aktivieren.
