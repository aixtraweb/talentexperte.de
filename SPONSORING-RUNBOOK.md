# Sponsoring-Runbook: Öcher Fans for Kenger e.V. (ÖF)

## Einmalige Einrichtung

Die Reihenfolge ist verbindlich, damit das Elternformular nie vor dem sicheren Backend live geht:

1. Einen eventuell offengelegten bisherigen Resend-Key widerrufen, einen neuen Key erzeugen und als `RESEND_API_KEY` setzen.
2. Fuer Edge Function **und Import** denselben, zufaelligen Pepper mit mindestens 24 Zeichen sowie ein separates Link-Geheimnis mit mindestens 32 Zeichen setzen. Geheimnisse nie direkt in einen Shell-Befehl schreiben. Zwei Dateien außerhalb des Repositories mit `chmod 600` anlegen: eine reine Function-Secrets-Datei und eine lokale Operationsdatei.

   ```bash
   umask 077
   "$EDITOR" /geschuetzter/pfad/sponsoring-function-secrets.env
   "$EDITOR" /geschuetzter/pfad/sponsoring-ops.env
   chmod 600 /geschuetzter/pfad/sponsoring-*.env
   supabase secrets set --env-file /geschuetzter/pfad/sponsoring-function-secrets.env
   ```

   `sponsoring-function-secrets.env` enthält `RESEND_API_KEY`, `SPONSOR_CODE_PEPPER`, `CONFIRMATION_LINK_SECRET` und `ADMIN_EMAILS`. `sponsoring-ops.env` enthält `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` und denselben `SPONSOR_CODE_PEPPER`. Beide Dateien sind durch `.gitignore`-Regeln vom Projekt ausgeschlossen, sollen aber trotzdem außerhalb des Projektordners liegen.

3. Vor dem Release in Supabase Auth die öffentliche E-Mail-Registrierung deaktivieren. Zusätzlich die bestehenden RLS-Policies für `anmeldungen`, `firmen_anmeldungen`, `camps` und `teilnahme` prüfen. Die Migration ergänzt auf allen vier Tabellen eine restriktive serverseitige Allowlist; standardmäßig wird `kontakt@talentexperte.de` freigeschaltet. Weitere tatsächlich benötigte Admin-Adressen müssen bewusst in `dashboard_admins` ergänzt werden. Ein beliebig neu angelegtes Konto darf niemals Dashboard-, Personen- oder Finanzdaten lesen.

   ```sql
   select schemaname, tablename, policyname, roles, cmd, qual, with_check
   from pg_policies
   where schemaname = 'public'
     and tablename in ('anmeldungen', 'firmen_anmeldungen', 'camps', 'teilnahme')
   order by tablename, policyname;

   select grantee, table_name, privilege_type
   from information_schema.role_table_grants
   where table_schema = 'public'
     and table_name in ('anmeldungen', 'firmen_anmeldungen')
     and grantee in ('anon', 'PUBLIC', 'authenticated')
   order by table_name, grantee, privilege_type;
   ```

4. Vor der Migration alle historischen Typmarker gegen bestätigte Originalunterlagen prüfen. Unerwartete Treffer stoppen den Rollout; der Notizmarker allein ist kein ausreichender kaufmännischer Beleg.

   ```sql
   select a.id, a.created_at, a.vorname, a.nachname, a.email,
          c.name as camp, a.notizen, a.betrag_euro, a.zahlungsstatus
   from public.anmeldungen as a
   left join public.camps as c on c.id = a.camp_id
   where coalesce(a.notizen, '') ~ '\[TYP:(ÖF|OEF|SG)\]'
   order by a.created_at;
   ```

   Auch die vorgeschlagenen Firmen-Spiegelpaare vorab prüfen. Die Migration wählt je Firmenzeile nur den zeitlich nächsten Volltreffer innerhalb von zehn Minuten; echte zusätzliche Privatbuchungen dürfen nicht als Firma klassifiziert werden.

   ```sql
   select
     f.id as firmen_id,
     a.id as anmeldung_id,
     f.created_at as firmen_erstellt,
     a.created_at as anmeldung_erstellt,
     f.kind_vorname,
     f.kind_nachname,
     c.name as camp,
     abs(extract(epoch from (a.created_at - f.created_at))) as abstand_sekunden
   from public.firmen_anmeldungen as f
   join public.camps as c on c.id = f.camp_id
   cross join lateral (
     select a2.*
     from public.anmeldungen as a2
     where a2.camp_id = f.camp_id
       and a2.vorname = f.kind_vorname
       and a2.nachname = f.kind_nachname
       and a2.geburtsdatum = f.kind_geburtsdatum
       and lower(coalesce(a2.email, '')) = lower(coalesce(f.mitarbeiter_email, f.firma_email, ''))
       and coalesce(a2.telefon, '') = coalesce(f.mitarbeiter_telefon, f.firma_telefon, '')
       and abs(extract(epoch from (a2.created_at - f.created_at))) <= 600
     order by abs(extract(epoch from (a2.created_at - f.created_at))), a2.id
     limit 1
   ) as a
   order by f.created_at;
   ```

5. Die Online-Anmeldung kurz in den Wartungsmodus setzen. Zwischen Migration und Function-Deploy dürfen keine Anmeldungen über die alte `register`-Version eingehen.
6. Migration `supabase/migrations/20260710090000_add_sponsoring_workflow.sql` anwenden. Sie entzieht `anon/PUBLIC` ausdrücklich direkte Lese- und Schreibrechte auf `anmeldungen` und `firmen_anmeldungen`, aktiviert die Dashboard-Allowlist und synchronisiert während des Rollouts alte Register-/Stripe-Schreibvorgänge über einen Übergangstrigger. Falls weitere Admins erforderlich sind, jetzt ausschließlich über den Supabase SQL Editor ergänzen:

   ```sql
   insert into public.dashboard_admins (email, active)
   values ('weitere-bekannte-admin-adresse@example.org', true)
   on conflict (email) do update set active = excluded.active;
   ```
7. Danach die geaenderten Funktionen deployen:

   ```bash
   supabase functions deploy register --no-verify-jwt
   supabase functions deploy company-register --no-verify-jwt
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy send-reminder
   supabase functions deploy send-missing-confirmations
   supabase functions deploy send-ostercamp2-campaign
   ```

   `send-ostercamp2-campaign` wird dabei als dauerhaft stillgelegte Einmalfunktion ausgerollt und antwortet nur noch mit HTTP 410. Stripe und beide öffentlichen Registrierungsfunktionen benötigen `--no-verify-jwt`, weil sie ihre jeweilige Authentifizierung selbst durchführen.

8. Kontrollieren, dass keine Übergangsdatensätze mit `payer_type='parent'`, `betrag_euro>0`, aber `parent_amount_euro=0` entstanden sind und dass kein anonymer Lese- oder Schreib-Grant auf Anmeldedaten übrig ist.

   ```sql
   select id, created_at, betrag_euro, parent_amount_euro
   from public.anmeldungen
   where payer_type = 'parent'
     and betrag_euro > 0
     and parent_amount_euro = 0;

   select grantee, privilege_type
   from information_schema.role_table_grants
   where table_schema = 'public'
     and table_name in ('anmeldungen', 'firmen_anmeldungen')
     and grantee in ('anon', 'PUBLIC')
     and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
   ```

9. Vor Veröffentlichung der neuen `bestaetigung.html` allen Eltern mit einer aktiven künftigen Anmeldung einmalig einen signierten Ersatzlink senden. Zuerst Dry-Run kontrollieren, danach bewusst anwenden:

   ```bash
   node --env-file=/geschuetzter/pfad/sponsoring-ops.env \
     scripts/resend-signed-confirmation-links.mjs --scope=all_future

   node --env-file=/geschuetzter/pfad/sponsoring-ops.env \
     scripts/resend-signed-confirmation-links.mjs --scope=all_future --apply
   ```

   Die Zahl und Empfänger im Dry-Run prüfen. Stornierte, erstattete und Firmen-Spiegelzeilen werden ausgeschlossen. Erst danach darf die Website-Version live gehen, die unsignierte Altlinks bewusst ablehnt.

10. Vereinsliste zuerst im Dry-Run pruefen, dann importieren und einen vollstaendigen Testfall abnehmen.
11. Website, Dashboard und PDFs veroeffentlichen und erst nach bestandener Abnahme den Wartungsmodus beenden.

Ohne `SPONSOR_CODE_PEPPER` bricht nur der Sponsorpfad sicher ab; er faellt niemals auf eine kostenpflichtige Anmeldung zurueck. Ohne `CONFIRMATION_LINK_SECRET` wird jede Anmeldung vor dem Speichern abgebrochen, damit keine Buchung ohne sicher abrufbare Bestätigung entsteht.
`ADMIN_EMAILS` ist eine kommagetrennte Liste der Supabase-Login-Adressen, die Zahlungserinnerungen auslösen dürfen.

Sponsorcodes werden normalisiert und ausschliesslich als HMAC-SHA-256 gespeichert. Klartext-Codes stehen nur in der vom Verein uebermittelten Quelldatei und duerfen nicht in Logs, Notizen oder Supabase kopiert werden.

Die Vereinsdatei enthält Namen, Klartext-Codes und gegebenenfalls Geburtsdaten und ist damit zugleich personenbezogene Unterlage und Einlöse-Schlüssel. Sie nur über einen abgestimmten geschützten Kanal empfangen, in einem zugriffsbeschränkten/verschlüsselten Ordner ablegen, nicht per unverschlüsselter E-Mail weiterleiten und nach erfolgreichem Import entweder in das festgelegte geschützte Archiv verschieben oder die Arbeitskopie sicher löschen.

## ÖF-Gutscheinliste (Nummernformat "Talent TTMMJJJJ NNNN")

Die reale ÖF-Liste (Juli 2026) enthält keine Kindesnamen, nur Nachnamen bzw.
Einrichtungsnamen. Nummernformat: `Talent <Camp-Startdatum TTMMJJJJ> <4 Ziffern>`,
z. B. `Talent 20072026 1118` (20072026 = Sommercamp I, 24082026 = Sommercamp II).

- Import mit `--code-only`: Es zählt nur die vollständige Nummer + Camp;
  Namen dienen nur der Dokumentation. Jede Nummer ist einmal einlösbar.
- Eltern dürfen im Formular nur die **letzten 4 Ziffern** eingeben; die Edge
  Function ergänzt `TALENT` + Camp-Startdatum aus dem gewählten Camp.
- Konvertierte Datei: `gutschein-nummern-import.csv` (im Deploy und in Git
  ausgeschlossen). Import:

  ```bash
  node scripts/import-sponsoring-entitlements.mjs gutschein-nummern-import.csv --code-only
  node --env-file=/geschuetzter/pfad/sponsoring-ops.env \
    scripts/import-sponsoring-entitlements.mjs gutschein-nummern-import.csv --code-only --apply
  ```

- Bekannter Konflikt der Liste vom 10.07.2026: `Talent 20072026 2061` wurde vom
  Verein doppelt vergeben (Bazaiba **und** Sheptytska). In der CSV steht nur
  Bazaiba; für Sheptytska beim Verein eine neue Nummer anfordern und einzeln
  nachimportieren.
- Sicherheitsabwägung: 4-stellige Nummern sind kurz; Schutz besteht aus
  Einmal-Einlösung, persistentem Rate-Limit (20 Prüfungen/15 Min./IP) und
  Camp-Bindung. Abrechnungsabgleich mit dem Verein deckt Missbrauch auf.

## Vereinsliste importieren (Standardformat mit Kindesnamen)

Vorlage: `scripts/oecher-kenger-sponsoring-vorlage.csv`

Pflichtspalten der Vereinsliste:

- `vorname`
- `nachname`
- `code`: mindestens 16 zufaellige alphanumerische Zeichen; keine Namen, Geburtsjahre oder fortlaufenden Nummern

Optionale Spalten:

- `geburtsdatum`: `TT.MM.JJJJ` oder `JJJJ-MM-TT`; aus Datenschutz- und Matchinggruenden empfohlen
- `camp`: exakter Campname oder UUID, falls eine Datei mehrere Camps enthält

Das Camp bleibt technisch verbindlich, muss aber nicht vom Verein in jeder Zeile gepflegt werden. Bei einer Liste pro Camp legt TALENTEXPERTE den Camp-Scope beim Import einmalig mit `--camp` fest. Ein Code darf fuer mehrere Kinder in getrennten Zeilen stehen. Jede Zeile ist eine eigene, einmalig einloesbare Berechtigung.

Zuerst immer Dry-Run:

```bash
node scripts/import-sponsoring-entitlements.mjs /pfad/vereinsliste.csv --camp 'Ostercamp II'
```

Danach mit denselben Secrets anwenden:

```bash
node --env-file=/geschuetzter/pfad/sponsoring-ops.env \
  scripts/import-sponsoring-entitlements.mjs /geschuetzter/pfad/vereinsliste.csv \
  --camp 'Ostercamp II' --apply
```

Wiederholte Imports sind sicher: identische Berechtigungen werden uebersprungen. Das Script gibt weder Codes noch Code-Hashes aus.

## Technischer Ablauf

- `action: validate_sponsor` prueft Code + normalisierten Kindesnamen + verbindlichen Camp-Scope sowie optional das Geburtsdatum.
- Der finale Sponsor-Submit ruft die service-role-only RPC `redeem_sponsoring_entitlement_and_register` auf.
- RPC-Einloesung und Anmeldung sind atomar; parallele oder wiederholte Einloesungen erzeugen keine zweite Anmeldung.
- Codes laufen 30 Tage nach Camp-Ende ab; Codepruefungen werden zusätzlich persistent und ohne Klartext-IP begrenzt.
- Sponsor-Anmeldungen haben `payer_type=sponsor`, `parent_amount_euro=0`, `parent_payment_status=not_required`, `betrag_euro=0` und Legacy-`zahlungsstatus=bezahlt`.
- Neue Sponsorfaelle starten mit `sponsor_settlement_status=open`; historische `[TYP:ÖF]`-Faelle werden als `unclear` migriert.
- Die codefreie, nur server-/service-role-seitig lesbare View `sponsored_anmeldungen_dashboard` zeigt Sponsorbetraege, Buchungsstatus und Stornodatum separat in Supabase.
- Bestätigungslinks sind signiert, an die Buchungs-ID gebunden und nur bis 30 Tage nach Camp-Ende gültig; die Seite liest keine Anmeldedaten anonym direkt aus Supabase.

## Abnahme vor Freigabe der Codes

1. Gueltigen Code mit exakt passendem Kind/Camp pruefen: Elternanteil 0 Euro, kein Zahlungsbutton.
2. Bestaetigungs-Mail und PDF pruefen: „vollstaendig gesponsert“, „keine Zahlung erforderlich“, kein Paylink.
3. Falschen Namen, falsches Geburtsdatum und falsches Camp pruefen: Fehlermeldung, **keine** Anmeldung.
4. Denselben Code erneut pruefen: bereits verwendet, keine zweite Anmeldung.
5. Dashboard/View pruefen: Partner, Elternbetrag 0, Sponsorbetrag und Settlement klar sichtbar.
6. Zahlungserinnerung pruefen: Sponsorfaelle werden ausgeschlossen.
7. Bestätigungslink in einem neuen privaten Browserfenster öffnen: Sponsorstatus wird geladen, eine geänderte/fehlende Signatur zeigt keinerlei alte oder fremde Buchungsdaten.
8. Sponsorfall stornieren und erneut über den sicheren Link/PDF öffnen: klar „storniert“, Platz nicht reserviert, keine weitere Zahlung; niemals weiterhin „finanziert/reserviert“.
