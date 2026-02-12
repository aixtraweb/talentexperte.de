# www.talentexperte.de -- Website Repository

## Überblick

Dieses Repository enthält den vollständigen **statischen Website-Code**
von:

**www.talentexperte.de**

Die Seite besteht aus:

-   HTML-Dokumenten\
-   CSS-Stylesheets\
-   Bildern & Fonts\
-   PDFs und statischen Assets

Es werden **keine Build-Tools, kein CMS und kein Node-Stack** verwendet.

------------------------------------------------------------------------

## Projektstruktur

    repo/
    ├── *.html
    ├── css/
    ├── images/
    ├── fonts/
    ├── pdf/
    ├── favicon/
    ├── ci/
    │   └── deploy.sh
    └── .gitignore

**Nicht im Repository enthalten:**

-   Rohdaten & Design-Dateien → `../assets/`
-   Dokumentation & Notizen → `../notes/`

------------------------------------------------------------------------

## Lokale Entwicklung

Projektpfad:

    /Users/alejandromedina/PROJEKTENTWICKLUNG/www.talentexperte.de/repo

Änderungen testen direkt lokal im Browser durch Öffnen der HTML-Dateien.

------------------------------------------------------------------------

## Git-Workflow

### Änderungen committen

    git add .
    git commit -m "Kurzbeschreibung der Änderung"
    git push

### Auf anderem Rechner weiterarbeiten

    git pull

------------------------------------------------------------------------

## Deployment

Deploy-Script:

    ci/deploy.sh

### Deploy-Ablauf

1.  Automatisches **Remote-Backup** (tar.gz, timestamped)\
2.  Synchronisation per **rsync --delete**\
3.  Ausschluss von:
    -   `.git`
    -   `.DS_Store`
    -   `ci/`

### Deploy ausführen

    ./ci/deploy.sh

------------------------------------------------------------------------

## Server-Informationen

-   **Host:** r20.hostingwerk.de\
-   **User:** medina-82\
-   **Document Root:**

```{=html}
<!-- -->
```
    /srv/www/medina-82/public/talentexperte

Backups liegen unter:

    /srv/www/medina-82/backups/talentexperte/

------------------------------------------------------------------------

## Sicherheit

-   SSH-Key-Authentifizierung (kein Passwort-Login)
-   Alias in `~/.ssh/config`:

```{=html}
<!-- -->
```
    Host talentexperte

------------------------------------------------------------------------

## Ziel des Setups

Dieses Repository folgt einer **minimalen, wartbaren
Agentur-Architektur**:

-   statische, performante Website\
-   versionierter Quellcode\
-   reproduzierbares Deployment\
-   automatische Backups\
-   klare Trennung von Code, Assets und Dokumentation

Damit ist das Projekt **skalierbar, sicher und langfristig wartbar**.
