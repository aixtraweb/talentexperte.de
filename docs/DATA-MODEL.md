# Datenmodell und fachliche Invarianten

Stand: 18. Juli 2026
Dokumentationsstatus: teilweise bestätigt
Geltungsbereich: im Repository belegte Supabase-Objekte und Statuslogik

## Abgrenzung

Das Repository enthält nur Migrationen ab Juli 2026, nicht die vollständige ursprüngliche Erzeugung aller Basistabellen. Spalten, die nur in Frontend/Functions/Runbooks vorkommen, sind deshalb **abgeleitet**, sofern keine aktuelle Migration sie definiert. Vor Schemaänderungen ist das Live-Schema in Supabase zu prüfen.

## Kernobjekte

| Objekt | Status | Zweck und wesentliche Felder |
|---|---|---|
| `camps` | Abgeleitet/Bestätigt | Campstammdaten: `id`, Name, Datums-/Zeitbereich, Ort/Adresse, Preis/Frühbucherpreis, Stripe-Link, Status, Kapazität |
| `anmeldungen` | Abgeleitet/Bestätigt | Eltern- und Sponsorregistrierung; Legacy- und kanonische Finanzfelder |
| `firmen_anmeldungen` | Abgeleitet/Bestätigt | kanonische Firmen-/Mitarbeiterregistrierung ohne Elternzahlung |
| `teilnahme` | Abgeleitet | Anwesenheit als JSONB sowie `sprint`, `torschuss`, `dribbling`; Schlüssel aus Referenz, Quelle und Camp |
| `camp_verfuegbarkeit_public` | Bestätigt | öffentlich lesbare Campmetadaten und aggregierte Verfügbarkeit |
| `sponsoring_partners` | Bestätigt | Sponsorpartner und Aktivstatus |
| `sponsoring_entitlements` | Bestätigt | gehashte, campgebundene, einmalige Berechtigungen |
| `dashboard_admins` | Bestätigt | zusätzliche Admin-Allowlist |
| `confirmation_tokens` | Bestätigt | widerrufbare gehashte Bestätigungstokens |
| `form_submission_nonces`, `form_rate_limits` | Bestätigt | Replay- und Rate-Limit-Schutz |
| `sponsoring_validation_limits` | Bestätigt | persistentes Sponsorcode-Limit ohne Klartextcode/IP |
| `stripe_webhook_events` | Bestätigt | Stripe-Idempotenz- und Zuordnungsjournal |
| `email_campaign_runs` | Bestätigt | einmalige Kampagnenläufe/Versandstatus |
| `email_outbox` | Bestätigt | private Wiederholungswarteschlange für E-Mails |
| `security_audit_log` | Bestätigt | privates Änderungsjournal sensibler Datensätze |
| `google_sheet_sync_runs` | Bestätigt | Idempotenzjournal des Sheets-Exports |

## Kanonische Finanzlogik für `anmeldungen`

### Elternzahlung

```text
payer_type = 'parent'
parent_payment_status ∈ {'open','paid','cancelled','refunded'}
parent_amount_euro > 0 für zahlungspflichtige Buchungen
```

Eine offene Elternforderung ist nur bestätigt, wenn `payer_type='parent'`, `parent_payment_status='open'`, `parent_amount_euro>0` und der Datensatz zum geprüften Camp gehört. Vor Versand zusätzlich Stripe abgleichen.

### Sponsoring

```text
payer_type = 'sponsor'
parent_amount_euro = 0
parent_payment_status = 'not_required'
sponsor_amount_euro >= 0
sponsor_settlement_status ∈ {'open','invoiced','paid','unclear'}
```

Sponsorstatus und Sponsorabrechnung sind von Elternzahlung getrennt. Sponsorfall niemals zu Stripe weiterleiten oder als offene Elternforderung anschreiben.

### Firma

- Kanonische Quelle: `firmen_anmeldungen`.
- Elternzahlung ist nicht erforderlich.
- Historische Spiegelzeilen in `anmeldungen` dürfen nicht doppelt gezählt werden.

### Legacy-Felder

- **Bestätigt:** `zahlungsstatus` existiert; eine Spalte `status` existiert in `anmeldungen` nicht.
- **Bestätigt:** `betrag_euro` ist ein Legacy-/Kompatibilitätsfeld.
- **Bestätigt:** Legacy-`zahlungsstatus='bezahlt'` beweist bei Sponsor/Firma keine Elternzahlung.
- **Bestätigt:** `normalize_anmeldung_finance_fields()` und `sync_anmeldungen_payment_status()` halten kanonische und Legacy-Werte konsistent und schützen terminale Zustände.

## Buchungs- und Sicherheitsinvarianten

- **Bestätigt:** Datenbanktrigger serialisieren Buchungen pro Camp und prüfen Kapazität/Duplikate.
- **Bestätigt:** Sponsorberechtigung und Anmeldung werden atomar verknüpft; ein Code darf nicht doppelt eingelöst werden.
- **Bestätigt:** Stripe Payment Intent darf höchstens einer Anmeldung zugeordnet sein.
- **Bestätigt:** Bestätigungs- und private Journaltabellen sind nicht anonym lesbar.
- **Bestätigt:** sensible Inserts/Updates/Deletes werden auditierbar gemacht.
- **Bestätigt:** Stornieren bewahrt Historie; Löschen ist nur für echte Fehleinträge gedacht.

## Relevante Funktionen/RPCs

- `is_dashboard_admin()` – Allowlist-Prüfung.
- `consume_form_nonce()` und `consume_form_rate_limit()` – Formularschutz.
- `validate_sponsoring_entitlement()` und `redeem_sponsoring_entitlement_and_register()` – Sponsorprüfung/atomare Einlösung.
- `normalize_anmeldung_finance_fields()` – kanonische Finanznormalisierung.
- `sync_anmeldungen_payment_status()` – Schutz der Statussynchronisierung.
- `guard_anmeldung_booking()` und `guard_company_booking()` – Camp-/Kapazitäts-/Duplikatregeln.
- `dashboard_delete_registration()` – kontrolliertes Löschen.

## Live zu verifizieren

> **Offen:** vollständige Spaltenlisten, Constraints und Policies der vor Juli 2026 angelegten Basistabellen.
> **Vorläufiges Verhalten:** vor jeder Datenmodelländerung `information_schema`, `pg_policies` und aktuelle Migrationen vergleichen.
> **Risiko:** Dokumentation oder Frontend allein können ein unvollständiges Schema suggerieren.
> **Erforderliche Klärung:** optional einen ausschließlich schemaorientierten, geheimnisfreien Supabase-Dump versionieren.

## Nicht als aktuelle Datenquelle verwenden

Zahlen in `CHANGELOG.md`, `STRIPE-SUPABASE-STATUS.md`, CSVs, Google-Diensten oder Chat-Zusammenfassungen sind historische Nachweise, nicht aktueller Teilnehmer-, Zahlungs- oder Kapazitätsstand.
