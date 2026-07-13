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
  try {
    const admin = await requireDashboardAdmin(req);
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeKey) return json({ error: "Stripe ist nicht konfiguriert" }, 503);
    const body = await req.json().catch(() => ({}));
    const registrationId = String(body.registration_id || "").trim();
    const reason = String(body.reason || "").trim().slice(0, 500);
    if (!/^[0-9a-f-]{36}$/i.test(registrationId)) return json({ error: "Ungültige Anmeldung" }, 400);
    if (reason.length < 5) return json({ error: "Bitte einen Erstattungsgrund angeben" }, 400);

    const { data: registration, error } = await admin.serviceClient.from("anmeldungen")
      .select("id,zahlungsstatus,parent_payment_status,parent_amount_euro,payer_type,stripe_payment_id")
      .eq("id", registrationId)
      .maybeSingle();
    if (error || !registration) return json({ error: "Anmeldung nicht gefunden" }, 404);
    if (
      registration.payer_type !== "parent" || registration.parent_payment_status !== "paid" ||
      registration.zahlungsstatus !== "bezahlt" || !registration.stripe_payment_id
    ) return json({ error: "Keine eindeutig zugeordnete Stripe-Zahlung für diese Anmeldung" }, 409);

    const refundBody = new URLSearchParams({
      payment_intent: registration.stripe_payment_id,
      reason: "requested_by_customer",
      "metadata[registration_id]": registrationId,
      "metadata[admin_email]": admin.email,
      "metadata[internal_reason]": reason,
    });
    const stripeResponse = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `talentexperte-refund-${registrationId}`,
      },
      body: refundBody.toString(),
    });
    const refund = await stripeResponse.json().catch(() => ({}));
    if (!stripeResponse.ok || refund.status === "failed") {
      console.error("Stripe refund failed:", refund?.error?.message || stripeResponse.status);
      return json({ error: "Stripe-Erstattung fehlgeschlagen. Der Datenbankstatus wurde nicht geändert." }, 502);
    }

    const updatedData = {
      zahlungsstatus: "erstattet",
      parent_payment_status: "refunded",
      erstattet_am: new Date().toISOString(),
      stripe_refund_id: refund.id,
      refund_reason: reason,
    };
    const { error: updateError } = await admin.serviceClient.from("anmeldungen")
      .update(updatedData).eq("id", registrationId).eq("parent_payment_status", "paid");
    if (updateError) {
      console.error("Refund succeeded but DB update failed:", updateError.message, refund.id);
      return json({
        error: "Stripe hat erstattet, aber der Dashboardstatus konnte nicht gespeichert werden. Bitte sofort manuell prüfen.",
        refund_id: refund.id,
      }, 500);
    }

    await admin.serviceClient.from("security_audit_log").insert({
      table_name: "anmeldungen",
      record_id: registrationId,
      action: "UPDATE",
      actor_user_id: admin.userId,
      actor_email: admin.email,
      old_data: registration,
      new_data: { ...registration, ...updatedData, refund_id: refund.id, refund_reason: reason },
    });
    return json({ success: true, refund_id: refund.id, status: refund.status });
  } catch (error) {
    if (error instanceof AdminAuthError) return json({ error: error.message }, error.status);
    console.error(error);
    return json({ error: "Erstattung konnte nicht verarbeitet werden" }, 500);
  }
});
