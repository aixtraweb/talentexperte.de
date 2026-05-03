# Social Publishing Setup

Ziel: Instagram, Facebook Page und Google Unternehmensprofil automatisiert veroeffentlichen.

## Status

In dieser Codex-Umgebung gibt es keinen nativen Social-Posting-Connector fuer Instagram, Facebook oder Google Business Profile. Deshalb nutzt das Projekt einen lokalen API-Connector:

- `scripts/social-publish.mjs`
- `.env.social` fuer Zugangsdaten
- JSON-Datei mit fertigen Posts

## Voraussetzungen

### Meta / Instagram / Facebook

Noetig:

- Facebook Page ID
- Page Access Token mit Publishing-Rechten
- Instagram Professional Account, verbunden mit der Facebook Page
- Instagram User ID
- Instagram Access Token mit Content-Publishing-Rechten

Relevante Meta-Berechtigungen:

- `pages_manage_posts`
- `pages_read_engagement`
- `pages_show_list`
- `instagram_business_content_publish` oder passende aktuelle Content-Publishing-Berechtigung

Wichtig:

- Instagram- und Facebook-Medien muessen als oeffentliche HTTPS-URL erreichbar sein.
- Deshalb sollten fertige Social-Bilder nach `images/social-output/` exportiert und deployed werden, bevor der Publisher laeuft.

### Google Unternehmensprofil

Noetig:

- Google Business Profile Account ID
- Location ID
- OAuth-Zugang mit Scope `https://www.googleapis.com/auth/business.manage`

Optionen:

- kurzfristig: `GOOGLE_ACCESS_TOKEN` manuell eintragen
- dauerhaft: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`

## Einrichtung

1. Datei kopieren:

```bash
cp .env.social.example .env.social
```

2. Zugangsdaten in `.env.social` eintragen.

3. Einen Post-Plan als JSON erstellen, zum Beispiel:

```bash
cp social-posts.sample.json social-posts.json
```

4. Dry Run:

```bash
node scripts/social-publish.mjs --posts social-posts.json
```

5. Live veroeffentlichen:

```bash
node scripts/social-publish.mjs --posts social-posts.json --publish
```

## Automationslogik

Der ideale Ablauf:

1. Woechentliche Codex-Automation erstellt Content-Paket.
2. Bilder werden mit Image 2.0 im CI veredelt.
3. Export nach `images/social-output/`.
4. Website deployen, damit die Medien unter `https://www.talentexperte.de/images/social-output/...` erreichbar sind.
5. `social-posts.json` mit oeffentlichen Media-URLs fuellen.
6. Publisher mit `--publish` ausfuehren.

## Quellen

- Meta Instagram Content Publishing API: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing/
- Meta Pages API: https://developers.facebook.com/docs/pages-api/posts/
- Google Business Profile Local Posts API: https://developers.google.com/my-business/content/posts-data

## Gemeinsames Setup - Reihenfolge

### 1) Google Business Profile

Google ist fuer uns der sauberste erste Test, weil der LocalPosts-Endpunkt offiziell `accounts/*/locations/*/localPosts` nutzt und den Scope `https://www.googleapis.com/auth/business.manage` akzeptiert.

1. Google Cloud Console oeffnen: https://console.cloud.google.com/
2. Projekt anlegen oder bestehendes TALENTEXPERTE-Projekt verwenden.
3. APIs aktivieren:
   - Google Business Profile API
   - My Business Account Management API
   - My Business Business Information API
4. OAuth Consent Screen konfigurieren.
5. OAuth Client anlegen:
   - Typ: Desktop app
   - Client ID und Client Secret in `.env.social` eintragen.
6. Autorisierungs-URL erzeugen:

```bash
npm run social:google:url
```

7. URL im Browser oeffnen, mit dem Google-Konto anmelden, das das Unternehmensprofil verwaltet.
8. Nach Freigabe den `code` aus der Redirect-URL kopieren.
9. Refresh Token erzeugen:

```bash
node scripts/social-auth.mjs google-token "CODE_HIER_EINFUEGEN"
```

10. `GOOGLE_REFRESH_TOKEN` in `.env.social` eintragen.
11. Account und Location anzeigen:

```bash
npm run social:google:list
```

12. Aus der Ausgabe eintragen:
   - `GOOGLE_BIZ_ACCOUNT_ID` ohne `accounts/`
   - `GOOGLE_BIZ_LOCATION_ID` ohne `locations/`

Falls Google `quota_limit_value=0` oder `RESOURCE_EXHAUSTED` meldet:

- OAuth hat funktioniert, aber das Google-Cloud-Projekt hat noch keinen GBP-API-Zugriff.
- Google weist in den GBP-API-Limits darauf hin, dass bei Quota 0 zuerst GBP API access beantragt werden muss.
- Formular: https://developers.google.com/my-business/content/limits
- Projekt-Nummer fuer den Antrag: `968352866550`

Antrag gestellt am 2026-05-03.

- Supportfall-ID: `2-0322000040294`
- Erwartete Bearbeitungszeit laut Google: 7-10 Arbeitstage
- Naechster Check: danach `npm run social:google:list`

### 2) Meta / Facebook / Instagram

Meta braucht eine Facebook Page, einen Instagram Professional Account und eine Meta App.

1. Meta for Developers oeffnen: https://developers.facebook.com/
2. App erstellen oder bestehende TALENTEXPERTE-App verwenden.
3. In Meta Business Suite pruefen:
   - Facebook Page ist TALENTEXPERTE
   - Instagram Account ist Professional Account
   - Instagram Account ist mit der Facebook Page verbunden
   - dein Benutzer hat volle Admin-/Content-Rechte
4. In `.env.social` eintragen:
   - `META_APP_ID`
   - `META_APP_SECRET`
5. Im Graph API Explorer einen User Token fuer die App erzeugen.
6. Noetige Berechtigungen:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `instagram_content_publish` oder `instagram_business_content_publish`, je nach Meta-App/API-Setup
7. Optional kurzen User Token in Long-Lived Token tauschen:

```bash
node scripts/social-auth.mjs meta-long-token "SHORT_LIVED_USER_TOKEN"
```

8. Page, Page Token und Instagram Business ID finden:

```bash
node scripts/social-auth.mjs meta-list "USER_ODER_PAGE_ACCESS_TOKEN"
```

9. Aus der Ausgabe in `.env.social` eintragen:
   - `FACEBOOK_PAGE_ID`
   - `FACEBOOK_PAGE_ACCESS_TOKEN`
   - `INSTAGRAM_USER_ID`
   - `INSTAGRAM_ACCESS_TOKEN`

Hinweis: Fuer Live-Nutzung ausserhalb deiner eigenen Admin-/Testnutzer kann Meta App Review noetig sein. Fuer die eigene Page/den eigenen Instagram-Account funktioniert der erste Test meist im App-Testkontext, wenn der eingeloggte Nutzer Admin/Tester der App und Admin der Page ist.

### 3) Erster Live-Test

1. Ein finales Bild nach `images/social-output/` exportieren.
2. Website deployen, damit das Bild oeffentlich erreichbar ist.
3. `social-posts.json` aus `social-posts.sample.json` erstellen.
4. Dry Run:

```bash
npm run social:dry
```

5. Live:

```bash
npm run social:publish
```
