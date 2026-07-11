# Blog- und Social-Automatisierung

Lokale Mac-mini-Automatisierung fuer woechentliche Blog-Entwuerfe plus Instagram/Facebook-Post.

## Grundprinzip

- `npm run weekly:blog-social` erstellt einen Blog-Entwurf, ein Social-Bild mit Text/Logo und einen Social-Draft.
- Standard ist bewusst Vorschau-Modus: Es wird nichts live veroeffentlicht.
- Die Ergebnisse liegen in `drafts/`, `automation-runs/` und `images/social-output/`.
- `social-posts.json` wird erst geschrieben, wenn Blog oder Social-Autopublishing aktiviert ist.
- Nach erfolgreichem Lauf erscheint eine macOS-Mitteilung auf dem Mac mini.

## Mac mini vorbereiten

1. Repository auf dem Mac mini aktuell halten.
2. `.env.automation.example` nach `.env.automation` kopieren.
3. Pfad `PROJECT_DIR` pruefen.
4. `.env.social` mit Meta-Zugangsdaten muss ebenfalls auf dem Mac mini vorhanden sein.
5. Python-Abhaengigkeiten installieren: `npm run automation:install-deps`.
6. Energiesparen so einstellen, dass der Mac mini fuer die Ausfuehrung wach ist.

## Manuell testen

```bash
cd /Users/alejandromedina/TALENTEXPERTE/talenexperte.de
npm run weekly:blog-social
```

## Launchd installieren

```bash
cd /Users/alejandromedina/TALENTEXPERTE/talenexperte.de
npm run launchd:install:blog-social
```

Der LaunchAgent startet montags um 08:00 Uhr und schreibt Logs nach `logs/weekly-blog-social.log` und `logs/weekly-blog-social.err.log`.

## Benachrichtigungen

Standard:

```bash
ENABLE_MACOS_NOTIFICATION=1
```

Optional kann in `.env.automation` zusaetzlich `NOTIFY_EMAIL` oder `NOTIFY_WEBHOOK_URL` gesetzt werden. Test:

```bash
npm run automation:notify:test
```

## Spaeter live schalten

In `.env.automation`:

```bash
AUTO_PUBLISH_BLOG=1
AUTO_DEPLOY=1
AUTO_POST_SOCIAL=1
```

`AUTO_POST_SOCIAL=1` setzt `AUTO_DEPLOY=1` voraus, damit das generierte Bild zuerst oeffentlich erreichbar ist.
