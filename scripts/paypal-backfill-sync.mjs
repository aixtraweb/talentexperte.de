#!/usr/bin/env node
/**
 * PayPal CSV → Supabase Backfill
 *
 * Liest den PayPal-CSV-Export und markiert passende Anmeldungen als "bezahlt".
 * Matching: zuerst per E-Mail, dann per Nachname (Fallback für abweichende E-Mails).
 *
 * Usage:
 *   node scripts/paypal-backfill-sync.mjs --csv /path/to/Download.CSV
 *   node scripts/paypal-backfill-sync.mjs --csv /path/to/Download.CSV --apply
 *
 * Env vars (aus steuerberater/.env oder direkt):
 *   MY_SUPABASE_URL / SUPABASE_URL
 *   MY_SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Env laden ────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.resolve(__dirname, "../steuerberater/.env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.+)$/);
      if (m) process.env[m[1]] = m[2].trim();
    }
  }
}
loadEnv();

const SUPABASE_URL =
  process.env.MY_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.MY_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Fehler: SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY fehlen.");
  process.exit(1);
}

// ── Args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
let csvPath = null;
let apply = false;

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--csv") { csvPath = argv[++i]; continue; }
  if (argv[i] === "--apply") { apply = true; continue; }
  if (argv[i] === "--help" || argv[i] === "-h") {
    console.log("Usage: node paypal-backfill-sync.mjs --csv /path/to/Download.CSV [--apply]");
    process.exit(0);
  }
}

if (!csvPath) {
  console.error("Fehler: --csv /pfad/zur/Download.CSV ist erforderlich.");
  process.exit(1);
}

// ── CSV parsen ────────────────────────────────────────────────────────────────
function parseCsvLine(line) {
  const fields = [];
  let inQ = false, cur = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === "," && !inQ) { fields.push(cur); cur = ""; continue; }
    cur += c;
  }
  fields.push(cur);
  return fields;
}

function parseGermanDate(d) {
  // "17.03.2026" → "2026-03-17"
  const [day, mon, year] = d.split(".");
  return `${year}-${mon}-${day}`;
}

function parsePaypalCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split("\n").filter((l) => l.trim());
  const header = parseCsvLine(lines[0]);

  const idx = {};
  header.forEach((h, i) => { idx[h] = i; });

  const payments = [];
  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i]);
    const typ = f[idx["Typ"]] || "";
    const status = f[idx["Status"]] || "";
    const auswirkung = f[idx["Auswirkung auf Guthaben"]] || "";
    const brutto = f[idx["Brutto"]] || "";

    // Nur eingehende, abgeschlossene Feriencamp-Zahlungen
    if (
      typ === "PayPal Express-Zahlung" &&
      status === "Abgeschlossen" &&
      auswirkung === "Haben"
    ) {
      const datum = f[idx["Datum"]] || "";
      const uhrzeit = f[idx["Uhrzeit"]] || "";
      const name = (f[idx["Name"]] || "").trim();
      const email = (f[idx["Absender E-Mail-Adresse"]] || "").trim().toLowerCase();
      const txId = (f[idx["Transaktionscode"]] || "").trim();
      const betrag = parseFloat(brutto.replace(".", "").replace(",", ".")) || 0;
      const isoDate = parseGermanDate(datum) + "T" + uhrzeit + ":00+01:00";

      payments.push({ datum, uhrzeit, isoDate, name, email, txId, betrag });
    }
  }
  return payments;
}

// ── Supabase HTTP ─────────────────────────────────────────────────────────────
function supabaseRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + "/rest/v1/" + apiPath);
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    };
    if (bodyStr) options.headers["Content-Length"] = Buffer.byteLength(bodyStr);

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data || "[]") }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function fetchOpenAnmeldungen() {
  const res = await supabaseRequest(
    "GET",
    "anmeldungen?zahlungsstatus=eq.offen&select=id,vorname,nachname,email,eltern_nachname,zahlungsstatus,created_at"
  );
  if (res.status !== 200) {
    console.error("Supabase Fehler:", res.status, res.body);
    process.exit(1);
  }
  return res.body;
}

async function markAsBezahlt(id, isoDate, txId) {
  return supabaseRequest("PATCH", `anmeldungen?id=eq.${encodeURIComponent(id)}`, {
    zahlungsstatus: "bezahlt",
    status: "bezahlt",
    zahlung_am: isoDate,
    stripe_payment_id: txId, // PayPal TX-ID hier gespeichert
  });
}

// ── Matching ──────────────────────────────────────────────────────────────────
function normalize(s) {
  return (s || "").toLowerCase().trim();
}

function extractLastName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  return normalize(parts[parts.length - 1]);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nPayPal CSV → Supabase Backfill ${apply ? "(APPLY)" : "(DRY-RUN)"}`);
  console.log("CSV:", csvPath);
  console.log();

  const payments = parsePaypalCsv(csvPath);
  console.log(`PayPal-Zahlungen (Haben, Abgeschlossen): ${payments.length}`);

  const openRegistrations = await fetchOpenAnmeldungen();
  console.log(`Offene Anmeldungen in Supabase: ${openRegistrations.length}\n`);

  // Email-Map für schnellen Zugriff (mehrere Anmeldungen pro Email möglich)
  const byEmail = {};
  for (const reg of openRegistrations) {
    const key = normalize(reg.email);
    if (!byEmail[key]) byEmail[key] = [];
    byEmail[key].push(reg);
  }

  // Nachname-Map als Fallback
  const byLastName = {};
  for (const reg of openRegistrations) {
    const key = normalize(reg.nachname);
    if (!byLastName[key]) byLastName[key] = [];
    byLastName[key].push(reg);
    // Auch Eltern-Nachname
    if (reg.eltern_nachname) {
      const eKey = normalize(reg.eltern_nachname);
      if (!byLastName[eKey]) byLastName[eKey] = [];
      if (!byLastName[eKey].includes(reg)) byLastName[eKey].push(reg);
    }
  }

  const matched = []; // { payment, reg, matchType }
  const unmatched = [];
  const usedRegIds = new Set();

  for (const payment of payments) {
    // 1. Email-Match
    const emailMatches = (byEmail[payment.email] || []).filter(
      (r) => !usedRegIds.has(r.id)
    );

    if (emailMatches.length === 1) {
      matched.push({ payment, reg: emailMatches[0], matchType: "email" });
      usedRegIds.add(emailMatches[0].id);
      continue;
    }

    if (emailMatches.length > 1) {
      // Mehrere Treffer → erste nehmen und warnen
      matched.push({ payment, reg: emailMatches[0], matchType: "email (mehrere!)" });
      usedRegIds.add(emailMatches[0].id);
      console.warn(`  ⚠ Mehrere Anmeldungen für ${payment.email} — erste genommen`);
      continue;
    }

    // 2. Nachname-Fallback
    const lastName = extractLastName(payment.name);
    const nameMatches = (byLastName[lastName] || []).filter(
      (r) => !usedRegIds.has(r.id)
    );

    if (nameMatches.length === 1) {
      matched.push({ payment, reg: nameMatches[0], matchType: `nachname "${lastName}"` });
      usedRegIds.add(nameMatches[0].id);
      continue;
    }

    if (nameMatches.length > 1) {
      // Zu viele Treffer → nicht sicher genug
      unmatched.push({ payment, reason: `Nachname "${lastName}" → ${nameMatches.length} Treffer (zu uneindeutig)` });
      continue;
    }

    unmatched.push({ payment, reason: `Keine Anmeldung mit Email "${payment.email}" oder Nachname "${lastName}"` });
  }

  // ── Ausgabe ──────────────────────────────────────────────────────────────────
  console.log(`✅ Gematcht: ${matched.length}`);
  for (const { payment, reg, matchType } of matched) {
    const name = `${reg.vorname} ${reg.nachname}`;
    console.log(`   ${payment.datum} | ${payment.name} (${payment.email}) → ${name} [${reg.email}] via ${matchType}`);
  }

  if (unmatched.length > 0) {
    console.log(`\n⚠  Nicht zugeordnet: ${unmatched.length}`);
    for (const { payment, reason } of unmatched) {
      console.log(`   ${payment.datum} | ${payment.name} (${payment.email}) — ${reason}`);
    }
  }

  if (!apply) {
    console.log("\n→ Dry-Run abgeschlossen. Mit --apply tatsächlich aktualisieren.");
    return;
  }

  // ── Apply ────────────────────────────────────────────────────────────────────
  console.log("\nAktualisiere Supabase...");
  let ok = 0, fail = 0;
  for (const { payment, reg } of matched) {
    const res = await markAsBezahlt(reg.id, payment.isoDate, payment.txId);
    if (res.status >= 200 && res.status < 300) {
      ok++;
      console.log(`   ✓ ${reg.vorname} ${reg.nachname} → bezahlt (${payment.datum})`);
    } else {
      fail++;
      console.error(`   ✗ ${reg.vorname} ${reg.nachname} — HTTP ${res.status}`, res.body);
    }
  }

  console.log(`\nFertig: ${ok} aktualisiert, ${fail} Fehler.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
