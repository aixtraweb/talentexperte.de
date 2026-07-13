import { AdminAuthError, requireDashboardAdmin } from "../_shared/admin-auth.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const GOOGLE_REVIEW_LINK = "https://g.page/r/CRwplaTKzL7VEBM/review";
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.talentexperte.de",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function mailHtml(familyName: string, children: string, campName: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222">
    <h1 style="color:#111">TALENTEXPERTE Fußballschule</h1>
    <p>Guten Tag Familie ${escapeHtml(familyName)},</p>
    <p>${escapeHtml(children)} war beim ${escapeHtml(campName)} dabei. Wir freuen uns über eine kurze Rückmeldung.</p>
    <p><a href="${GOOGLE_REVIEW_LINK}" style="display:inline-block;background:#eab308;color:#000;padding:14px 24px;border-radius:6px;text-decoration:none;font-weight:700">Google-Bewertung abgeben</a></p>
    <p>Vielen Dank für Ihre Unterstützung.</p>
    <p>Sportliche Grüße<br>TALENTEXPERTE Fußballschule</p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Nur POST" }, 405);

  try {
    const admin = await requireDashboardAdmin(req);
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY fehlt" }, 503);
    const body = await req.json().catch(() => ({}));
    const campId = String(body.campId || "").trim();
    const force = body.force === true;
    if (!/^[0-9a-f-]{36}$/i.test(campId)) return json({ error: "Gültige campId erforderlich" }, 400);

    const { data: previous } = await admin.serviceClient.from("email_campaign_runs")
      .select("id,status,finished_at")
      .eq("campaign_type", "google_review")
      .eq("camp_id", campId)
      .in("status", ["running", "completed", "partial"])
      .maybeSingle();
    if (previous && !force) {
      return json({
        error: "Für dieses Camp wurde der Review-Versand bereits gestartet oder abgeschlossen.",
        previous,
      }, 409);
    }

    let runId = previous?.id || "";
    if (previous) {
      const { error } = await admin.serviceClient.from("email_campaign_runs").update({
        requested_by: admin.email,
        status: "running",
        sent_count: 0,
        failed_count: 0,
        error_summary: null,
        started_at: new Date().toISOString(),
        finished_at: null,
      }).eq("id", previous.id);
      if (error) return json({ error: "Versandlauf konnte nicht reserviert werden" }, 409);
    } else {
      const { data: run, error } = await admin.serviceClient.from("email_campaign_runs").insert({
        campaign_type: "google_review",
        camp_id: campId,
        requested_by: admin.email,
      }).select("id").single();
      if (error || !run) return json({ error: "Versand wurde bereits parallel gestartet" }, 409);
      runId = run.id;
    }

    const [{ data: participants, error: participantsError }, { data: camp }] = await Promise.all([
      admin.serviceClient.from("anmeldungen")
        .select("vorname,nachname,email")
        .eq("camp_id", campId)
        .eq("zahlungsstatus", "bezahlt")
        .not("email", "is", null),
      admin.serviceClient.from("camps").select("name").eq("id", campId).maybeSingle(),
    ]);
    if (participantsError) throw new Error(participantsError.message);

    const recipients = new Map<string, { email: string; family: string; children: string[] }>();
    for (const row of participants || []) {
      const email = String(row.email || "").trim().toLowerCase();
      if (!email) continue;
      if (!recipients.has(email)) recipients.set(email, { email, family: row.nachname, children: [] });
      recipients.get(email)!.children.push(row.vorname);
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    for (const recipient of recipients.values()) {
      const children = recipient.children.join(" und ");
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "TALENTEXPERTE Fußballschule <kontakt@talentexperte.de>",
          to: [recipient.email],
          reply_to: "kontakt@talentexperte.de",
          subject: `Wie hat ${children.replace(/[\r\n]+/g, " ")} das Camp gefallen?`,
          html: mailHtml(recipient.family, children, camp?.name || "Feriencamp"),
        }),
      });
      if (response.ok) sent++;
      else {
        failed++;
        errors.push(`Resend ${response.status}: ${(await response.text()).slice(0, 200)}`);
      }
    }

    await admin.serviceClient.from("email_campaign_runs").update({
      status: failed ? (sent ? "partial" : "failed") : "completed",
      sent_count: sent,
      failed_count: failed,
      error_summary: errors.join(" | ").slice(0, 2000) || null,
      finished_at: new Date().toISOString(),
    }).eq("id", runId);
    return json({ success: failed === 0, sent, failed, total: recipients.size });
  } catch (error) {
    if (error instanceof AdminAuthError) return json({ error: error.message }, error.status);
    const message = error instanceof Error ? error.message : String(error);
    console.error("Review campaign failed:", message);
    return json({ error: "Review-Versand fehlgeschlagen" }, 500);
  }
});
