# Aufbewahrungs- und Löschkonzept

Stand: 28. September 2026
Dokumentationsstatus: bestätigt durch Betreiberentscheidungen vom 27.09.2026 und 28.09.2026
Geltungsbereich: Supabase-Projekt `yxygwwoocsdnneqykiym`, Google Workspace, Postfach kontakt@talentexperte.de, Webserver

## Verbindliche Betreiberentscheidung (27.09.2026)

**Zu den Anmeldungen wird nichts automatisch gelöscht** – einzige Ausnahme sind die Allergie-/Gesundheitsangaben (siehe unten). Anmeldedaten (Eltern- und Firmenanmeldungen einschließlich aller Formularangaben), Teilnahme-/Anwesenheitsdaten, Förderberechtigungen, Zahlungs- und Rechnungsdaten sowie zugehörige E-Mails und Protokolle werden für Steuerberater und Finanzamt bis zum Ende der gesetzlichen Aufbewahrungsfristen aufbewahrt.

- Keine weitere Löschroutine, keinen weiteren pg_cron-Job und keine Anonymisierung von Anmeldedaten einführen (einzige Ausnahme: Allergieangaben, siehe unten). Eine am 27.09.2026 vorbereitete Routine (R1–R6) wurde **nicht** eingespielt und aus dem Repository entfernt.
- Löschung erst nach Ablauf der Aufbewahrungsfrist und nur nach ausdrücklicher Freigabe durch den Betreiber.
- Löschwünsche von Betroffenen: Daten, für die keine Aufbewahrungspflicht besteht, auf Anfrage löschen; aufbewahrungspflichtige Daten bis Fristende sperren (nur Aufbewahrung, keine weitere Nutzung). Vor jeder Löschung Betreiber fragen.

## Einzige Ausnahme: Allergie-/Gesundheitsangaben (Betreiberentscheidung 28.09.2026)

- **Nur** das Feld `allergien` (Eltern- und Firmenanmeldungen) wird **3 Monate nach Campende** geleert. Alle anderen Felder – auch `notizen`, `erfahrung`, Namen, Kontakt, Zahlung, Teilnahme – bleiben unverändert.
- Datenbank: `public.clear_expired_health_data()` (Migration `20260928090000_clear_expired_health_data.sql`), pg_cron-Job `clear-expired-health-data-daily` (03:30 UTC), Protokoll in `health_data_cleanup_runs`; entfernt den Schlüssel `allergien` auch aus Kopien in `security_audit_log`.
- Google: `code.gs` → `clearExpiredAllergies()` leert Spalte M der Tabelle und entfernt die Zeile „⚠️ ALLERGIEN: …“ aus der Kontaktnotiz (Label TALENTEXPERTE); Campende über `camp_verfuegbarkeit_public`, Campzuordnung über Name + Anmeldedatum; unklare Zuordnung → keine Änderung. Einrichtung im Apps-Script-Projekt: `previewAllergyCleanup()`, dann `setupAllergyCleanupTrigger()`.
- Erster Lauf 28.09.2026: 18 Eltern- und 2 Firmenanmeldungen (Ostercamp I/II) geleert; Gesamtzahl Anmeldungen (198), Notizen (93) und Teilnahmedaten (188) unverändert geprüft.

## Fristen (wie in `datenschutz.html`, Abschnitt 12)

| Daten | Aufbewahrung |
|---|---|
| Allergie-/Gesundheitsangaben (`allergien`, Tabelle Spalte M, Kontaktnotiz) | 3 Monate nach Campende, automatisch |
| übrige Anmelde-, Teilnahme-, Förder-, Zahlungs- und Rechnungsdaten (Supabase, Google-Tabelle/-Kontakte) | bis zum Ablauf der gesetzlichen Aufbewahrungsfristen: bis zu 10 Jahre ab Ende des Kalenderjahres (§ 147 AO, § 257 HGB; Buchungsbelege 8 Jahre, Handels-/Geschäftsbriefe 6 Jahre, Bücher/Aufzeichnungen 10 Jahre) |
| E-Mails inkl. BCC-Kopien der Bestätigungen | bis zu 6 Jahre (Geschäftsbriefe), soweit steuerlich relevant bis zu 10 Jahre |
| Bestätigungslinks | werden 30 Tage nach Campende ungültig (Datensatz bleibt) |
| Server-Logdateien (Hoster) | 7 Tage (tägliche Rotation, geprüft 27.09.2026) |
| Sitzungsspeicher im Browser | beim Schließen des Fensters |
| Fotos/Videos | bis zum Widerruf der Einwilligung |
