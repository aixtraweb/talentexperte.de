#!/usr/bin/env node
// Instagram-Beiträge von @talentexperte als statischen, lokalen Feed in die
// Startseite übernehmen (Ersatz für das Elfsight-Widget, seit 27.09.2026).
//
// Liest nur das öffentliche Profil: ein Browser, wenige Seitenaufrufe, kein
// Login, keine CAPTCHA-/Proxy-/Fingerprint-Umgehung. Bei Sperre oder
// Strukturänderung bleibt index.html unverändert (letzter Stand bleibt sichtbar).
//
//   node scripts/instagram-sync.mjs                 # Probelauf, zeigt Beiträge
//   node scripts/instagram-sync.mjs --apply         # Bilder laden + index.html aktualisieren
//   Optionen: --username talentexperte --max-posts 8
//
// Danach prüfen und mit ./ci/deploy.sh veröffentlichen.
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = path.join(ROOT, "index.html");
const IMG_DIR = path.join(ROOT, "images/instagram");
const START = "<!-- INSTAGRAM-FEED:START (generiert von scripts/instagram-sync.mjs) -->";
const END = "<!-- INSTAGRAM-FEED:END -->";

const args = process.argv.slice(2);
const arg = (name, fallback = "") => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const USERNAME = arg("username", "talentexperte");
const MAX_POSTS = Math.min(12, Number(arg("max-posts", "8")) || 8);
const APPLY = args.includes("--apply");
const TIMEOUT = 30000;

function playwrightModule() {
  const candidates = [
    path.join(ROOT, "node_modules/playwright/index.mjs"),
    "/opt/homebrew/lib/node_modules/playwright/index.mjs",
    "/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs",
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("Playwright nicht gefunden (npm i -g playwright)");
  return found;
}
function chromiumExecutable() {
  const cache = path.join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(cache)) return undefined;
  const builds = readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort();
  for (const b of builds.reverse()) {
    const exe = path.join(cache, b, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
    const exe2 = path.join(cache, b, "chrome-mac/Chromium.app/Contents/MacOS/Chromium");
    if (existsSync(exe)) return exe;
    if (existsSync(exe2)) return exe2;
  }
  return undefined;
}

function assertNotBlocked(page) {
  const url = page.url();
  if (/accounts\/login|challenge/i.test(url)) throw new Error("Instagram verlangt Anmeldung – Abbruch ohne Änderung");
}
function parseDescription(d) {
  const m = d.match(/^[\s\S]*? - ([A-Za-z0-9._]+) (?:am|on) [^:]+: "([\s\S]*)"\.\s*$/);
  if (m) return { owner: m[1], caption: m[2].trim() };
  const bare = d.match(/^[\s\S]*? - ([A-Za-z0-9._]+) (?:am|on) [A-Za-z]+ \d{1,2}, \d{4}\s*$/);
  return bare ? { owner: bare[1], caption: "" } : null;
}

async function scrape() {
  const { chromium } = await import(pathToFileURL(playwrightModule()).href);
  const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
  const page = await browser.newPage({ locale: "de-DE" });
  try {
    await page.goto(`https://www.instagram.com/${encodeURIComponent(USERNAME)}/`, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    assertNotBlocked(page);
    await page.locator('a[href*="/p/"], a[href*="/reel/"]').first().waitFor({ timeout: TIMEOUT });
    const hrefs = await page.locator('a[href*="/p/"], a[href*="/reel/"]').evaluateAll((n) => n.map((a) => a.getAttribute("href")));
    const seen = new Set(), grid = [];
    for (const h of hrefs) {
      const m = h && h.match(/\/(p|reel)\/([A-Za-z0-9_-]+)\/?/);
      if (!m || seen.has(m[2])) continue;
      seen.add(m[2]); grid.push({ id: m[2], kind: m[1] });
      if (grid.length >= MAX_POSTS) break;
    }
    if (!grid.length) throw new Error("keine Beiträge erkannt");
    const posts = [];
    for (const item of grid) {
      await page.waitForTimeout(2000);
      await page.goto(`https://www.instagram.com/p/${item.id}/`, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
      assertNotBlocked(page);
      await page.locator('meta[property="og:image"]').first().waitFor({ state: "attached", timeout: TIMEOUT });
      const meta = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('meta[property^="og:"],meta[name="description"]')]
        .map((m) => [m.getAttribute("property") || m.getAttribute("name"), m.getAttribute("content")])));
      const parsed = parseDescription(meta.description || meta["og:description"] || "");
      const date = await page.locator("time[datetime]").first().getAttribute("datetime").catch(() => null);
      // Vollständiges Beitragsbild (og:image ist ein mittiger Quadratausschnitt): größtes Bild aus dem CDN-srcset.
      await page.waitForTimeout(1500);
      const full = await page.evaluate(() => {
        let best = null;
        for (const img of document.querySelectorAll('img[srcset], img[src*="cdninstagram"], img[src*="fbcdn"]')) {
          if (/profil|profile/i.test(img.alt || "")) continue;
          const cands = (img.getAttribute("srcset") || "").split(",").map((x) => x.trim().split(/\s+/))
            .map(([u, w]) => ({ u, w: parseInt(w, 10) || 0 })).filter((c) => c.u);
          if (img.src) cands.push({ u: img.src, w: img.naturalWidth || 0 });
          for (const c of cands) if (c.w >= 600 && (!best || c.w > best.w)) best = c;
        }
        return best ? best.u : null;
      });
      if (!parsed || !meta["og:image"]) throw new Error(`Beitrag ${item.id} unvollständig`);
      if (parsed.owner.toLowerCase() !== USERNAME.toLowerCase()) throw new Error(`Beitrag ${item.id} gehört nicht zu @${USERNAME}`);
      posts.push({ id: item.id, kind: item.kind, caption: parsed.caption, date, image: full || meta["og:image"],
        video: item.kind === "reel" || Boolean(meta["og:video"]) });
    }
    return posts;
  } finally {
    await browser.close();
  }
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function altText(p) {
  const d = p.date ? new Date(p.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
  const cap = p.caption.replace(/#[\p{L}\p{N}_]+/gu, "").replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s+/g, " ").trim();
  const short = cap.length > 110 ? cap.slice(0, 107).replace(/\s\S*$/, "") + " …" : cap;
  return short ? `Instagram-Beitrag${d ? " vom " + d : ""}: ${short}` : `Instagram-Beitrag von @${USERNAME}${d ? " vom " + d : ""}`;
}
function render(posts) {
  const items = posts.map((p) => `      <a class="insta-post${p.video ? " insta-post--video" : ""}" href="https://www.instagram.com/${p.kind === "reel" ? "reel" : "p"}/${esc(p.id)}/" target="_blank" rel="noopener noreferrer">
        <picture><source type="image/webp" srcset="images/instagram/${esc(p.id)}.webp"><img src="images/instagram/${esc(p.id)}.jpg" alt="${esc(altText(p))}" loading="lazy" decoding="async" width="${p.w}" height="${p.h}"></picture>
      </a>`).join("\n");
  const stamp = new Date().toLocaleDateString("de-DE");
  return `${START}
    <div class="insta-grid" data-updated="${stamp}">
${items}
    </div>
    ${END}`;
}

function download(url, file) {
  execFileSync("curl", ["-sSfL", "--max-time", "30", "-A", "Mozilla/5.0", "-o", file, url]);
  // Ganzes Bild behalten (Instagram liefert meist 4:5), nur verkleinern.
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "80", "-Z", "800", file, "--out", file], { stdio: "ignore" });
  execFileSync("cwebp", ["-quiet", "-q", "78", file, "-o", file.replace(/\.jpg$/, ".webp")]);
  const out = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file]).toString();
  return { w: Number(out.match(/pixelWidth: (\d+)/)[1]), h: Number(out.match(/pixelHeight: (\d+)/)[1]) };
}

const posts = await scrape().catch((e) => { console.error("Abbruch:", e.message); process.exit(2); });
console.log(`@${USERNAME}: ${posts.length} Beiträge gefunden`);
for (const p of posts) console.log(`- ${p.id} ${p.date || "?"} ${p.video ? "[Video]" : ""} ${p.caption.slice(0, 70).replace(/\n/g, " ")}`);
if (!APPLY) { console.log("\nProbelauf – nichts geändert. Mit --apply übernehmen."); process.exit(0); }

mkdirSync(IMG_DIR, { recursive: true });
for (const p of posts) Object.assign(p, download(p.image, path.join(IMG_DIR, `${p.id}.jpg`)));
const keep = new Set(posts.flatMap((p) => [`${p.id}.jpg`, `${p.id}.webp`]));
for (const f of readdirSync(IMG_DIR)) if (/\.(jpg|webp)$/.test(f) && !keep.has(f)) unlinkSync(path.join(IMG_DIR, f));

const html = readFileSync(INDEX, "utf8");
const a = html.indexOf(START), b = html.indexOf(END);
if (a < 0 || b < 0) { console.error("Marker in index.html fehlen – Abbruch"); process.exit(3); }
writeFileSync(INDEX, html.slice(0, a) + render(posts) + html.slice(b + END.length));
console.log(`\nindex.html aktualisiert, ${posts.length} Bilder in images/instagram/. Jetzt prüfen und ./ci/deploy.sh ausführen.`);
