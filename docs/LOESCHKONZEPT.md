# Löschkonzept

Stand: 27. September 2026
Dokumentationsstatus: festgelegt auf Betreiberanweisung; automatische Regeln R1–R6 vorbereitet (Migration `20260927120000_add_retention_policy.sql`), Aktivierung siehe unten
Geltungsbereich: Supabase-Projekt `yxygwwoocsdnneqykiym`, Google Workspace, Postfach kontakt@talentexperte.de, Webserver

## Grundsätze

- Daten nur so lange wie für den Zweck nötig; gesetzliche Aufbewahrung geht vor, dann nur noch Aufbewahrung.
- Fristen beginnen mit dem **Campende** (`camps.datum_bis`) bzw. mit dem **Ende des Kalenderjahres** des Camps (Verjährung/Aufbewahrung).
- Gesundheitsangaben (Allergien) werden am frühesten gelöscht.
- Löschen schließt Kopien ein (Sicherheitsprotokoll, Warteschlange, Google, Postfach).

## Fristen

| Nr. | Daten | Ort | Frist | Umsetzung |
|---|---|---|---|---|
| R1 | Allergien/Unverträglichkeiten/Besonderheiten, Freitext-Hinweise (`allergien`, `notizen`; Marker `[TYP:…]` bleiben) | `anmeldungen`, `firmen_anmeldungen`, Kopien in `security_audit_log` | 3 Monate nach Campende | automatisch (`apply_retention_policy`) |
| R2 | Anwesenheit, Sprint/Torschuss/Dribbling | `teilnahme` + Protokollkopien | 12 Monate nach Campende | automatisch |
| R3 | Bestätigungslinks (Token-Hashes) | `confirmation_tokens` | 30 Tage nach Ablauf (Ablauf = Campende + 30 Tage) | automatisch |
| R4 | Formular-Schutzdaten | `form_submission_nonces`, `form_rate_limits` | 30 Tage | automatisch |
| R5 | E-Mail-Warteschlange inkl. Inhalt | `email_outbox` | 90 Tage nach Versand | automatisch |
| R6 | Sicherheitsprotokoll | `security_audit_log` | 12 Monate | automatisch |
| R7 | Anmeldedaten (Kind, Elternteil, Kontakt), Förderberechtigungen | `anmeldungen`, `firmen_anmeldungen`, `sponsoring_entitlements` | 3 Jahre nach Ende des Camp-Jahres (Verjährung § 195 BGB), danach Anonymisierung; zahlungsrelevante Angaben (Name Zahler, Betrag, Datum, Camp, Zahlungs-IDs, Rechnungsnummer) bis 8 Jahre nach Ende des Jahres (§ 147 AO, § 257 HGB) | **noch manuell** – erster Fall fällig am 01.01.2030; Anonymisierung muss die Trigger `enforce_registration_entitlement_match` (Identität gesponserter Anmeldungen unveränderlich) berücksichtigen |
| R8 | Stripe-Webhook-Journal | `stripe_webhook_events` | 8 Jahre nach Ende des Jahres | noch manuell (keine Namen, nur IDs/Beträge) |
| R9 | Google-Tabelle und Google-Kontakte | Google Workspace | wie R7: Kontakte 3 Jahre nach letztem Camp | manuell, jährlich im Januar |
| R10 | E-Mails im Postfach (inkl. BCC-Kopien der Bestätigungen) | kontakt@talentexperte.de | 6 Jahre (Handels-/Geschäftsbriefe, § 257 HGB), danach löschen | manuell, jährlich im Januar |
| R11 | Server-Logdateien | Webserver (hostingwerk) | 7 Tage (tägliche Rotation, geprüft 27.09.2026) | durch Hoster |
| R12 | Sitzungsspeicher im Browser | Endgerät | beim Schließen des Fensters | technisch |
| R13 | Fotos/Videos | Website, Social Media | bis zum Widerruf der Einwilligung | manuell auf Anfrage |

## Technik

- `public.retention_counts()` – nur Zählwerte je Regel.
- `public.retention_preview()` – Zählwerte + Eintrag in `retention_runs`.
- `public.apply_retention_policy()` – führt R1–R6 aus, bereinigt Protokollkopien, schreibt Vorher/Nachher-Zählwerte in `retention_runs`.
- Alle Funktionen `security definer`, für `anon`/`authenticated` gesperrt.
- Zeitplan: `supabase/migrations/20260927121000_schedule_retention_policy.sql` (täglich 03:30 UTC via pg_cron).

## Aktivierung

1. Migration `20260927120000_add_retention_policy.sql` einspielen (legt nur Funktionen/Tabelle an).
2. `select public.retention_preview();` prüfen.
3. Probelauf ohne Wirkung: `do $$ declare r jsonb; begin r := public.apply_retention_policy(); raise exception 'ROLLBACK_TEST %', r; end $$;`
4. Nach Freigabe: Zeitplan-Migration einspielen (erster Lauf löscht u. a. Allergieangaben der Oster- und Sommercamps 2026 – nicht umkehrbar).
