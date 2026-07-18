# Designsystem

Stand: 18. Juli 2026
Dokumentationsstatus: bestätigt für den aktuellen CSS-Bestand; einzelne Markenparameter sind offen
Geltungsbereich: öffentliche Seiten, Formulare, Bestätigungen und Admin-Dashboard

## Gestaltungsprinzip

- **Bestätigt:** dunkel, sportlich, hochwertig und kontrastreich.
- **Bestätigt:** Rot kennzeichnet primäre Aktionen; Schwarz/Dunkelgrau bilden Flächen; Weiß/Grau tragen Text.
- **Bestätigt:** Türkis kennzeichnet Sponsoring und „keine Elternzahlung“.
- **Bestätigt:** echte Campfotos haben Vorrang vor generischen oder künstlich wirkenden Motiven.
- **Bestätigt:** große kondensierte Headlines, klare Karten, kurze Wege zur Anmeldung.

## Logos

| Variante | Pfad | Bestätigte Nutzung |
|---|---|---|
| Standard PNG | `ci/logo.png` | Navigation, Footer, PDFs und E-Mails |
| Standard WebP | `ci/logo.webp` | performante Website-Darstellung, wo eingebunden |
| Jubiläum | `ci/talentexperte-logo-jubilaeum-2005-2025.png` | historisch/gezielte Kampagnen |

- Logo nicht verzerren, umfärben, mit erfundenem Text ergänzen oder über Gesichtern platzieren.
- Transparenz und Lesbarkeit auf dunklem Hintergrund visuell prüfen.

> **Offen:** formale Schutzzone und verbindliche Mindestgröße sind nicht als Markenrichtlinie belegt.
> **Vorläufige Regel:** bestehende Größen der `.nav-logo`, `.footer-logo-img` und PDF-/Mail-Layouts wiederverwenden; keine neue globale Größe erfinden.
> **Risiko:** zu kleine Darstellung oder abweichende Proportionen.
> **Erforderliche Klärung:** freigegebene Logo-Guideline bereitstellen.

## Farben und Tokens

| Rolle | Wert/Tokens | Verwendung |
|---|---|---|
| Primärrot | `#e50000`, `--red` | primäre CTA, Akzent, Fokus/Status je Kontext |
| Dunkelrot | `#cc0000`/`#c00`, `--red-dark` | Hover/Gradient |
| Tiefrot | `#990000`/`#900`, `--red-deep` | dunkle Akzentzustände |
| Schwarz | `#0a0a0a` bis `#0d0d0d`, `--black` | Seitenhintergrund |
| dunkle Flächen | `#111`, `#141414`, `#161616`, `#1a1a1a` | Sektionen, Karten und Inputs |
| Weiß | `#fff`/`#f2f2f2`, `--white` | Haupttext und helle Flächen |
| Grau | `--gray-100` bis `--gray-700` | Sekundärtext, Linien, deaktivierte Zustände |
| Sponsoring | `#20c7b7`, `#0d9488`, `--teal`, `--teal-deep` | Sponsorpanel und Sponsorbestätigung |
| Status bezahlt | `#22c55e`/`#34d399` | Erfolg/bezahlt/verfügbar |
| Status offen | `#f59e0b`/`#fbbf24` | offen/knapp/Warnung |
| Status erstattet | `#a78bfa` | Erstattung/Sonderstatus |

- `css/main.css`, `css/anmeldung.css`, `css/bestaetigung.css`, `css/admin.css` und `css/legal.css` definieren seitenlokale `:root`-Tokens. Werte nicht global angleichen, ohne alle Seitenzustände zu testen.
- Rot und Türkis nicht austauschen: Türkis trägt fachliche Bedeutung für Sponsoring.
- **Widerspruch:** `SOCIAL-CONTENT-PLAN.md` nennt Gold, der produktive Website-CSS-Bestand besitzt kein bestätigtes Gold-Token. Gold bleibt Social-Entwurfsakzent und ist keine allgemeine Website-CI-Farbe.

## Typografie

- **Display:** `Bebas Neue`, 400, Fallback `Impact, sans-serif`.
- **Fließtext/UI:** `Plus Jakarta Sans`, 400/500/600/700/800, Fallback `system-ui, sans-serif`.
- **Quelle:** lokale WOFF2-Dateien über `css/fonts.css`; keine neue externe Font-Abhängigkeit einführen.
- Headlines in Versalien nur bei bestehenden Display-Komponenten; Fließtext in normaler deutscher Schreibung.
- Größen und Zeilenhöhen aus bestehenden Komponenten/`clamp()` übernehmen. Keine separate Typografieskala neben dem Bestand etablieren.
- Lange Textzeilen in Inhaltsbereichen begrenzen; Formlabels und Statusmeldungen nicht in Display-Schrift setzen.

## Layout

- Hauptcontainer: `--max-w: 1200px` in `css/main.css`.
- Seitenrand: `--side-pad: clamp(20px, 5vw, 80px)`.
- vertikaler Sektionabstand: `--section-pad: clamp(60px, 10vw, 120px)`.
- Standardradius: `12px`; kleine Variante `8px`.
- Öffentliche Startseite wechselt primär bei `768px`, zusätzlich existieren komponentenspezifische Grenzen bei 400, 480, 600, 640 und 900px.
- Formularlayout nutzt mobile Basis und erweitert unter anderem bei 560, 860 und 1100px.
- Admin nutzt Grenzen bei 900, 768, 640, 560 und 480px.
- Breakpoints sind komponentenspezifisch. Keine globale Bereinigung ohne visuelle Regressionstests.

## Responsive Regeln

- Primäre Inhalte, CTA und Formfelder bleiben ohne horizontales Scrollen nutzbar.
- Kartenraster werden auf Mobilgeräten einspaltig; Reviews sind aktuell drei Spalten auf Desktop und eine auf Mobil.
- Navigation nutzt einen mobilen Button; Fokus, `aria`-Zustand und Schließen müssen erhalten bleiben.
- Admin-Tabellen dürfen horizontal scrollen, aber Primäraktionen und Status müssen erreichbar bleiben.
- Anwesenheits- und Metrikspalten sind bei Campfilter dynamisch; Breitenänderungen dürfen die Zuordnung Kind/Tag nicht unklar machen.

## Formulare und Zustände

- Pflichtlabel sind explizit mit Inputs verbunden.
- Fehler werden feldnah oder in verständlichen Live-Bereichen ausgegeben; Farbe nie als einziges Signal.
- Sponsorpanel verwendet Türkis und muss explizit „keine Zahlung erforderlich“ kommunizieren.
- Lade-, leer-, Fehler-, deaktiviert-, abgelaufen-, ausgebucht-, offen-, bezahlt-, storniert- und erstattet-Zustände separat prüfen.
- Primärer Submit bleibt bis zur serverseitigen Antwort eindeutig und gegen Doppelklick geschützt.

## Medien

- Moderne Bildkette auf der Startseite: AVIF → WebP → JPEG-Fallback mit `srcset`, `sizes`, festen Dimensionen und sinnvollen Alt-Texten.
- Above-the-fold-Bild/Poster priorisieren; Below-the-fold `loading="lazy"` und `decoding="async"` verwenden.
- Alt-Texte beschreiben Bildinhalt und Zweck; Dateinamen/Keywordketten nicht wiederholen.
- Social-Formate: 1080×1350 (4:5), 1080×1920 (9:16), 1080×1080 (1:1).
- KI-Bilder dürfen keine Fantasieschrift, zusätzlichen Personen oder veränderte Gesichter erzeugen. Text/Logo kontrolliert im Layout setzen.
- Rohmedien, PSDs und große Videos sind nicht automatisch öffentliche Assets; siehe [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Animation

- Bestehende Reveal-, Hover-, Puls- und Laufanimationen sparsam wiederverwenden.
- `prefers-reduced-motion: reduce` ist in Haupt-, Formular-, Bestätigungs- und Admin-CSS vorhanden und darf nicht entfernt werden.
- Animation darf keine Pflichtinformation verstecken, Eingaben verzögern oder Fokus verschieben.
- Keine dauerhaft aggressiven Rot-/Neon-/Glitch-Effekte.

## Accessibility-Basis

- Zielniveau: **Empfehlung:** WCAG 2.2 AA für neue/angepasste Komponenten.
- sichtbarer Tastaturfokus, semantische Überschriften, Labels, Alt-Texte und ausreichend große Touchziele sind Pflicht.
- Dialoge/Overlays müssen Fokus setzen, Escape/Schließen anbieten und Hintergrundinteraktion sperren.
- Kontrast jeder neuen Farbkombination prüfen; Status nie nur über Farbe/Emoji vermitteln.

## Verwandte Dokumente

- [`COMPONENTS.md`](COMPONENTS.md)
- [`CONTENT-GUIDE.md`](CONTENT-GUIDE.md)
- [`QA-CHECKLIST.md`](QA-CHECKLIST.md)
