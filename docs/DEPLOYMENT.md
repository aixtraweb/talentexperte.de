# Deployment und Umgebungen

Stand: 18. Juli 2026
Dokumentationsstatus: bestätigt für Skripte und dokumentierten Ablauf; Live-Zugänge nicht geprüft
Geltungsbereich: Website, Supabase, Migrationen, E-Mail/Social und Rollbackgrenzen

## Zustandsänderungen sind getrennt

| Aktion | Wirkung | Autorisierung |
|---|---|---|
| Git-Push | synchronisiert Repository | Standardabschluss für aufgabenbezogene Repo-Änderungen |
| `ci/deploy.sh` | ersetzt öffentlichen Website-Webroot nach Allowlist | nur bei Website-Deployment-Auftrag/Freigabe |
| Supabase Migration | verändert Datenbank/RLS/Trigger | separat prüfen und anwenden |
| Function-Deploy | ersetzt serverseitige API-Logik | separat prüfen und deployen |
| E-Mail-/Social-Publish | kommuniziert extern | nur ausdrücklich/konfiguriert freigegeben |

Keine dieser Aktionen impliziert eine andere.

## Website-Deployment

```bash
./ci/deploy.sh
```

Das Skript:

1. verbindet sich zum dokumentierten Hostingwerk-Host;
2. erstellt ein tar.gz-Backup des aktuellen Webroots;
3. überträgt nur die Positivliste mit `rsync --delete --delete-excluded`;
4. schützt `.well-known`;
5. prüft, dass interne Kernpfade fehlen;
6. behält die letzten drei Backups.

Zielpfade und Benutzer stehen ausschließlich im Skript/Handbuch; keine Zugangsdaten dokumentieren.

## Aktuelle Allowlist

- Root: ausgewählte HTML-Seiten, `robots.txt`, `sitemap.xml`, `llms.txt`, `.htaccess`.
- vollständig: `css/`, `fonts/`, `pdf/`, `favicon/`, `camps-in/`, `newsreader/`.
- `images/` mit Ausnahme `images/social-input/`.
- aus `ci/` nur drei Logos.

Nicht öffentlich: Markdown, `scripts/`, `supabase/`, Paketdateien, Logs, Drafts, Automationsdaten, private Steuer-/Exportdaten und Secrets.

> **Risiko:** Unter `images/` liegen neben optimierten Webbildern große JPEG/MOV/MP4- und PSD-Dateien. Die Positivliste kann diese veröffentlichen und Bandbreite/Webroot unnötig vergrößern.
> **Vorläufiges Verhalten:** vor jedem Deploy rsync-Dry-Run/Dateiliste und Größen prüfen; keine Datei ungeprüft löschen.
> **Erforderliche Klärung:** explizite Webasset-Allowlist oder Trennung von Roh- und Produktionsmedien planen.

## Vor Website-Deployment

- Git-Status und aufgabenbezogenen Diff prüfen.
- relevante lokale Tests und visuelle QA bestehen.
- `npm run test:security` bei sicherheits-/formularrelevanten Änderungen.
- `CHECK_DEPLOYMENT=1`-Test nur bewusst gegen Live ausführen.
- Camp-, Preis- und Schemaangaben live/gegen Supabase prüfen, falls betroffen.
- keine Secrets/PII/internen Dateien in Allowlist oder Medienpfaden.
- Backupziel erreichbar und Remote-Webroot exakt.

## Nach Website-Deployment

- Startseite, Anmeldung, Rechtstexte, CSS, robots, Sitemap und betroffene Seiten mit HTTP 200 prüfen.
- interne Pfade (`/package.json`, `/supabase/…`, `/scripts/…`, Markdown, Backups) müssen 403/404 liefern.
- CSP vorhanden; Hosting-Header prüfen.
- Hash/Dateiinhalt betroffener Artefakte bei hohem Risiko vergleichen.
- Anmeldung/Formular nur mit kontrolliertem Testfall prüfen; keine echte Kommunikation unbeabsichtigt auslösen.

## Supabase-Rollout

1. verknüpftes Projekt und Live-Schema/Policies bestimmen;
2. Migration und Function-Abhängigkeiten gemeinsam prüfen;
3. Secrets über geschützte Dateien/Dashboard setzen, nie inline dokumentieren;
4. Migrationen in Reihenfolge anwenden;
5. öffentliche Functions nur mit eigener Token-/Spam-/Signaturlogik `--no-verify-jwt` deployen;
6. Admin-Functions mit JWT/Admin-Allowlist oder serverseitigem Secret schützen;
7. negative Zugriffs-, Replay-, Signatur- und private-Tabellen-Tests;
8. kontrollierte Testanmeldung/-bestätigung/-zahlung.

## Rollback

- Website: vorangegangenes Remote-Backup; exakten Backupnamen aus dem jeweiligen Lauf verwenden, nicht einen historischen Namen aus Markdown.
- Functions: vorige Function-Version zusammen mit kompatiblem Schema bewerten.
- Migrationen sind überwiegend additiv; Tabellen/Spalten/Logs nicht ohne Datenexport löschen.
- Stripe-/E-Mail-Aktion kann nicht durch Git-Rollback rückgängig gemacht werden; externen Zustand separat behandeln.

## Rollout Zahlungsfrist-Workflow

Der Workflow wird ausschließlich in dieser Reihenfolge aktiviert:

1. tatsächliche TALENTEXPERTE-Identität und Testmodus für Supabase, Stripe und Resend bestätigen;
2. Migration `20260719170000_add_payment_deadline_workflow.sql` prüfen und anwenden;
3. Migration `20260720160000_make_payment_deadline_policy_prospective.sql` anwenden; ihr `active_from` ist die verbindliche Grenze, vor der keine bestehende Anmeldung automatisch verarbeitet werden darf;
4. `register`, `send-reminder`, `process-email-outbox` und `send-missing-confirmations` deployen;
5. Website-Dateien deployen, damit Fristtexte und Zahlungslinkprüfung zum Backend passen;
6. `PAYMENT_DEADLINE_PROCESSOR_SECRET` setzen und `process-payment-deadlines` mit eigener Secret-Prüfung als `--no-verify-jwt` deployen;
7. die zunächst deaktivierten, geheimnisgeschützten 15-Minuten-Zeitpläne aus den Migrationen `20260720143000` und `20260720150000` für `process-payment-deadlines` und `process-email-outbox` prüfen; beide Bearer-Secrets müssen mit den gleichnamigen Edge-Secrets übereinstimmen und ausschließlich in Supabase Vault liegen;
8. den Prozessor zunächst mit `{ "dry_run": true }` aufrufen und prüfen, dass `policy_active_from` gesetzt ist und keine Anmeldung mit älterem `created_at` als Kandidat erscheint; dieser Lauf sendet keine E-Mail, ändert keinen Zahlungsstatus und gibt keinen Platz frei;
9. Testfälle offen → erinnert → bezahlt sowie offen → erinnert → freigegeben ausschließlich mit nach `policy_active_from` angelegten kontrollierten Testdaten vollständig prüfen;
10. erst danach beide Zeitpläne über `set_payment_workflow_jobs_enabled(true)` aktivieren und Runresultate/Outbox überwachen. `get_payment_workflow_job_status()` liefert den gespeicherten Sollstatus; zum Stoppen wird derselbe Schalter mit `false` aufgerufen.

Rollback: zuerst den Zeitplan deaktivieren. Bereits gesendete Letztfristen oder Stornierungen nicht durch Code-Rollback kaschieren; betroffene Datensätze und Elternkommunikation einzeln prüfen.

Produktiver Sollstand vom 20.07.2026: beide Jobs laufen alle 15 Minuten, berücksichtigen aber ausschließlich Anmeldungen ab `payment_deadline_policy.active_from`. Bestehende Anmeldungen werden unabhängig von bereits vorhandenen Workflow-Feldern nicht automatisch verarbeitet. Die Secret-Werte dürfen weder in Shell-Historie noch Dokumentation, Logs oder Git erscheinen.

## Hosting-Header

- `.htaccess` enthält Defense-in-depth für Apache-kompatible Profile.
- `ci/nginx-security-headers.conf` enthält die nginx-Vorlage.
- Laut `SECURITY-IMPLEMENTATION.md` war die Hosting-Freigabe zuletzt offen.
- Headeränderung nur nach Domain-, SSL-, Redirect-, CSP- und Einbettungsprüfung speichern.

## Deployment ist abgeschlossen, wenn

- Backup bestätigt;
- nur erlaubte Artefakte übertragen;
- interne/sensible Pfade nicht öffentlich;
- Smoke-URLs, CSP/Headers und betroffene Nutzerpfade geprüft;
- Ergebnis und ggf. Rollbackpunkt dokumentiert;
- Git-/Supabase-/Kommunikationsstatus getrennt berichtet.
