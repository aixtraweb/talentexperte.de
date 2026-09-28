# Sicherheits-Härtung 2026-07

## Ziel

Diese Umsetzung schließt die im Audit vom 13.07.2026 festgestellten Risiken,
ohne Anmeldung, Bestätigung, Zahlungsaufforderung, Supabase oder Dashboard zu
entfernen. Änderungen werden in der priorisierten Reihenfolge umgesetzt und
vor der Freigabe mit Funktions-, Typ-, Syntax- und Live-Zugriffstests geprüft.

## Umsetzungsstand

| Priorität | Bereich | Umgesetzt | Nachweis |
|---|---|---|---|
| P0 | Deployment | Positivliste, `--delete-excluded`, Backup, Schutz für `.well-known`, Ausschluss von Quellen, Finanzexporten und Social-Inputs | Live-Aufrufe interner Dateien liefern 403/404 |
| P0 | Review-Mails | Dashboard-Adminprüfung, einmaliger Versandlauf, `force` nur bewusst, Versandprotokoll | Anonymer Aufruf liefert 401 |
| P0 | Stripe | Signaturprüfung, Eventjournal, exakte UUID-, Betrag-, Währungs- und Payment-Intent-Zuordnung; kein E-Mail-Fallback | Ungültiger Webhook liefert 400; DB-Update ist auf genau eine offene Buchung begrenzt |
| P1 | Firmenbestätigung | Widerrufbarer Hash-Token im URL-Fragment; keine PII in Query oder LocalStorage | Ungültiger Token liefert 403 |
| P1 | Buchung | Transaktionale DB-Trigger mit Camp-Sperre, Kapazitäts- und Duplikatprüfung für Eltern- und Firmenbuchungen | Gleichzeitige Inserts werden pro Camp serialisiert |
| P1 | Refund/Audit | Stripe-Erstattung nur über Admin-Function; Status erst nach Stripe-Erfolg; Änderungsjournal und Erstattungsgrund | Anonymer Refund liefert 401 |
| P2 | Plattform | Persistente Rate Limits, Einmal-Nonces, widerrufbare Tokens, eingeschränkte Grants und E-Mail-Outbox | Replay liefert 409; private Tabellen liefern 401 |
| P2 | Dashboard/UI | Verknüpfte Labels, Tastaturwahl, Fokusführung, Live-Status, reduzierte Animationen und transaktionales Löschen | HTML-/JS-Syntaxtests bestehen |

## Produktionsänderungen am 13.07.2026

- Supabase-Migrationen `20260713090000` und `20260713103000` wurden angewendet.
- `register`, `company-register`, `stripe-webhook`, `send-google-review-request`,
  `send-reminder`, `send-missing-confirmations`, `stripe-payment-search`,
  `admin-payment-action` und `process-email-outbox` wurden neu deployed.
- Der zuvor nur durch eine allgemeine JWT-Prüfung geschützte Google-Sheets-
  Export akzeptiert nur noch die automatische Service-Role oder einen
  freigeschalteten Dashboard-Admin und führt ein Idempotenzjournal.
- Die funktionslosen Alt-Endpunkte `send-reminders` (Hello-World) und
  `send-ostercamp2-campaign` (dauerhaft 410) wurden aus Supabase entfernt.
- `REGISTRATION_FORM_SECRET`, `ADMIN_FUNCTION_SECRET` und
  `OUTBOX_PROCESSOR_SECRET` wurden als Supabase-Secrets neu gesetzt.
- Der statische Webroot wurde gesichert und aus der Positivliste neu aufgebaut.
  Zuvor öffentlich vorhandene Repository-, Supabase-, Git- und
  Steuerunterlagen wurden aus dem Document Root entfernt.
- Die CSP ist in allen ausgelieferten HTML-Seiten aktiv. Die nginx-Konfiguration
  für HSTS, `nosniff`, Frame-Schutz, Referrer- und Permissions-Policy liegt unter
  `ci/nginx-security-headers.conf` bereit.

## Sicherheitsinvarianten

- Der Browser erhält niemals Service-Role-, Stripe- oder Resend-Secrets.
- Öffentliche Formulare schreiben ausschließlich über validierende Edge Functions.
- Eine Zahlung darf genau eine Elternanmeldung und genau einen Payment Intent betreffen.
- Sponsor- und Firmenplätze erzeugen niemals eine Elternzahlungsaufforderung.
- Personenbezogene Bestätigungsdaten werden nur nach Prüfung eines widerrufbaren Tokens geliefert.
- Löschen, Statuswechsel, Erstattung und Finanzänderungen sind nachvollziehbar.
- Produktionsdeployments enthalten nur statische, öffentlich benötigte Dateien.

## Rollout-Reihenfolge

1. Deployment-Positivliste ausrollen und öffentlich erreichbare interne Dateien entfernen.
2. Datenbankmigrationen anwenden.
3. Geschützte Edge Functions deployen; öffentliche Funktionen bewusst mit eigener Authentifizierung.
4. Statische Website deployen.
5. Negativtests, Testanmeldung, Testbestätigung und Stripe-Testzahlung durchführen.
6. Dashboard-Lesezugriff, Statuswechsel, Anwesenheit und Auditprotokoll prüfen.

Ein Git-Push ist kein Produktionsdeployment. Vor jedem Produktionsschritt werden
Migrationen und Function-Konfiguration gegen das verknüpfte Supabase-Projekt geprüft.

## Betrieb

- Negativ- und Zugriffstests: `npm run test:security`
- Zusätzliches Live-Webroot-Audit: `npm run test:security:deployment`
- Fehlgeschlagene Transaktionsmails liegen privat in `email_outbox`. Ein Admin
  kann sie im Dashboard über **E-Mail-Warteschlange** erneut verarbeiten.
- Der Outbox-Prozessor beansprucht Einträge atomar, nutzt bei Resend einen
  Idempotency-Key und setzt abgebrochene Läufe nach 15 Minuten wieder frei.
- Erstattungen werden ausschließlich über die Erstattungsaktion im Dashboard
  ausgelöst. Bei einem Stripe-Erfolg mit anschließendem DB-Fehler nennt die
  Function die Refund-ID und fordert eine sofortige manuelle Prüfung.
- Das Auditjournal enthält sensible Vorher-/Nachher-Daten und ist ausschließlich
  für die Service Role sichtbar. Die Aufbewahrung muss in das betriebliche
  Löschkonzept aufgenommen werden.

## Noch erforderliche Hosting-Freigabe

Das Hosting läuft derzeit als reines nginx-Profil; `.htaccess`-Header werden
deshalb nicht übernommen. Die CSP wirkt bereits als HTML-Meta-Policy. Für HSTS,
`X-Content-Type-Options`, `X-Frame-Options`, Referrer- und Permissions-Policy muss
im Hostingwerk-Control-Panel entweder die bereitgestellte nginx-Konfiguration
eingebunden oder für diese Domain das nginx+Apache-Profil aktiviert werden.
Diese Änderung erfordert die separate Hostingwerk-Anmeldung und darf erst nach
Prüfung der Domain-, SSL- und Redirect-Einstellungen gespeichert werden.

## Rollback

- Webroot: Backup unter
  `/srv/www/medina-82/backups/talentexperte/backup_2026-07-13_08-20-23.tar.gz`.
- Edge Functions: Supabase hält die vorherigen Function-Versionen; bei einem
  Rollback müssen Migration und Function-Version gemeinsam bewertet werden.
- Die Migrationen sind additiv. Neue Tabellen/Spalten nicht ohne vorherigen
  Datenexport löschen; Trigger können im Notfall einzeln deaktiviert werden.
