#!/usr/bin/env node

const apply = process.argv.includes("--apply");
const scopeArg = process.argv.find((arg) => arg.startsWith("--scope="));
const scope = scopeArg ? scopeArg.slice("--scope=".length) : "all_future";

if (!["all_future", "missing_legacy"].includes(scope)) {
  throw new Error("--scope muss all_future oder missing_legacy sein.");
}

const supabaseUrl = process.env.SUPABASE_URL || "";
const adminFunctionSecret = process.env.ADMIN_FUNCTION_SECRET || "";
if (!supabaseUrl || !adminFunctionSecret) {
  throw new Error("SUPABASE_URL und ADMIN_FUNCTION_SECRET fehlen in der geschützten Env-Datei.");
}

const response = await fetch(
  `${supabaseUrl.replace(/\/$/, "")}/functions/v1/send-missing-confirmations`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminFunctionSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scope, apply }),
  },
);

const text = await response.text();
let payload = null;
try { payload = JSON.parse(text); } catch { payload = { error: text }; }
if (!response.ok) {
  throw new Error(`Function ${response.status}: ${payload?.error || text}`);
}

const results = Array.isArray(payload?.results) ? payload.results : [];
const sent = results.filter((entry) => entry.sent === true).length;
const failed = results.filter((entry) => entry.sent === false).length;

console.log(`${apply ? "APPLY" : "DRY-RUN"}: ${results.length} relevante Bestätigung(en), ${sent} versendet, ${failed} fehlgeschlagen.`);
for (const entry of results) {
  const state = apply ? (entry.sent ? "versendet" : `FEHLER: ${entry.error || "unbekannt"}`) : "würde versendet";
  console.log(`- ${entry.camp || "Camp unbekannt"} | ${entry.kind || "Kind unbekannt"} | ${entry.email || "E-Mail unbekannt"} | ${state}`);
}

if (!apply) console.log("Keine E-Mail versendet. Erst nach Prüfung mit --apply erneut ausführen.");
if (failed > 0) process.exitCode = 2;
