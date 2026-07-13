import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { AdminAuthError, requireDashboardAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.talentexperte.de",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Nur POST" }, 405);
  const expected = Deno.env.get("OUTBOX_PROCESSOR_SECRET") || "";
  const received = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!expected || received !== expected) {
    try {
      await requireDashboardAdmin(req);
    } catch (error) {
      if (error instanceof AdminAuthError) return json({ error: error.message }, error.status);
      return json({ error: "Nicht autorisiert" }, 401);
    }
  }
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  if (!resendKey) return json({ error: "RESEND_API_KEY fehlt" }, 503);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await supabase.from("email_outbox").update({
    status: "failed",
    last_error: "Abgebrochener Versandlauf wurde wieder aufgenommen.",
    processing_started_at: null,
    next_attempt_at: new Date().toISOString(),
  }).eq("status", "sending")
    .lt("processing_started_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());
  const { data: pending, error } = await supabase.from("email_outbox")
    .select("id,payload,attempt_count")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(25);
  if (error) return json({ error: "Outbox konnte nicht geladen werden" }, 500);

  let sent = 0;
  let failed = 0;
  for (const item of pending || []) {
    const { data: claimed } = await supabase.from("email_outbox").update({
      status: "sending",
      processing_started_at: new Date().toISOString(),
    })
      .eq("id", item.id).in("status", ["pending", "failed"]).select("id").maybeSingle();
    if (!claimed) continue;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `talentexperte-outbox-${item.id}`,
        },
        body: JSON.stringify(item.payload),
      });
      if (!response.ok) throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 300)}`);
      await supabase.from("email_outbox").update({
        status: "sent",
        attempt_count: Number(item.attempt_count || 0) + 1,
        sent_at: new Date().toISOString(),
        last_error: null,
        processing_started_at: null,
      }).eq("id", item.id);
      sent++;
    } catch (error) {
      const attempt = Number(item.attempt_count || 0) + 1;
      const delayMinutes = Math.min(24 * 60, Math.pow(2, Math.min(attempt, 8)) * 5);
      await supabase.from("email_outbox").update({
        status: "failed",
        attempt_count: attempt,
        next_attempt_at: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString(),
        last_error: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
        processing_started_at: null,
      }).eq("id", item.id);
      failed++;
    }
  }
  return json({ success: true, processed: sent + failed, sent, failed });
});
