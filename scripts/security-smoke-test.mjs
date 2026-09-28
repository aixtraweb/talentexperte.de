#!/usr/bin/env node

import fs from "node:fs/promises";

const projectUrl = "https://yxygwwoocsdnneqykiym.supabase.co";
const siteUrl = (process.env.SITE_URL || "https://www.talentexperte.de").replace(/\/$/, "");
const companyHtml = await fs.readFile(new URL("../firmen-anmeldung.html", import.meta.url), "utf8");
const anonKey = companyHtml.match(/eyJ[A-Za-z0-9._-]+/)?.[0];
if (!anonKey) throw new Error("Öffentlicher Supabase-Key wurde nicht gefunden.");

let failures = 0;
async function expect(name, request, expectedStatuses) {
  try {
    const response = await fetch(request.url, request.options || {});
    const ok = expectedStatuses.includes(response.status);
    console.log(`${ok ? "PASS" : "FAIL"} ${name}: HTTP ${response.status}`);
    if (!ok) failures += 1;
    return response;
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

const publicHeaders = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
await expect("Öffentliche Camp-Ansicht", {
  url: `${projectUrl}/rest/v1/camp_verfuegbarkeit_public?select=id&limit=1`,
  options: { headers: publicHeaders },
}, [200]);
for (const table of ["anmeldungen", "firmen_anmeldungen", "admin_todos", "confirmation_tokens", "email_outbox"]) {
  await expect(`Private Tabelle ${table}`, {
    url: `${projectUrl}/rest/v1/${table}?select=*&limit=1`,
    options: { headers: publicHeaders },
  }, [401, 403]);
}
await expect("Admin-Aufgabe anonym anlegen", {
  url: `${projectUrl}/rest/v1/admin_todos`,
  options: {
    method: "POST",
    headers: { ...publicHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ title: "anonymous-write-must-fail" }),
  },
}, [401, 403]);

async function replayTest(slug, purposeLabel) {
  const tokenResponse = await expect(`${purposeLabel}: Token`, {
    url: `${projectUrl}/functions/v1/${slug}`,
    options: { cache: "no-store" },
  }, [200]);
  if (!tokenResponse?.ok) return;
  const token = (await tokenResponse.json()).token;
  const body = {
    form_token: token,
    form_started_at: Math.floor(Date.now() / 1000) - 10,
    website_url: "",
    contact_url: "",
    fax_number: "",
  };
  await expect(`${purposeLabel}: ungültige Eingabe ohne Buchung`, {
    url: `${projectUrl}/functions/v1/${slug}`,
    options: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  }, [400]);
  await expect(`${purposeLabel}: Replay wird abgewiesen`, {
    url: `${projectUrl}/functions/v1/${slug}`,
    options: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  }, [409]);
}
await replayTest("register", "Elternanmeldung");
await replayTest("company-register", "Firmenanmeldung");

await expect("Firmenbestätigung ohne gültigen Token", {
  url: `${projectUrl}/functions/v1/company-register`,
  options: {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "get_confirmation",
      registration_id: "00000000-0000-4000-8000-000000000000",
      confirmation_token: "invalid",
    }),
  },
}, [403]);

for (const slug of [
  "send-google-review-request",
  "send-reminder",
  "send-missing-confirmations",
  "stripe-payment-search",
  "admin-payment-action",
  "process-email-outbox",
  "google-sheet-sync",
]) {
  await expect(`${slug}: anonym gesperrt`, {
    url: `${projectUrl}/functions/v1/${slug}`,
    options: { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
  }, [401]);
}
await expect("Stripe-Webhook ohne Signatur", {
  url: `${projectUrl}/functions/v1/stripe-webhook`,
  options: { method: "POST", body: "{}" },
}, [400]);

if (process.env.CHECK_DEPLOYMENT === "1") {
  for (const path of [
    "/SECURITY-IMPLEMENTATION.md",
    "/package.json",
    "/scripts/resend-signed-confirmation-links.mjs",
    "/supabase/functions/register/index.ts",
    "/index%20Kopie.html",
  ]) {
    await expect(`Nicht öffentlich: ${path}`, { url: siteUrl + path }, [403, 404]);
  }
  const home = await expect("Website erreichbar", { url: siteUrl + "/" }, [200]);
  const homeHtml = home ? await home.text() : "";
  const headerCsp = home?.headers.get("content-security-policy") || "";
  const metaCsp = /http-equiv=["']Content-Security-Policy["']/i.test(homeHtml);
  const cspOk = Boolean(headerCsp || metaCsp);
  console.log(`${cspOk ? "PASS" : "FAIL"} Content Security Policy`);
  if (!cspOk) failures += 1;
  const serverHeadersOk = home?.headers.get("x-content-type-options") === "nosniff" &&
    Boolean(home?.headers.get("strict-transport-security"));
  console.log(`${serverHeadersOk ? "PASS" : "WARN"} nginx Security Header${serverHeadersOk ? "" : " (Hosting-Profil ausstehend)"}`);
  if (process.env.REQUIRE_SERVER_HEADERS === "1" && !serverHeadersOk) failures += 1;
}

if (failures) {
  console.error(`${failures} Sicherheitstest(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log("Alle Sicherheitstests bestanden.");
