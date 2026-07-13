// Einmal-Funktion: versendet Anmeldebestätigungen nachträglich an Eltern,
// die wegen des falschen Resend-Absenders (onboarding@resend.dev) nie eine erhalten haben.
// Aufruf nur mit Service-Role-Key als Bearer. Ohne { "apply": true } nur Dry-Run.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createStoredConfirmationToken } from "../_shared/stored-confirmation-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

const FROM_EMAIL = "TALENTEXPERTE Fußballschule <kontakt@talentexperte.de>";

function formatDateDE(iso: string | null): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(t: string | null): string {
  if (!t) return "–";
  return String(t).slice(0, 5) + " Uhr";
}

function hasLegacySponsorMarker(a: Record<string, unknown>): boolean {
  return /\[TYP:(?:ÖF|OEF)\]/i.test(String(a.notizen || ""));
}

function isSponsored(a: Record<string, unknown>): boolean {
  if (a.payer_type === "sponsor") return true;
  if (a.payer_type === "parent") return false;
  return hasLegacySponsorMarker(a);
}

function sponsorName(a: Record<string, unknown>): string {
  const partner = a.sponsoring_partners as Record<string, unknown> | null;
  return String(partner?.name || "Öcher Fans for Kenger e.V.");
}

function parentAmount(a: Record<string, unknown>): number {
  const value = a.parent_amount_euro;
  return Number(value === null || value === undefined ? a.betrag_euro || 0 : value);
}

function isParentPaid(a: Record<string, unknown>): boolean {
  if (a.payer_type === "sponsor") return false;
  if (a.parent_payment_status) return a.parent_payment_status === "paid";
  return a.zahlungsstatus === "bezahlt";
}

function isOpenParentPayment(a: Record<string, unknown>): boolean {
  return a.payer_type === "parent" &&
    a.parent_payment_status === "open" &&
    parentAmount(a) > 0;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paymentStartLink(
  registrationId: string,
  confirmationToken: string,
  stripeLink: string,
): string {
  return "https://www.talentexperte.de/zahlung-start.html#" +
    new URLSearchParams({
      id: registrationId,
      token: confirmationToken,
      stripe: stripeLink,
    }).toString();
}

function buildHtml(
  a: Record<string, unknown>,
  camp: Record<string, unknown>,
  buchungsNr: string,
  payLink: string | null,
  confirmationLink: string,
  notice: string,
): string {
  const sponsored = isSponsored(a);
  const bezahlt = isParentPaid(a);
  const parentAmountEuro = sponsored ? 0 : parentAmount(a);
  const sponsor = sponsorName(a);
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#111;color:#fff;border-radius:12px;overflow:hidden">
  <div style="background:#e50000;padding:24px 32px">
    <h1 style="margin:0;font-size:24px;color:#fff">TALENTEXPERTE</h1>
    <p style="margin:4px 0 0;font-size:14px;color:#fff;opacity:.9">Anmeldebestätigung</p>
  </div>
  <div style="padding:32px">
    <p>Guten Tag ${escapeHtml(a.eltern_vorname)},</p>
    <p>vielen Dank für die Anmeldung von <strong>${escapeHtml(a.vorname)}</strong> zum <strong>${escapeHtml(camp.name)}</strong>!</p>
    <p style="font-size:13px;color:#aaa">${escapeHtml(notice)}</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;color:#ddd">
      <tr><td style="padding:6px 0;color:#888">Buchungs-Nr.</td><td style="padding:6px 0"><strong style="letter-spacing:.08em;color:#fff">${escapeHtml(buchungsNr)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#888">Zeitraum</td><td style="padding:6px 0">${escapeHtml(formatDateDE(camp.datum_von as string))} – ${escapeHtml(formatDateDE(camp.datum_bis as string))}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Uhrzeit</td><td style="padding:6px 0">${escapeHtml(formatTime(camp.uhrzeit_von as string))} – ${escapeHtml(formatTime(camp.uhrzeit_bis as string))}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Ort</td><td style="padding:6px 0">${escapeHtml(camp.ort || "–")}</td></tr>
      ${sponsored
        ? `<tr><td style="padding:6px 0;color:#888">Finanzierung</td><td style="padding:6px 0"><strong style="color:#fff">Vollständig gesponsert</strong></td></tr>
           <tr><td style="padding:6px 0;color:#888">Partner</td><td style="padding:6px 0"><strong style="color:#fff">${escapeHtml(sponsor)}</strong></td></tr>
           <tr><td style="padding:6px 0;color:#888">Ihr Anteil</td><td style="padding:6px 0"><strong style="color:#fff">0 €</strong></td></tr>`
        : `<tr><td style="padding:6px 0;color:#888">Betrag</td><td style="padding:6px 0"><strong style="color:#fff">${escapeHtml(parentAmountEuro)} €</strong></td></tr>`}
    </table>
    ${sponsored
      ? `<div style="margin:24px 0;padding:18px;background:#ecfdf5;border-left:4px solid #059669;color:#064e3b;border-radius:6px">
           <strong>Vollständig durch ${escapeHtml(sponsor)} finanziert.</strong><br>
           Für Sie entstehen keine Kosten. Eine Zahlung ist nicht erforderlich. Der Platz ist verbindlich reserviert.
         </div>
         <p style="font-size:13px;color:#888">Alle Informationen zum gesponserten Camp-Platz finden Sie im PDF-Anhang dieser E-Mail.</p>`
      : bezahlt
      ? `<p style="margin:24px 0;color:#7be07b;font-weight:bold">✓ Zahlung erhalten – der Platz ist verbindlich reserviert.</p>`
      : (payLink
        ? `<p style="margin:24px 0"><a href="${escapeHtml(payLink)}" style="display:inline-block;background:#e50000;color:#fff;padding:14px 32px;border-radius:30px;text-decoration:none;font-weight:bold">JETZT BEZAHLEN</a></p>
           <p style="font-size:13px;color:#888">Der Platz wird erst nach Zahlungseingang verbindlich reserviert.</p>`
        : "")}
    <p style="font-size:13px;color:#888">Ihre Bestätigung können Sie jederzeit hier abrufen:<br>
      <a href="${escapeHtml(confirmationLink)}" style="color:#e50000">Persönliche Bestätigung sicher öffnen</a></p>
    <p style="font-size:13px;color:#888">Bei Fragen erreichen Sie uns unter <a href="mailto:kontakt@talentexperte.de" style="color:#e50000">kontakt@talentexperte.de</a>.</p>
  </div>
</div>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Nur POST" }), { status: 405, headers: corsHeaders });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const adminFunctionSecret = Deno.env.get("ADMIN_FUNCTION_SECRET") ?? "";
  const auth = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!adminFunctionSecret || auth !== adminFunctionSecret) {
    return new Response(JSON.stringify({ error: "Nicht autorisiert" }), { status: 401, headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY fehlt" }), { status: 500, headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const apply = body.apply === true;
  const scope = body.scope === "all_future" ? "all_future" : "missing_legacy";
  const cutoff = body.cutoff || "2026-06-10T14:17:50Z"; // Deploy-Zeitpunkt der reparierten register-Function
  const today = new Date().toISOString().slice(0, 10);

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);

  let query = supabase
    .from("anmeldungen")
    .select("id, vorname, nachname, eltern_vorname, email, zahlungsstatus, betrag_euro, payer_type, parent_payment_status, list_price_euro, parent_amount_euro, sponsor_amount_euro, sponsor_settlement_status, notizen, created_at, sponsoring_partners(name,slug), camps!inner(name, datum_von, datum_bis, uhrzeit_von, uhrzeit_bis, ort, stripe_link)")
    .gte("camps.datum_von", today);

  if (scope === "missing_legacy") query = query.lt("created_at", cutoff);
  const { data: rows, error } = await query.order("created_at", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  const recipients = (rows ?? []).filter((r) => {
    const notes = String(r.notizen || "");
    const legacyStatus = String(r.zahlungsstatus || "").toLowerCase();
    if (["storniert", "cancelled", "erstattet", "refunded"].includes(legacyStatus)) return false;
    if (r.payer_type === "company") return false;
    if (!isSponsored(r) && legacyStatus !== "offen" && legacyStatus !== "bezahlt") return false;
    // Explizite payer_type-Felder sind kanonisch. Nur der getrennte historische
    // Firmenpfad bleibt aus diesem Privatversand ausgeschlossen.
    return !/\[TYP:SG\]/i.test(notes);
  });

  const results: Record<string, unknown>[] = [];
  for (const a of recipients) {
    const camp = a.camps as unknown as Record<string, unknown>;
    const buchungsNr = String(a.id).slice(0, 8).toUpperCase();
    const confirmationToken = await createStoredConfirmationToken(
      supabase,
      "registration",
      String(a.id),
      camp.datum_bis,
    );
    const confirmationLink = "https://www.talentexperte.de/bestaetigung.html?id=" +
      encodeURIComponent(String(a.id)) + "#token=" + encodeURIComponent(confirmationToken);
    const directPayLink = isOpenParentPayment(a) && camp.stripe_link
      ? camp.stripe_link + (String(camp.stripe_link).includes("?") ? "&" : "?") +
        "client_reference_id=" + a.id + "&prefilled_email=" + encodeURIComponent(a.email)
      : null;
    const payLink = directPayLink
      ? paymentStartLink(String(a.id), confirmationToken, String(directPayLink))
      : null;
    const notice = scope === "all_future"
      ? "Zu Ihrer Sicherheit erhalten Sie einen aktualisierten persönlichen Bestätigungslink. Der bisherige Link nur mit Buchungsnummer wird aus Datenschutzgründen ersetzt."
      : "Aufgrund eines technischen Fehlers hat Sie unsere automatische Bestätigung damals nicht erreicht. Hier finden Sie alle Angaben im Überblick:";

    const entry: Record<string, unknown> = {
      id: a.id, kind: a.vorname + " " + a.nachname, email: a.email,
      camp: camp.name, status: a.zahlungsstatus, buchungsNr,
    };

    if (apply) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [a.email],
            reply_to: "kontakt@talentexperte.de",
            subject: isSponsored(a)
              ? (scope === "all_future" ? "Aktualisierter sicherer Bestätigungslink – vollständig gesponsert – " : "Anmeldebestätigung – vollständig gesponsert – ") + camp.name + " (Buchungs-Nr. " + buchungsNr + ")"
              : (scope === "all_future" ? "Aktualisierter sicherer Bestätigungslink – " : "Anmeldebestätigung – ") + camp.name + " (Buchungs-Nr. " + buchungsNr + ")",
            html: buildHtml(a, camp, buchungsNr, payLink, confirmationLink, notice),
            attachments: isSponsored(a)
              ? [{
                path: "https://www.talentexperte.de/pdf/faq-camps-sponsoring.pdf",
                filename: "So-funktioniert-ein-gesponserter-Platz.pdf",
              }]
              : undefined,
          }),
        });
        if (res.ok) {
          entry.sent = true;
        } else {
          entry.sent = false;
          entry.error = res.status + ": " + (await res.text()).slice(0, 200);
        }
      } catch (e) {
        entry.sent = false;
        entry.error = String(e);
      }
      await new Promise((r) => setTimeout(r, 600)); // Resend-Rate-Limit schonen
    }
    results.push(entry);
  }

  return new Response(
    JSON.stringify({ apply, scope, cutoff: scope === "missing_legacy" ? cutoff : null, anzahl: results.length, results }, null, 2),
    { status: 200, headers: corsHeaders }
  );
});
