# Aufbewahrungs- und Löschkonzept

Stand: 27. September 2026
Dokumentationsstatus: bestätigt durch Betreiberentscheidung vom 27.09.2026
Geltungsbereich: Supabase-Projekt `yxygwwoocsdnneqykiym`, Google Workspace, Postfach kontakt@talentexperte.de, Webserver

## Verbindliche Betreiberentscheidung (27.09.2026)

**Zu den Anmeldungen wird nichts automatisch gelöscht.** Anmeldedaten (Eltern- und Firmenanmeldungen einschließlich aller Formularangaben), Teilnahme-/Anwesenheitsdaten, Förderberechtigungen, Zahlungs- und Rechnungsdaten sowie zugehörige E-Mails und Protokolle werden für Steuerberater und Finanzamt bis zum Ende der gesetzlichen Aufbewahrungsfristen aufbewahrt.

- Keine Löschroutine, kein pg_cron-Job und keine Anonymisierung von Anmeldedaten einführen. Eine am 27.09.2026 vorbereitete Routine (R1–R6) wurde **nicht** eingespielt und aus dem Repository entfernt.
- Löschung erst nach Ablauf der Aufbewahrungsfrist und nur nach ausdrücklicher Freigabe durch den Betreiber.
- Löschwünsche von Betroffenen: Daten, für die keine Aufbewahrungspflicht besteht, auf Anfrage löschen; aufbewahrungspflichtige Daten bis Fristende sperren (nur Aufbewahrung, keine weitere Nutzung). Vor jeder Löschung Betreiber fragen.

## Fristen (wie in `datenschutz.html`, Abschnitt 12)

| Daten | Aufbewahrung |
|---|---|
| Anmelde-, Teilnahme-, Förder-, Zahlungs- und Rechnungsdaten (Supabase, Google-Tabelle/-Kontakte) | bis zum Ablauf der gesetzlichen Aufbewahrungsfristen: bis zu 10 Jahre ab Ende des Kalenderjahres (§ 147 AO, § 257 HGB; Buchungsbelege 8 Jahre, Handels-/Geschäftsbriefe 6 Jahre, Bücher/Aufzeichnungen 10 Jahre) |
| E-Mails inkl. BCC-Kopien der Bestätigungen | bis zu 6 Jahre (Geschäftsbriefe), soweit steuerlich relevant bis zu 10 Jahre |
| Bestätigungslinks | werden 30 Tage nach Campende ungültig (Datensatz bleibt) |
| Server-Logdateien (Hoster) | 7 Tage (tägliche Rotation, geprüft 27.09.2026) |
| Sitzungsspeicher im Browser | beim Schließen des Fensters |
| Fotos/Videos | bis zum Widerruf der Einwilligung |

## Hinweis (nicht umgesetzt, nur zur Entscheidung)

Allergie- und Gesundheitsangaben sind für Steuerberater und Finanzamt in der Regel nicht erforderlich. Datenschutzrechtlich wäre es sauberer, nur diese Freitextfelder nach dem Camp zu leeren. Umsetzung ausschließlich nach ausdrücklicher Betreiberfreigabe.
