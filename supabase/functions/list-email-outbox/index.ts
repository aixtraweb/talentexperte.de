import { AdminAuthError, requireDashboardAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.talentexperte.de",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Nur GET" }, 405);

  try {
    const admin = await requireDashboardAdmin(req);
    const { data, error } = await admin.serviceClient
      .from("email_outbox")
      .select("id,message_type,recipient,status,attempt_count,last_error,created_at,sent_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return json({ error: "Versandhistorie konnte nicht geladen werden" }, 500);
    return json({ success: true, messages: data || [] });
  } catch (error) {
    if (error instanceof AdminAuthError) return json({ error: error.message }, error.status);
    return json({ error: "Versandhistorie konnte nicht geladen werden" }, 500);
  }
});
