#!/usr/bin/env node

import fs from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_FROM = "2023-08-01";

function printUsage() {
  console.log(`
Stripe -> Supabase Backfill

Usage:
  node scripts/stripe-backfill-sync.mjs [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--apply]
  npm run stripe:backfill -- [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--apply]

Examples:
  npm run stripe:backfill
  npm run stripe:backfill -- --from 2025-01-01
  npm run stripe:backfill -- --from 2025-01-01 --to 2026-03-31 --apply

Required env vars:
  STRIPE_SECRET_KEY or STRIPE_SK
  MY_SUPABASE_URL or SUPABASE_URL
  MY_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY
`);
}

function parseArgs(argv) {
  const args = {
    apply: false,
    from: DEFAULT_FROM,
    to: new Date().toISOString().slice(0, 10),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") {
      args.apply = true;
      continue;
    }
    if (arg === "--from") {
      args.from = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--to") {
      args.to = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    throw new Error(`Unbekanntes Argument: ${arg}`);
  }

  return args;
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  const env = {};
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    env[key] = value;
  });
  return env;
}

function readEnv(keys, fileEnv) {
  for (const key of keys) {
    if (process.env[key]) return process.env[key];
    if (fileEnv[key]) return fileEnv[key];
  }
  return "";
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function dateToUnixStart(value) {
  return Math.floor(new Date(`${value}T00:00:00Z`).getTime() / 1000);
}

function dateToUnixEndExclusive(value) {
  return Math.floor(new Date(`${value}T00:00:00Z`).getTime() / 1000) + 86400;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100) / 100;
}

function normalizeStatus(value) {
  const s = String(value || "").trim().toLowerCase();
  if (s === "paid" || s === "bezahlt" || s === "zahlung_erfolgt") return "bezahlt";
  if (s === "open" || s === "offen" || s === "pending") return "offen";
  if (s === "cancelled" || s === "storniert") return "storniert";
  if (s === "refunded" || s === "erstattet") return "erstattet";
  return s;
}

function stripeRequest(apiPath) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.stripe.com",
        path: apiPath,
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(`${CONFIG.stripeKey}:`).toString("base64")}`,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(raw);
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(parsed?.error?.message || `Stripe HTTP ${res.statusCode}`));
              return;
            }
            resolve(parsed);
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function stripeFetchAll(resource, params) {
  let items = [];
  let lastId = "";

  while (true) {
    const search = new URLSearchParams({ limit: "100" });
    Object.entries(params).forEach(([key, value]) => {
      search.append(key, String(value));
    });
    if (lastId) search.append("starting_after", lastId);

    const response = await stripeRequest(`/v1/${resource}?${search.toString()}`);
    items = items.concat(response.data || []);

    if (!response.has_more || !(response.data || []).length) {
      break;
    }

    lastId = response.data[response.data.length - 1].id;
  }

  return items;
}

async function supabaseRequest(method, apiPath, body) {
  const target = new URL(`/rest/v1/${apiPath}`, CONFIG.supabaseUrl);
  const payload = body ? JSON.stringify(body) : undefined;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        path: `${target.pathname}${target.search}`,
        method,
        headers: {
          apikey: CONFIG.supabaseServiceRoleKey,
          Authorization: `Bearer ${CONFIG.supabaseServiceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          let parsed = null;
          if (raw) {
            try {
              parsed = JSON.parse(raw);
            } catch (error) {
              reject(error);
              return;
            }
          }
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(parsed?.message || parsed?.error || `Supabase HTTP ${res.statusCode}`));
            return;
          }
          resolve(parsed);
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function fetchRegistrations() {
  const rows = await supabaseRequest(
    "GET",
    "anmeldungen?select=id,vorname,nachname,email,betrag_euro,zahlungsstatus,zahlung_am,stripe_payment_id,created_at&order=created_at.asc"
  );
  return Array.isArray(rows) ? rows : [];
}

function chargeToPayment(charge) {
  const email = normalizeEmail(charge.billing_details?.email || charge.receipt_email || "");
  const amount = normalizeAmount((charge.amount || 0) / 100);
  const createdAtMs = Number(charge.created || 0) * 1000;

  return {
    chargeId: charge.id,
    paymentId: charge.payment_intent || charge.id,
    email,
    amount,
    paidAtIso: new Date(createdAtMs).toISOString(),
    createdAtMs,
    raw: charge,
  };
}

function pickRegistration(payment, registrations, claimedIds) {
  const exactCandidates = registrations.filter((row) => {
    if (claimedIds.has(row.id)) return false;
    if (normalizeStatus(row.zahlungsstatus) === "bezahlt") return false;
    if (!normalizeEmail(row.email) || normalizeEmail(row.email) !== payment.email) return false;
    if (normalizeAmount(row.betrag_euro) !== payment.amount) return false;
    return true;
  });

  if (exactCandidates.length === 0) return { match: null, reason: "no_match" };

  const windowCandidates = exactCandidates.filter((row) => {
    const rowCreatedMs = new Date(row.created_at || 0).getTime();
    if (!Number.isFinite(rowCreatedMs) || rowCreatedMs <= 0) return false;
    const earliest = rowCreatedMs - 24 * 60 * 60 * 1000;
    const latest = rowCreatedMs + 60 * 24 * 60 * 60 * 1000;
    return payment.createdAtMs >= earliest && payment.createdAtMs <= latest;
  });

  if (windowCandidates.length === 1) {
    return { match: windowCandidates[0], reason: "window_match" };
  }

  if (windowCandidates.length > 1) {
    return { match: null, reason: "ambiguous_window" };
  }

  if (exactCandidates.length === 1) {
    return { match: exactCandidates[0], reason: "single_fallback" };
  }

  return { match: null, reason: "ambiguous_exact" };
}

async function applyUpdate(match, payment) {
  const apiPath = `anmeldungen?id=eq.${encodeURIComponent(match.id)}`;
  const body = {
    zahlungsstatus: "bezahlt",
    zahlung_am: match.zahlung_am || payment.paidAtIso,
    stripe_payment_id: String(payment.paymentId || payment.chargeId),
  };
  const updated = await supabaseRequest("PATCH", apiPath, body);
  return Array.isArray(updated) ? updated[0] : updated;
}

function describeRow(row) {
  const name = [row.vorname, row.nachname].filter(Boolean).join(" ").trim();
  return `${row.id} ${name || "-"} <${row.email || "-"}> ${row.betrag_euro || 0} EUR`;
}

const cliArgs = parseArgs(process.argv.slice(2));
if (!isIsoDate(cliArgs.from) || !isIsoDate(cliArgs.to)) {
  throw new Error("Datum bitte als YYYY-MM-DD angeben.");
}

const fileEnv = {
  ...parseEnvFile(path.join(ROOT_DIR, "steuerberater", ".env")),
};

const CONFIG = {
  stripeKey: readEnv(["STRIPE_SECRET_KEY", "STRIPE_SK"], fileEnv),
  supabaseUrl: readEnv(["MY_SUPABASE_URL", "SUPABASE_URL"], fileEnv),
  supabaseServiceRoleKey: readEnv(
    ["MY_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
    fileEnv
  ),
};

if (!CONFIG.stripeKey || !CONFIG.supabaseUrl || !CONFIG.supabaseServiceRoleKey) {
  printUsage();
  throw new Error("Fehlende Umgebungsvariablen fuer Stripe oder Supabase.");
}

async function main() {
  console.log(`\nStripe-Backfill ${cliArgs.apply ? "(APPLY)" : "(DRY RUN)"}`);
  console.log(`Zeitraum: ${cliArgs.from} bis ${cliArgs.to}\n`);

  const charges = await stripeFetchAll("charges", {
    "created[gte]": dateToUnixStart(cliArgs.from),
    "created[lt]": dateToUnixEndExclusive(cliArgs.to),
  });

  const paidCharges = charges
    .filter((charge) => charge.paid === true && charge.refunded !== true && Number(charge.amount || 0) > 0)
    .map(chargeToPayment)
    .filter((payment) => payment.email && payment.amount !== null)
    .sort((a, b) => a.createdAtMs - b.createdAtMs);

  const registrations = await fetchRegistrations();
  const claimedIds = new Set();
  const matches = [];
  const unmatched = [];

  for (const payment of paidCharges) {
    const { match, reason } = pickRegistration(payment, registrations, claimedIds);
    if (!match) {
      unmatched.push({ payment, reason });
      continue;
    }
    claimedIds.add(match.id);
    matches.push({ payment, match, reason });
  }

  console.log(`Stripe-Zahlungen im Zeitraum: ${paidCharges.length}`);
  console.log(`Gefundene Anmeldungen:       ${registrations.length}`);
  console.log(`Zuordenbare Matches:         ${matches.length}`);
  console.log(`Nicht zugeordnet:            ${unmatched.length}\n`);

  matches.slice(0, 20).forEach(({ payment, match, reason }) => {
    console.log(
      `MATCH [${reason}] ${payment.chargeId} -> ${describeRow(match)}`
    );
  });

  if (matches.length > 20) {
    console.log(`... und ${matches.length - 20} weitere Matches`);
  }

  if (unmatched.length) {
    console.log("\nNicht zugeordnete Zahlungen (max. 20):");
    unmatched.slice(0, 20).forEach(({ payment, reason }) => {
      console.log(
        `UNMATCHED [${reason}] ${payment.chargeId} <${payment.email}> ${payment.amount} EUR ${payment.paidAtIso}`
      );
    });
  }

  if (!cliArgs.apply) {
    console.log("\nDry run beendet. Fuer echte Updates bitte mit --apply ausfuehren.\n");
    return;
  }

  let updatedCount = 0;
  for (const item of matches) {
    const row = await applyUpdate(item.match, item.payment);
    updatedCount += row ? 1 : 0;
    console.log(`UPDATED ${item.match.id} <- ${item.payment.chargeId}`);
  }

  console.log(`\nFertig. Aktualisierte Anmeldungen: ${updatedCount}\n`);
}

main().catch((error) => {
  console.error(`\nFehler: ${error.message}\n`);
  process.exit(1);
});
