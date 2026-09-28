#!/usr/bin/env node
// Google-Bewertungen der FUSSBALLSCHULE TALENTEXPERTE statisch in Startseite und
// Anmeldung übernehmen (Gesamtnote, Anzahl, neueste Rezensionen mit Text).
// Ersetzt die handgepflegten Angaben, seit 27.09.2026.
//
// Liest nur den öffentlichen Google-Maps-Eintrag: ein Browser, kein Login,
// Cookie-Banner wird abgelehnt, keine CAPTCHA-/Proxy-/Fingerprint-Umgehung.
// Bei Sperre, anderem Treffer oder Strukturänderung bleibt alles unverändert.
//
//   node scripts/google-reviews-sync.mjs            # Probelauf
//   node scripts/google-reviews-sync.mjs --apply    # index.html + anmeldung.html aktualisieren
//
// Danach prüfen und mit ./ci/deploy.sh veröffentlichen.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUERY = "FUSSBALLSCHULE TALENTEXPERTE Branderhofer Weg 15 52066 Aachen";
const EXPECT_TITLE = /talentexperte/i;
const EXPECT_ADDRESS = /52066|Aachen/i;
const APPLY = process.argv.includes("--apply");
const TIMEOUT = 30000;
const SHOW_INDEX = 3, SHOW_FORM = 2, CANDIDATES = 12;

function playwrightModule() {
  const c = [path.join(ROOT, "node_modules/playwright/index.mjs"),
    "/opt/homebrew/lib/node_modules/playwright/index.mjs",
    "/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs"].find((p) => existsSync(p));
  if (!c) throw new Error("Playwright nicht gefunden");
  return c;
}
function chromiumExecutable() {
  const cache = path.join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(cache)) return undefined;
  for (const b of readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
    for (const exe of [path.join(cache, b, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
      path.join(cache, b, "chrome-mac/Chromium.app/Contents/MacOS/Chromium")]) if (existsSync(exe)) return exe;
  }
  return undefined;
}

async function declineConsent(page) {
  if (!page.url().includes("consent.")) return;
  const reject = page.getByRole("button", { name: /Alle ablehnen|Reject all/i }).first();
  if (!(await reject.count())) throw new Error("Cookie-Seite ohne „Alle ablehnen“");
  await reject.click();
  await page.waitForLoadState("domcontentloaded");
}
function assertNotBlocked(page) {
  if (/\/sorry\/|recaptcha|challenge/i.test(page.url())) throw new Error("Abruf von Google blockiert");
}
async function closeSignIn(page) {
  const d = page.getByRole("dialog").filter({ hasText: /Anmelden|Sign in/i }).first();
  if (!(await d.count()) || !(await d.isVisible().catch(() => false))) return false;
  await d.getByRole("button", { name: /Schließen|Close/i }).first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(800);
  return true;
}

async function scrape() {
  const { chromium } = await import(pathToFileURL(playwrightModule()).href);
  const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
  const page = await browser.newPage({ locale: "de-DE" });
  try {
    await page.goto(`https://www.google.com/maps/search/?api=1&hl=de&query=${encodeURIComponent(QUERY)}`, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    await declineConsent(page);
    assertNotBlocked(page);
    const place = page.locator("div.F7nice").first(), list = page.locator("a.hfpxzc").first();
    await Promise.race([place.waitFor({ timeout: TIMEOUT }), list.waitFor({ timeout: TIMEOUT })]).catch(() => {});
    if (!(await place.count()) && (await list.count())) {
      const hits = await page.locator("a.hfpxzc").evaluateAll((n) => n.map((a) => ({ label: a.getAttribute("aria-label"), href: a.href })));
      const hit = hits.find((h) => /talentexperte/i.test(h.label || ""));
      if (!hit) throw new Error("TALENTEXPERTE nicht in der Trefferliste");
      await page.goto(hit.href, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
      await page.locator("div.F7nice").first().waitFor({ timeout: TIMEOUT });
    }
    await page.locator("h1").first().waitFor({ timeout: TIMEOUT });
    const title = (await page.locator("h1").first().innerText()).trim();
    const address = (await page.locator('button[data-item-id="address"]').first().getAttribute("aria-label").catch(() => "")) || "";
    if (!EXPECT_TITLE.test(title) || !EXPECT_ADDRESS.test(address)) throw new Error(`Falscher Eintrag: ${title} / ${address}`);
    const summary = await page.locator("div.F7nice").first().innerText({ timeout: 10000 }).catch(() => "");
    const rm = summary.match(/(\d[,.]\d)/);
    if (!rm) throw new Error("Gesamtnote nicht gefunden");
    let count = (summary.replace(/\./g, "").match(/\((\d+)\)/) || [])[1];

    const rating = Number(rm[1].replace(",", "."));
    const tab = page.getByRole("tab", { name: /Rezensionen/i }).first();
    await tab.waitFor({ timeout: 15000 }).catch(() => {});
    // Eingeschränkte Ansicht für nicht angemeldete Sitzungen: nur die Note ist
    // sichtbar. Nichts umgehen – nur die Note abgleichen, Rest bleibt stehen.
    if (!(await tab.count())) return { title, rating, count: count ? Number(count) : null, sorted: false, reviews: [], limited: true };
    await tab.click();
    if (!count) {
      const lbl = page.getByText(/^[\d.]+\s+Rezensionen?$/).first();
      await lbl.waitFor({ timeout: 15000 }).catch(() => {});
      count = ((await lbl.innerText().catch(() => "")).replace(/\./g, "").match(/(\d+)/) || [])[1];
    }
    if (!count) throw new Error("Anzahl der Rezensionen nicht gefunden");
    const sort = page.locator('button[aria-label*="sortieren" i]:visible').first();
    await sort.waitFor({ state: "visible", timeout: TIMEOUT }).catch(() => { throw new Error("Sortierung fehlt"); });
    await page.waitForTimeout(1500);
    let sorted = false;
    for (let i = 0; i < 3 && !sorted; i++) {
      await sort.click(); await page.waitForTimeout(1200);
      if (await closeSignIn(page)) break;
      const newest = page.getByRole("menuitemradio", { name: /Neueste/i }).first();
      if (!(await newest.waitFor({ timeout: 10000 }).then(() => true).catch(() => false))) break;
      await newest.click(); await page.waitForTimeout(5000);
      await page.locator("div.jftiEf[data-review-id]").first().waitFor({ timeout: TIMEOUT });
      sorted = await page.locator("div.jftiEf .rsqaWe").evaluateAll((nodes) => {
        const f = { minute: 1 / 1440, stunde: 1 / 24, tag: 1, woche: 7, monat: 30, jahr: 365 };
        const ages = nodes.map((n) => { const m = n.textContent.toLowerCase().match(/vor (\d+|einer|einem|eine|ein) (minute|stunde|tag|woche|monat|jahr)/); return m ? (/^\d+$/.test(m[1]) ? +m[1] : 1) * f[m[2]] : null; }).filter((a) => a !== null);
        return ages.length > 1 && ages.every((a, i) => i === 0 || a >= ages[i - 1]);
      });
    }
    const feed = page.locator("div.m6QErb.DxyBCb").first();
    for (let r = 0; r < 3; r++) {
      if ((await page.locator("div.jftiEf .wiI7pd").count()) >= CANDIDATES) break;
      await feed.evaluate((el) => el.scrollBy(0, el.scrollHeight)).catch(() => {});
      await page.waitForTimeout(1500);
    }
    for (let e = 0; e < CANDIDATES; e++) {
      const more = page.locator('div.jftiEf button[aria-label="Mehr anzeigen"]').first();
      if (!(await more.count())) break;
      await more.click({ timeout: 2000 }).catch(() => {}); await closeSignIn(page); await page.waitForTimeout(300);
    }
    const raw = await page.locator("div.jftiEf[data-review-id]").evaluateAll((nodes) => nodes.map((n) => ({
      id: n.getAttribute("data-review-id"),
      name: n.querySelector(".d4r55")?.textContent?.trim() || "",
      stars: n.querySelector('[role="img"][aria-label*="Stern"]')?.getAttribute("aria-label") || "",
      relative: n.querySelector(".rsqaWe")?.textContent?.trim() || "",
      text: n.querySelector(".wiI7pd")?.textContent?.trim() || "",
    })));
    const seen = new Set(), reviews = [];
    for (const r of raw) {
      if (!r.id || seen.has(r.id)) continue; seen.add(r.id);
      const rating = Number((r.stars.match(/(\d)/) || [])[1]);
      if (!r.text || !r.name || !rating) continue;
      reviews.push({ id: r.id, name: r.name, rating, relative: r.relative, text: r.text.replace(/\s+/g, " ").trim() });
    }
    if (!reviews.length) throw new Error("keine Rezension mit Text erkannt");
    return { title, rating, count: Number(count), sorted, reviews, limited: false };
  } finally {
    await browser.close();
  }
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const de = (n) => n.toFixed(1).replace(".", ",");
const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "G";
const shorten = (t, max) => (t.length > max ? t.slice(0, max - 1).replace(/\s\S*$/, "") + " …" : t);
const MAPS = "https://www.google.com/maps/search/?api=1&amp;query=FUSSBALLSCHULE+TALENTEXPERTE+Aachen";

function replaceBlock(html, name, inner, file) {
  const s = `<!-- ${name}:START (generiert von scripts/google-reviews-sync.mjs) -->`, e = `<!-- ${name}:END -->`;
  const a = html.indexOf(s), b = html.indexOf(e);
  if (a < 0 || b < 0) throw new Error(`Marker ${name} fehlt in ${file}`);
  return html.slice(0, a) + s + "\n" + inner + "\n" + html.slice(b);
}
function mustReplace(html, re, to, what) {
  if (!re.test(html)) throw new Error(`${what} nicht gefunden`);
  return html.replace(re, to);
}

const data = await scrape().catch((e) => { console.error("Abbruch:", e.message); process.exit(2); });
console.log(`${data.title}: ${de(data.rating)} ★ aus ${data.count ?? "?"} Rezensionen${data.limited ? " – EINGESCHRÄNKTE ANSICHT (nur Note abrufbar)" : ` (sortiert nach neueste: ${data.sorted ? "ja" : "nein"})`}`);
for (const r of data.reviews.slice(0, 6)) console.log(`- ${r.rating}★ ${r.name} (${r.relative}): ${r.text.slice(0, 80)}`);
if (!data.limited && !data.sorted) console.log("Hinweis: Google hat die Sortierung nicht bestätigt – Auswahl entspricht Googles Standardreihenfolge.");
if (!APPLY) { console.log("\nProbelauf – nichts geändert. Mit --apply übernehmen."); process.exit(0); }

if (data.limited) {
  // Nur die Gesamtnote an allen Stellen abgleichen; Anzahl und Zitate bleiben.
  const R = de(data.rating);
  const indexFile = path.join(ROOT, "index.html"), formFile = path.join(ROOT, "anmeldung.html");
  let h = readFileSync(indexFile, "utf8"), f = readFileSync(formFile, "utf8");
  const before = h + f;
  h = mustReplace(h, /"ratingValue": "[\d.]+"/, `"ratingValue": "${data.rating.toFixed(1)}"`, "JSON-LD ratingValue");
  h = mustReplace(h, /<div class="hero-stat-num">[\d,]+ ★<\/div>/, `<div class="hero-stat-num">${R} ★</div>`, "Hero-Bewertung");
  h = mustReplace(h, /⭐ [\d,]+ Google</, `⭐ ${R} Google<`, "Footer-Bewertung");
  h = mustReplace(h, /<span class="reviews-score">[\d,]+<\/span>/, `<span class="reviews-score">${R}</span>`, "Bewertungskopf");
  h = h.replace(/aria-label="[\d,]+ von 5 Sternen bei (\d+) Google-Rezensionen"/, `aria-label="${R} von 5 Sternen bei $1 Google-Rezensionen"`);
  f = f.replace(/<strong>[\d,]+<\/strong> · (\d+) Google-Rezensionen/, `<strong>${R}</strong> · $1 Google-Rezensionen`)
       .replace(/<strong>[\d,]+<\/strong> aus (\d+) Google-Rezensionen/, `<strong>${R}</strong> aus $1 Google-Rezensionen`)
       .replace(/aria-label="[\d,]+ von 5 Sternen bei (\d+) Google-Rezensionen – bei Google ansehen"/, `aria-label="${R} von 5 Sternen bei $1 Google-Rezensionen – bei Google ansehen"`);
  writeFileSync(indexFile, h); writeFileSync(formFile, f);
  console.log(before === h + f ? "\nNote unverändert – keine Änderung nötig." : `\nNote auf ${R} abgeglichen. Anzahl und Zitate unverändert (eingeschränkte Ansicht).`);
  process.exit(0);
}

const R = de(data.rating), N = data.count;
const idx = data.reviews.slice(0, SHOW_INDEX);
const form = [...data.reviews].sort((a, b) => a.text.length - b.text.length).filter((r) => r.text.length >= 40).slice(0, SHOW_FORM);

// Startseite
const indexFile = path.join(ROOT, "index.html");
let html = readFileSync(indexFile, "utf8");
html = replaceBlock(html, "GOOGLE-REVIEWS", `    <div class="reviews-header">
      <div class="reviews-rating" aria-label="${R} von 5 Sternen bei ${N} Google-Rezensionen">
        <span class="reviews-score">${R}</span>
        <span><span class="reviews-stars" aria-hidden="true">${stars(Math.round(data.rating))}</span><span class="reviews-count">${N} Google-Rezensionen</span></span>
      </div>
      <a class="reviews-google-link" href="${MAPS}" target="_blank" rel="noopener noreferrer">Alle Rezensionen bei Google ansehen <span aria-hidden="true">↗</span></a>
    </div>
    <div class="reviews-grid">
${idx.map((r) => `      <article class="review-card">
        <div class="review-stars" aria-label="${r.rating} von 5 Sternen">${stars(r.rating)}</div>
        <blockquote class="review-text">„${esc(shorten(r.text, 420))}“</blockquote>
        <div class="review-author"><span class="review-avatar" aria-hidden="true">${esc(initials(r.name))}</span><span><strong class="review-name">${esc(r.name)}</strong><span class="review-date">Google-Rezension</span></span><span class="review-source" aria-label="Quelle: Google">G</span></div>
      </article>`).join("\n")}
    </div>
    `, "index.html");
html = mustReplace(html, /"ratingValue": "[\d.]+"/, `"ratingValue": "${data.rating.toFixed(1)}"`, "JSON-LD ratingValue");
html = mustReplace(html, /"ratingCount": "\d+"/, `"ratingCount": "${N}"`, "JSON-LD ratingCount");
html = mustReplace(html, /<div class="hero-stat-num">[\d,]+ ★<\/div>/, `<div class="hero-stat-num">${R} ★</div>`, "Hero-Bewertung");
html = mustReplace(html, /⭐ [\d,]+ Google</, `⭐ ${R} Google<`, "Footer-Bewertung");
writeFileSync(indexFile, html);

// Anmeldung
const formFile = path.join(ROOT, "anmeldung.html");
let f = readFileSync(formFile, "utf8");
f = replaceBlock(f, "GOOGLE-TRUST", `  <a class="trust-bar" href="${MAPS}" target="_blank" rel="noopener noreferrer" aria-label="${R} von 5 Sternen bei ${N} Google-Rezensionen – bei Google ansehen">
    <span class="trust-stars" aria-hidden="true">${stars(Math.round(data.rating))}</span>
    <span class="trust-score"><strong>${R}</strong> · ${N} Google-Rezensionen</span>
  </a>
  `, "anmeldung.html");
f = replaceBlock(f, "GOOGLE-QUOTES", `    <div class="form-reviews-head"><span class="trust-stars" aria-hidden="true">${stars(Math.round(data.rating))}</span><strong>${R}</strong> aus ${N} Google-Rezensionen</div>
    <div class="form-reviews-grid">
${form.map((r) => `      <blockquote><p>„${esc(shorten(r.text, 220))}“</p><cite>${esc(r.name)} · Google</cite></blockquote>`).join("\n")}
    </div>
    `, "anmeldung.html");
writeFileSync(formFile, f);
console.log(`\nAktualisiert: index.html (${idx.length} Karten, JSON-LD, Hero, Footer) und anmeldung.html (Sterne-Leiste, ${form.length} Zitate). Jetzt prüfen und ./ci/deploy.sh ausführen.`);
