# SEO Audit - www.talentexperte.de

Stand: 12.02.2026

## 1) Webpräsenz & Lokales SEO

### Google Business Profil
1. **Status:** ⚠️ Warnung
2. **Beobachtung:** Kein belastbarer Nachweis im Audit, dass GBP vollständig beansprucht/optimiert ist.
3. **Handlungsempfehlung:** GBP prüfen/beanspruchen, Kategorien, Öffnungszeiten, Leistungen, Fotos, Posts, Q&A und UTM-Links pflegen.

### Verzeichnisse & NAP-Konsistenz
1. **Status:** ⚠️ Warnung
2. **Beobachtung:** Unterschiedliche Adressangaben auf der Website (`impressum.html`, `datenschutz.html`, Trainingsadresse separat).
3. **Handlungsempfehlung:** Primäre Geschäftsadresse festlegen und über Website + Verzeichnisse + GBP konsistent führen. Trainingsort separat benennen.

### Lokales Ranking
1. **Status:** ⚠️ Warnung
2. **Beobachtung:** Brand-Signale gut, lokale Keyword-Abdeckung ausbaufähig.
3. **Handlungsempfehlung:** Landingpages für lokale Cluster aufbauen: `Fußballcamp Aachen`, `Feriencamp Aachen`, `Kinder Fußballtraining Aachen`.

### Bewertungen
1. **Status:** ✅ Gut
2. **Beobachtung:** Trust-Signale vorhanden (Trustpilot öffentlich sichtbar).
3. **Handlungsempfehlung:** Aktive Bewertungsroutine aufbauen (nach Camp), Schwerpunkt auf Google-Bewertungen erhöhen.

## 2) SEO & Sichtbarkeit (Organisch)

### Keywords
1. **Status:** ⚠️ Warnung
2. **Beobachtung:** Kernbegriffe vorhanden, aber keine klare SEO-Informationsarchitektur für lokale Suchintentionen.
3. **Handlungsempfehlung:** Keyword-Cluster + interne Verlinkung planen, Suchintention pro Seite schärfen.

### Meta-Daten
1. **Status:** ⚠️ Warnung
2. **Beobachtung:** Mehrere Seiten ohne vollständige Meta-Ausstattung (Description/Canonical/OG).
3. **Handlungsempfehlung:** Für alle indexierbaren Seiten unique `title`, `meta description`, `canonical` ergänzen.

### Mobile Optimierung
1. **Status:** ✅ Gut
2. **Beobachtung:** Responsive Layouts mit `@media`, `clamp`, mobilen Breakpoints vorhanden.
3. **Handlungsempfehlung:** Laufend Real-Device-Checks (iOS/Android) und Touch-Target-Feinschliff.

### Voice Search
1. **Status:** ⚠️ Warnung
2. **Beobachtung:** FAQ-Inhalte vorhanden, aber maschinenlesbare Auszeichnung fehlt.
3. **Handlungsempfehlung:** W-Fragen-Sektion strukturieren und FAQ-Inhalte präzise formulieren.

## 3) Technische Leistung & Struktur

### Geschwindigkeit / Core Web Vitals
1. **Status:** ⚠️ Warnung
2. **Beobachtung:** Sehr große Bilddateien im Projektbestand (teilweise > 3 MB, bis ~6.5 MB).
3. **Handlungsempfehlung:** AVIF/WebP, `srcset/sizes`, Kompression, ggf. CDN-Bildoptimierung.

### Strukturierte Daten (Schema)
1. **Status:** ❌ Kritisch
2. **Beobachtung:** Kein `application/ld+json` auf den geprüften Seiten.
3. **Handlungsempfehlung:** `Organization/LocalBusiness`, `WebSite`, `FAQPage`, `Event` (Camps) implementieren.

### Fehlerhafte Links
1. **Status:** ⚠️ Warnung
2. **Beobachtung:** Vollständiger externer Crawl steht noch aus; intern keine massiven Dateiausfälle im aktuellen Stand.
3. **Handlungsempfehlung:** Regelmäßigen Linkcheck etablieren (monatlich).

### Sitemap & Robots.txt
1. **Status:** ❌ Kritisch
2. **Beobachtung:** Live waren `robots.txt` und `sitemap.xml` nicht erreichbar.
3. **Handlungsempfehlung:** Dateien bereitstellen, Sitemap in Search Console einreichen.

### SSL & Sicherheit
1. **Status:** ✅ Gut
2. **Beobachtung:** HTTPS aktiv.
3. **Handlungsempfehlung:** Security-Header prüfen/ergänzen (CSP, Referrer-Policy, X-Content-Type-Options).

## 4) Content & Inhalte

### Wortanzahl / Thin Content
1. **Status:** ✅ Gut
2. **Beobachtung:** Kernseiten haben substanziellen Umfang (z. B. `index.html`, `anmeldung.html`).
3. **Handlungsempfehlung:** Lokale Expertise-Inhalte erweitern (Trainer, Methodik, Camp-Details pro Saison).

### Überschriftenstruktur
1. **Status:** ✅ Gut
2. **Beobachtung:** H1/H2/H3 grundsätzlich sinnvoll strukturiert.
3. **Handlungsempfehlung:** Pro Seite genau eine H1 beibehalten, Sektionen semantisch sauber trennen.

### Aktualität
1. **Status:** ⚠️ Warnung
2. **Beobachtung:** Inhalte sind saisonal aktuell, aber kein sichtbares Aktualisierungsdatum.
3. **Handlungsempfehlung:** "Zuletzt aktualisiert" auf zentralen SEO-Seiten ergänzen.

### Bilder
1. **Status:** ⚠️ Warnung
2. **Beobachtung:** ALT-Tags sind vorhanden, Dateigrößen teilweise zu hoch.
3. **Handlungsempfehlung:** Bildpipeline mit Kompression + modernen Formaten aufsetzen.

## 5) KI-Bereitschaft (AI Readiness)

### Auffindbarkeit in KI-Systemen
1. **Status:** ⚠️ Warnung
2. **Beobachtung:** Gute Trust-Signale, aber zu wenig strukturierte Entitätsdaten.
3. **Handlungsempfehlung:** Schema + NAP-Konsistenz + klare Q&A-Inhalte priorisieren.

### Open Graph
1. **Status:** ❌ Kritisch
2. **Beobachtung:** Keine OG-/Twitter-Meta-Tags gefunden.
3. **Handlungsempfehlung:** `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card` pro Kernseite ergänzen.

## 6) Rechtliches & Compliance

### DSGVO/GDPR
1. **Status:** ⚠️ Warnung
2. **Beobachtung:** Datenschutzerklärung vorhanden, aber Drittanbieter-Skripte (z. B. Elfsight) ohne erkennbare Consent-Steuerung.
3. **Handlungsempfehlung:** Consent-Management-Plattform einführen; nicht essenzielle Skripte erst nach Zustimmung laden.

### Barrierefreiheit
1. **Status:** ⚠️ Warnung
2. **Beobachtung:** Keine offensichtlichen Totalausfälle, aber Potenzial bei Kontrasten, Fokusführung, Tastatur-Navigation.
3. **Handlungsempfehlung:** WCAG-Basis-Audit durchführen und Kontrast-/Fokus-Themen priorisieren.

## Priorisierte Umsetzung (Top 10)
1. `robots.txt` und `sitemap.xml` live bereitstellen.
2. Schema-Markup implementieren (`Organization/LocalBusiness`, `FAQPage`, `Event`).
3. Open-Graph-/Twitter-Meta ergänzen.
4. NAP auf eine Primäradresse konsolidieren.
5. Consent-Lösung für Drittanbieter-Skripte.
6. Bildoptimierung (AVIF/WebP, Größenvarianten).
7. Canonical-Tags auf indexierbaren Seiten.
8. Local-SEO-Landingpages aufbauen.
9. Search Console + regelmäßiges Monitoring etablieren.
10. Accessibility-Quick-Wins umsetzen.

