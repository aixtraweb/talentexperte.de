#!/usr/bin/env node

import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import assert from "node:assert/strict";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_PARTNER_SLUG = "oecher-kenger";

function normalizeSponsorCode(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleUpperCase("de-DE")
    .replace(/[^A-Z0-9]+/g, "")
    .trim()
    .slice(0, 120);
}

function normalizeChildName(firstName, lastName) {
  return `${firstName ?? ""} ${lastName ?? ""}`
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("de-DE")
    .replace(/ß/g, "ss")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeLookupText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("de-DE")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function parseDate(value, rowNumber) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  let iso = raw;
  const german = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (german) {
    iso = `${german[3]}-${german[2].padStart(2, "0")}-${german[1].padStart(2, "0")}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error(`Zeile ${rowNumber}: Geburtsdatum muss TT.MM.JJJJ oder JJJJ-MM-TT sein.`);
  }
  const [year, month, day] = iso.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error(`Zeile ${rowNumber}: Geburtsdatum ist ungueltig.`);
  }
  return iso;
}

function delimiterFor(csv) {
  const firstLine = csv.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] || "";
  return (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ";" : ",";
}

function parseDelimited(csv, delimiter = delimiterFor(csv)) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const input = csv.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error("CSV enthaelt ein nicht geschlossenes Anfuehrungszeichen.");
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function readEntitlementRows(csv, defaultCamp = "", codeOnly = false) {
  const parsed = parseDelimited(csv);
  if (parsed.length < 1) throw new Error("CSV ist leer.");
  const headers = parsed[0].map(normalizeHeader);
  const indexOf = (...names) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const columns = {
    firstName: indexOf("vorname", "kind_vorname"),
    lastName: indexOf("nachname", "kind_nachname"),
    birthDate: indexOf("geburtsdatum", "kind_geburtsdatum"),
    camp: indexOf("camp", "camp_id", "campname", "camp_name"),
    code: indexOf("code", "sponsor_code", "vereinscode", "gutschein_nummer", "nummer"),
  };
  const requiredColumns = codeOnly
    ? [["code", "code"]]
    : [["firstName", "vorname"], ["lastName", "nachname"], ["code", "code"]];
  for (const [key, label] of requiredColumns) {
    if (columns[key] < 0) throw new Error(`Pflichtspalte fehlt: ${label}`);
  }
  if (columns.camp < 0 && !String(defaultCamp).trim()) {
    throw new Error("Camp fehlt: Spalte camp anlegen oder beim Import --camp angeben.");
  }

  const result = [];
  const identities = new Set();
  for (let index = 1; index < parsed.length; index += 1) {
    const source = parsed[index];
    const rowNumber = index + 1;
    const firstName = columns.firstName >= 0 ? String(source[columns.firstName] ?? "").trim() : "";
    const lastName = columns.lastName >= 0 ? String(source[columns.lastName] ?? "").trim() : "";
    const rawCode = String(source[columns.code] ?? "").trim();
    const birthDate = columns.birthDate >= 0 ? parseDate(source[columns.birthDate], rowNumber) : null;
    const campFromRow = columns.camp >= 0 ? String(source[columns.camp] ?? "").trim() : "";
    const camp = campFromRow || String(defaultCamp).trim();
    const normalizedCode = normalizeSponsorCode(rawCode);
    // Im code-only-Modus (Vereinslisten ohne Kindesnamen, z. B. ÖF) wird der
    // kleingeschriebene normalisierte Code als Namensfeld gespeichert. Die
    // Edge Function prueft exakt diese Identitaet als Fallback.
    const normalizedName = codeOnly
      ? normalizedCode.toLowerCase()
      : normalizeChildName(firstName, lastName);

    if (!codeOnly && !firstName) throw new Error(`Zeile ${rowNumber}: Vorname fehlt.`);
    if (!codeOnly && !lastName) throw new Error(`Zeile ${rowNumber}: Nachname fehlt.`);
    if (!camp) throw new Error(`Zeile ${rowNumber}: Camp fehlt.`);
    if (normalizedCode.length < 16) throw new Error(`Zeile ${rowNumber}: Code muss mindestens 16 Zeichen enthalten.`);
    if (!normalizedName) throw new Error(`Zeile ${rowNumber}: Kindesname ist ungueltig.`);

    const identity = [normalizedCode, normalizedName, birthDate || "*", normalizeLookupText(camp) || "*"].join("|");
    if (identities.has(identity)) throw new Error(`Zeile ${rowNumber}: Diese Berechtigung ist in der CSV doppelt.`);
    identities.add(identity);
    result.push({ rowNumber, firstName, lastName, birthDate, camp, normalizedCode, normalizedName });
  }
  if (result.length === 0) throw new Error("CSV enthaelt keine Datenzeilen.");
  return result;
}

function parseArgs(argv) {
  const options = { apply: false, partnerSlug: DEFAULT_PARTNER_SLUG, camp: "", file: null, selfTest: false, codeOnly: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--code-only") options.codeOnly = true;
    else if (arg === "--self-test") options.selfTest = true;
    else if (arg === "--partner-slug") options.partnerSlug = argv[++index] || "";
    else if (arg === "--camp") options.camp = argv[++index] || "";
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("-")) throw new Error(`Unbekannte Option: ${arg}`);
    else if (!options.file) options.file = arg;
    else throw new Error(`Unerwartetes Argument: ${arg}`);
  }
  return options;
}

function usage() {
  console.log(`Nutzung:
  node scripts/import-sponsoring-entitlements.mjs <liste.csv>
  node scripts/import-sponsoring-entitlements.mjs <liste.csv> --camp "Ostercamp II"
  node scripts/import-sponsoring-entitlements.mjs <liste.csv> --camp "Ostercamp II" --apply

Ohne --apply wird nur geprueft (Dry-Run). Pflichtspalten: vorname, nachname, code.
Optional: geburtsdatum und camp. Das Camp wird entweder je Zeile oder einmalig
mit --camp als exakter Campname bzw. UUID verbindlich festgelegt.

--code-only: fuer Vereinslisten ohne Kindesnamen (z. B. ÖF-Gutscheinliste).
Es zaehlt nur die vollstaendige Gutschein-Nummer + Camp; Namensspalten sind
optional und dienen nur der Dokumentation. Jede Nummer ist einmal einloesbar.`);
}

async function apiRequest(url, serviceKey, path, init = {}) {
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const detail = typeof body === "object" && body ? (body.message || body.details || JSON.stringify(body)) : text;
    throw new Error(`Supabase ${response.status}: ${detail}`);
  }
  return body;
}

function resolveCampId(campValue, camps, rowNumber) {
  if (!campValue) throw new Error(`Zeile ${rowNumber}: Camp fehlt.`);
  if (UUID_PATTERN.test(campValue)) {
    if (!camps.some((camp) => camp.id === campValue)) throw new Error(`Zeile ${rowNumber}: Camp-UUID wurde nicht gefunden.`);
    return campValue;
  }
  const wanted = normalizeLookupText(campValue);
  const matches = camps.filter((camp) => normalizeLookupText(camp.name) === wanted);
  if (matches.length === 0) throw new Error(`Zeile ${rowNumber}: Camp "${campValue}" wurde nicht gefunden.`);
  if (matches.length > 1) throw new Error(`Zeile ${rowNumber}: Campname "${campValue}" ist nicht eindeutig; bitte UUID verwenden.`);
  return matches[0].id;
}

function entitlementExpiry(campId, camps, rowNumber) {
  const camp = camps.find((entry) => entry.id === campId);
  const end = Date.parse(`${camp?.datum_bis || ""}T23:59:59Z`);
  if (!Number.isFinite(end)) throw new Error(`Zeile ${rowNumber}: Camp-Enddatum ist ungueltig.`);
  const expiresAt = end + 30 * 24 * 60 * 60 * 1000;
  if (expiresAt <= Date.now()) throw new Error(`Zeile ${rowNumber}: Die Codegueltigkeit fuer dieses Camp ist bereits abgelaufen.`);
  return new Date(expiresAt).toISOString();
}

async function runSelfTest() {
  const rows = readEntitlementRows(
    "vorname;nachname;geburtsdatum;camp;code\nÄnne;Groß;12.05.2017;Sommercamp I;OEFX-2026-ABCD-9X7Q\nBéla;Groß;;Sommercamp I;OEFX 2026 ABCD 9X7Q\n",
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].normalizedName, "anne gross");
  assert.equal(rows[0].normalizedCode, rows[1].normalizedCode, "shared codes must normalize identically");
  assert.equal(rows[1].birthDate, null);
  assert.equal(rows[1].camp, "Sommercamp I");
  const rowsWithDefaultCamp = readEntitlementRows(
    "vorname;nachname;code\nMia;Muster;OEFX-2026-ABCD-9X7Q\n",
    "Ostercamp II",
  );
  assert.equal(rowsWithDefaultCamp[0].camp, "Ostercamp II");
  const codeOnlyRows = readEntitlementRows(
    "nachname;camp;code\nYildirim;Sommercamp I;Talent 20072026 1118\n;Sommercamp II;Talent 24082026 9791\n",
    "",
    true,
  );
  assert.equal(codeOnlyRows.length, 2);
  assert.equal(codeOnlyRows[0].normalizedCode, "TALENT200720261118");
  assert.equal(codeOnlyRows[0].normalizedName, "talent200720261118");
  assert.equal(codeOnlyRows[1].normalizedName, "talent240820269791");
  console.log("Self-Test erfolgreich.");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return usage();
  if (options.selfTest) return runSelfTest();
  if (!options.file) {
    usage();
    throw new Error("CSV-Datei fehlt.");
  }

  const inputPath = resolve(options.file);
  const rows = readEntitlementRows(await readFile(inputPath, "utf8"), options.camp, options.codeOnly);
  const codeCounts = new Map();
  for (const row of rows) codeCounts.set(row.normalizedCode, (codeCounts.get(row.normalizedCode) || 0) + 1);
  const sharedGroups = [...codeCounts.values()].filter((count) => count > 1).length;
  const withoutBirthDate = rows.filter((row) => !row.birthDate).length;

  console.log(`${options.apply ? "APPLY" : "DRY-RUN"}: ${rows.length} Berechtigung(en) syntaktisch gueltig.`);
  console.log(`Gemeinsam genutzte Codes: ${sharedGroups} Gruppe(n); ohne Geburtsdatum: ${withoutBirthDate}.`);
  if (!options.apply) {
    console.log("Keine Daten geschrieben. Mit --apply importieren.");
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.MY_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.MY_SUPABASE_SERVICE_ROLE_KEY || "";
  const pepper = process.env.SPONSOR_CODE_PEPPER || "";
  if (!supabaseUrl || !serviceKey) throw new Error("SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY fehlen.");
  if (pepper.length < 24) throw new Error("SPONSOR_CODE_PEPPER fehlt oder ist kuerzer als 24 Zeichen.");

  const partnerResult = await apiRequest(
    supabaseUrl,
    serviceKey,
    `sponsoring_partners?slug=eq.${encodeURIComponent(options.partnerSlug)}&select=id,name,slug&limit=1`,
  );
  const partner = partnerResult?.[0];
  if (!partner) throw new Error(`Sponsoring-Partner "${options.partnerSlug}" wurde nicht gefunden. Migration zuerst anwenden.`);
  const camps = await apiRequest(supabaseUrl, serviceKey, "camps?select=id,name,datum_bis");

  const payload = rows.map((row) => {
    const campId = resolveCampId(row.camp, camps, row.rowNumber);
    return {
      partner_id: partner.id,
      code_hash: createHmac("sha256", pepper).update(row.normalizedCode, "utf8").digest("hex"),
      child_first_name: row.firstName || "(Gutscheinliste)",
      child_last_name: row.lastName || "(Gutscheinliste)",
      child_name_normalized: row.normalizedName,
      birth_date: row.birthDate,
      camp_id: campId,
      expires_at: entitlementExpiry(campId, camps, row.rowNumber),
      metadata: {
        import_source: "oecher-kenger-csv",
        import_file: basename(inputPath),
        import_mode: options.codeOnly ? "code_only" : "named",
      },
    };
  });

  let inserted = 0;
  for (let offset = 0; offset < payload.length; offset += 500) {
    const chunk = payload.slice(offset, offset + 500);
    const result = await apiRequest(
      supabaseUrl,
      serviceKey,
      "sponsoring_entitlements?on_conflict=partner_id%2Ccode_hash%2Cchild_name_normalized%2Cbirth_date%2Ccamp_id&select=id",
      {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
        body: JSON.stringify(chunk),
      },
    );
    inserted += Array.isArray(result) ? result.length : 0;
  }

  console.log(`Import abgeschlossen: ${inserted} neu, ${payload.length - inserted} bereits vorhanden/uebersprungen.`);
  console.log("Klartext-Codes wurden weder an Supabase uebertragen noch ausgegeben.");
}

main().catch((error) => {
  console.error(`Fehler: ${error.message}`);
  process.exitCode = 1;
});
