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

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return json({ error: "Ungültige E-Mail-ID" }, 400);
  }

  try {
    const admin = await requireDashboardAdmin(req);
    const { data, error } = await admin.serviceClient
      .from("email_outbox")
      .select("id,message_type,recipient,status,attempt_count,last_error,created_at,sent_at,payload")
      .eq("id", id)
      .maybeSingle();
    if (error) return json({ error: "E-Mail-Details konnten nicht geladen werden" }, 500);
    if (!data) return json({ error: "E-Mail nicht gefunden" }, 404);

    const payload = (data.payload || {}) as Record<string, unknown>;
    return json({
      success: true,
      message: {
        id: data.id,
        message_type: data.message_type,
        recipient: data.recipient,
        status: data.status,
        attempt_count: data.attempt_count,
        last_error: data.last_error,
        created_at: data.created_at,
        sent_at: data.sent_at,
        subject: typeof payload.subject === "string" ? payload.subject : "",
        html: typeof payload.html === "string" ? payload.html : "",
        text: typeof payload.text === "string" ? payload.text : "",
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthError) return json({ error: error.message }, error.status);
    return json({ error: "E-Mail-Details konnten nicht geladen werden" }, 500);
  }
});
