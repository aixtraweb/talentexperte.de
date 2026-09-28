# Social-Betrieb vorläufig pausiert

Stand: 2026-09-05
Status: anhand der eigenen Scheduler auf beiden Macs bestätigt
Geltungsbereich: bekannte TALENTEXPERTE-/Sommercamp-Zeitpläne

Der Nutzer hat Instagram-/Facebook-Posts ausdrücklich vorläufig eingestellt.
Keine Wiederaufnahme ohne neue Nutzeranweisung; ältere Saisonfreigaben und
der bisherige Standardbetrieb im Handbuch aktivieren keinen Zeitplan.

## Bestätigter Zustand

Codex: `sommercamp-social-content`, `sommercamp-social-publisher`,
`sommercamp-social-publisher-freitag` und `sommercamp-social-publisher-sonntag`
sind alle `PAUSED`.

MacBook, Benutzer-LaunchAgents:

- `de.talentexperte.sommercamp.plan`
- `de.talentexperte.sommercamp.publish`

Mac mini, Benutzer-LaunchAgents:

- `de.talentexperte.weekly-blog-social`
- `de.talentexperte.weekly-blog-social-once`

Alle vier waren geladen. `launchctl disable` und anschließend `bootout`
wurden erfolgreich ausgeführt. `launchctl print` findet die Dienste danach
nicht mehr geladen; `print-disabled` zeigt für alle vier `disabled`.
Dies verhindert die automatische Wiederaufnahme nach Anmeldung/Neustart.
Die kombinierten Mini-Jobs pausieren auch die zugehörige Blogproduktion.

Plists, Scripts, Entwürfe, bestehende Posts und Zugangsdaten bleiben erhalten.
Kein Social-Post, Website-Upload, Kontolöschung oder Tokenänderung.
Kein zusätzlicher passender GitHub-Workflow im versionierten Repo gefunden.

## Grenzen und spätere Wiederaufnahme

Direkt in Meta Business Suite eventuell geplante Veröffentlichungen wurden
hier nicht geprüft; die Pause ist für die oben genannten eigenen Scheduler
bestätigt. Wiederaufnahme erst nach Nutzerauftrag und Prüfung aktueller
Campdaten, Inhalte, Kanalidentität und aller Auslöser. Dabei einen führenden
Zeitplan wählen und Doppelausführungen ausschließen. Die alten Plists nicht
allein aufgrund ihrer Existenz neu aktivieren.
