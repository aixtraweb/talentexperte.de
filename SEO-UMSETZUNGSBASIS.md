# SEO-Umsetzungsbasis (Playbook)

Stand: 13.02.2026  
Projekt: `www.talentexperte.de`

Ziel dieser Datei: Dokumentation aller umgesetzten SEO-/CWF-Maßnahmen als Vorlage für zukünftige Relaunches und Websites.

---

## 1) Vorgehensmodell (reproduzierbar)

1. Technische Basis fixen
- `robots.txt` + `sitemap.xml`
- 404-Strategie (Legacy-Redirects)
- HTTPS/Indexierbarkeit prüfen

2. Onpage-Meta standardisieren
- `title`, `meta description`, `canonical`
- Open Graph + Twitter Card

3. Strukturierte Daten
- `Organization`, `LocalBusiness`, `WebSite`
- `FAQPage`
- `Event` (falls terminbasierte Angebote)

4. Performance/CWV
- Bildpipeline (`AVIF -> WebP -> JPG`, `srcset`, `sizes`)
- LCP priorisieren (`fetchpriority`, Above-the-fold optimieren)
- CLS reduzieren (`width/height`)
- Drittanbieter-Skripte lazy laden

5. Monitoring + Reindex
- Lighthouse mobile/desktop baseline + nachher
- Search Console Reindex-Workflow

---

## 2) Konkrete Umsetzungen in diesem Projekt

## 2.1 Indexierung & Crawling
- Datei erstellt: `robots.txt`
  - `Allow: /`
  - `Disallow: /admin.html`
  - `Disallow: /bestaetigung.html`
  - `Disallow: /bestaetigung-firma.html`
  - `Sitemap: https://www.talentexperte.de/sitemap.xml`

- Datei erstellt: `sitemap.xml`
  - Kernseiten enthalten: `/`, `anmeldung.html`, `firmen-anmeldung.html`, `impressum.html`, `datenschutz.html`, `agb.html`

## 2.2 Relaunch-404-Bereinigung
- `.htaccess` angelegt (Hinweis: im Nginx-Profil nicht als Rewrite aktiv)
- Fallback-Strategie live umgesetzt über Legacy-Stubseiten:
  - `anmeldung-saint-gobain.html` -> `firmen-anmeldung.html`
  - `camps-in/` -> `index.html#camps`
  - `demo-default.html`, `gutschein.html`, `teams.html`, `newsreader/654.html` -> `/`
  - `404.html` mit Weiterleitung zur Startseite

## 2.3 Meta/Sharing-Standards
- Open Graph + Canonical + Description ergänzt auf:
  - `index.html`
  - `anmeldung.html`
  - `firmen-anmeldung.html`
  - `bestaetigung.html`
  - `bestaetigung-firma.html`
  - `impressum.html`
  - `datenschutz.html`
  - `agb.html`

- `admin.html` auf `noindex,nofollow`.

## 2.4 Strukturierte Daten (JSON-LD)
- `index.html`:
  - `Organization`
  - `LocalBusiness`
  - `WebSite`
  - `FAQPage`
  - `Event` (6 Camp-Termine)

- `anmeldung.html`:
  - `WebPage`
  - `Event` (6 Camp-Termine)

## 2.5 Content/Heading/META QA
- H1/H2/H3 auf Kernseiten geprüft.
- `title` + `meta description` auf Kernseiten geprüft/ergänzt.
- Ziel: 1 sichtbare H1 pro Seite, klare H2/H3-Hierarchie.

## 2.6 Bildoptimierung & CWV
- WebP-Varianten erstellt (`-480`, `-768`, full).
- AVIF-Varianten erstellt (`-480`, `-768`, full).
- `index.html` auf `<picture>` umgestellt:
  - AVIF -> WebP -> JPG Fallback
  - `srcset` + `sizes`

- Zusätzliche Optimierungen:
  - Hero priorisiert (`fetchpriority="high"`)
  - `width`/`height` für zentrale Bilder (CLS)
  - `decoding="async"` für nicht-kritische Bilder
  - Logo auf `ci/logo.webp` umgestellt
  - fehlendes `images/hero.jpg` ergänzt

## 2.7 Third-Party / JS-Ladereihenfolge
- Elfsight-Skripte aus statischem HTML entfernt.
- Elfsight wird jetzt erst beim Sichtkontakt der Widgets geladen.
- Leaflet (Karte) wird erst bei Sichtkontakt des Map-Containers geladen.

---

## 3) Messwerte (Lighthouse)

Nach Optimierung (live):
- Mobile Performance: **98**
  - FCP: 1.5s
  - LCP: 2.3s
  - TBT: 0ms
  - CLS: 0.003
  - Speed Index: 1.7s

- Desktop Performance: **100**
  - FCP: 0.3s
  - LCP: 0.4s
  - TBT: 0ms
  - CLS: 0.034
  - Speed Index: 0.3s

---

## 4) Standard-Checkliste für zukünftige Projekte

## Vor Go-Live
- [ ] `robots.txt` vorhanden
- [ ] `sitemap.xml` vorhanden
- [ ] Legacy-URL-Redirectplan (Top 50 alte URLs)
- [ ] OG/Twitter/Canonical auf Kernseiten
- [ ] JSON-LD (Organization/LocalBusiness/WebSite)
- [ ] Optional: FAQPage/Event/Product je nach Geschäftsmodell
- [ ] Bilder in AVIF/WebP + srcset
- [ ] LCP-Element priorisiert
- [ ] Drittanbieter-Skripte lazy/deferred

## Nach Go-Live (Tag 0-7)
- [ ] Sitemap in Search Console einreichen
- [ ] URL-Prüfung + Reindex der Kernseiten
- [ ] 404-Bericht täglich prüfen
- [ ] Lighthouse mobile/desktop dokumentieren
- [ ] Core Web Vitals Monitor starten

---

## 5) Wiederverwendbare Snippets (Kurz)

## Head-Minimum pro indexierbarer Seite
```html
<meta name="description" content="...">
<link rel="canonical" href="https://domain.tld/pfad">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:url" content="https://domain.tld/pfad">
<meta property="og:image" content="https://domain.tld/asset.jpg">
<meta name="twitter:card" content="summary_large_image">
```

## Picture-Pattern
```html
<picture>
  <source type="image/avif" srcset="img-480.avif 480w, img-768.avif 768w, img.avif 1200w" sizes="100vw">
  <source type="image/webp" srcset="img-480.webp 480w, img-768.webp 768w, img.webp 1200w" sizes="100vw">
  <img src="img.jpg" width="1200" height="770" loading="lazy" decoding="async" alt="...">
</picture>
```

## Third-Party Lazy-Load Pattern
```js
const io = new IntersectionObserver((entries) => {
  if (entries.some(e => e.isIntersecting)) {
    const s = document.createElement('script');
    s.src = 'https://third-party/script.js';
    s.async = true;
    document.body.appendChild(s);
    io.disconnect();
  }
}, { rootMargin: '250px 0px' });
```

---

## 6) Zugehörige Projektdateien
- `seo.md`
- `RUNBOOK.md`
- `SEARCH-CONSOLE-REINDEX-CHECKLIST.md`
- `robots.txt`
- `sitemap.xml`

