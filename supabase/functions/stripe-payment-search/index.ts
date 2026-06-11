// Admin-Hilfsfunktion: durchsucht Stripe-Charges nach Name/E-Mail-Fragment,
// um Zahlungen zu finden, die keiner Anmeldung zugeordnet wurden.
// Auth: Service-Role-Key als Bearer. Body: { q: "castro", from?: "2026-03-01", to?: "2026-06-11" }
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Nur POST" }), { status: 405, headers: corsHeaders });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const myServiceKey = Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!auth || (auth !== serviceKey && auth !== myServiceKey)) {
    return new Response(JSON.stringify({ error: "Nicht autorisiert" }), { status: 401, headers: corsHeaders });
  }

  const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!STRIPE_KEY) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY fehlt" }), { status: 500, headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const q = String(body.q || "").toLowerCase();
  const from = Math.floor(new Date(body.from || "2026-01-01").getTime() / 1000);
  const to = Math.floor(new Date(body.to || new Date().toISOString()).getTime() / 1000);

  const matches: Record<string, unknown>[] = [];
  let startingAfter = "";
  for (let page = 0; page < 20; page++) {
    const url = "https://api.stripe.com/v1/charges?limit=100" +
      "&created[gte]=" + from + "&created[lte]=" + to +
      (startingAfter ? "&starting_after=" + startingAfter : "");
    const res = await fetch(url, { headers: { "Authorization": "Bearer " + STRIPE_KEY } });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Stripe " + res.status + ": " + (await res.text()).slice(0, 300) }), { status: 502, headers: corsHeaders });
    }
    const data = await res.json();
    for (const c of data.data) {
      const hay = JSON.stringify({
        email: c.billing_details?.email || c.receipt_email,
        name: c.billing_details?.name,
        desc: c.description,
      }).toLowerCase();
      if (!q || hay.includes(q)) {
        matches.push({
          id: c.id,
          payment_intent: c.payment_intent,
          amount_eur: c.amount / 100,
          status: c.status,
          refunded: c.refunded,
          created: new Date(c.created * 1000).toISOString(),
          email: c.billing_details?.email || c.receipt_email || null,
          name: c.billing_details?.name || null,
          description: c.description || null,
        });
      }
    }
    if (!data.has_more) break;
    startingAfter = data.data[data.data.length - 1].id;
  }

  return new Response(JSON.stringify({ q, anzahl: matches.length, matches }, null, 2), { status: 200, headers: corsHeaders });
});
