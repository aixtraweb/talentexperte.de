# Search Console Reindex Checklist (Relaunch)

Stand: 13.02.2026

## 1. Technische Basis prüfen
- `https://www.talentexperte.de/robots.txt` aufrufbar und korrekt.
- `https://www.talentexperte.de/sitemap.xml` aufrufbar und aktuell.
- 404-Alt-URLs liefern keine harten 404 mehr.

## 2. Sitemap in Search Console einreichen
- Property: `https://www.talentexperte.de/`
- Menü: Indexierung -> Sitemaps
- Sitemap einreichen: `https://www.talentexperte.de/sitemap.xml`
- Status: "Erfolgreich abgerufen" prüfen.

## 3. URL-Prüfung für Kernseiten
Diese URLs nacheinander in "URL-Prüfung" testen und "Indexierung beantragen":
- `https://www.talentexperte.de/`
- `https://www.talentexperte.de/anmeldung.html`
- `https://www.talentexperte.de/firmen-anmeldung.html`
- `https://www.talentexperte.de/impressum.html`
- `https://www.talentexperte.de/datenschutz.html`
- `https://www.talentexperte.de/agb.html`

## 4. Rich Results / Schema prüfen
- Rich Results Test für Startseite ausführen:
  - Erwartet: `Organization`, `LocalBusiness`, `FAQPage`, `Event`
- Bei Warnungen:
  - Feldnamen, Datumsformat und Offer-Infos prüfen.

## 5. Abdeckung / 404-Welle bereinigen
- Bericht "Seiten -> Nicht gefunden (404)" prüfen.
- Für alte URLs kontrollieren:
  - `/anmeldung-saint-gobain.html`
  - `/camps-in`
  - `/demo-default.html`
  - `/gutschein.html`
  - `/teams.html`
  - `/newsreader/654.html`
- Nach Bestätigung: "Fehlerbehebung validieren" starten.

## 6. Performance Monitoring (nach Live-Änderungen)
- Core Web Vitals -> Mobil priorisieren.
- Referenz (zuletzt gemessen):
  - Mobile: Performance 98, LCP 2.3s
  - Desktop: Performance 100, LCP 0.4s
- Bei Verschlechterung zuerst prüfen:
  - Drittanbieter-Skripte
  - neue große Bilder
  - ungenutztes JavaScript

## 7. Kontrollintervall
- Täglich in der ersten Woche nach Relaunch.
- Danach wöchentlich:
  - Indexierungsstatus
  - 404-Bericht
  - CWV
  - Suchanfragen/CTR

