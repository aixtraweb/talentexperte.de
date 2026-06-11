// Einmal-Funktion: versendet Anmeldebestätigungen nachträglich an Eltern,
// die wegen des falschen Resend-Absenders (onboarding@resend.dev) nie eine erhalten haben.
// Aufruf nur mit Service-Role-Key als Bearer. Ohne { "apply": true } nur Dry-Run.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

function buildHtml(a: Record<string, unknown>, camp: Record<string, unknown>, buchungsNr: string, payLink: string | null): string {
  const bezahlt = a.zahlungsstatus === "bezahlt";
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#111;color:#fff;border-radius:12px;overflow:hidden">
  <div style="background:#e50000;padding:24px 32px">
    <h1 style="margin:0;font-size:24px;color:#fff">TALENTEXPERTE</h1>
    <p style="margin:4px 0 0;font-size:14px;color:#fff;opacity:.9">Anmeldebestätigung</p>
  </div>
  <div style="padding:32px">
    <p>Hallo ${a.eltern_vorname},</p>
    <p>vielen Dank für die Anmeldung von <strong>${a.vorname}</strong> zum <strong>${camp.name}</strong>!</p>
    <p style="font-size:13px;color:#aaa">Aufgrund eines technischen Fehlers hat dich unsere automatische Bestätigung damals leider nicht erreicht – hier sind alle Infos im Überblick:</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;color:#ddd">
      <tr><td style="padding:6px 0;color:#888">Buchungs-Nr.</td><td style="padding:6px 0"><strong style="letter-spacing:.08em;color:#fff">${buchungsNr}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#888">Zeitraum</td><td style="padding:6px 0">${formatDateDE(camp.datum_von as string)} – ${formatDateDE(camp.datum_bis as string)}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Uhrzeit</td><td style="padding:6px 0">${formatTime(camp.uhrzeit_von as string)} – ${formatTime(camp.uhrzeit_bis as string)}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Ort</td><td style="padding:6px 0">${camp.ort || "–"}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Betrag</td><td style="padding:6px 0"><strong style="color:#fff">${a.betrag_euro} €</strong></td></tr>
    </table>
    ${bezahlt
      ? `<p style="margin:24px 0;color:#7be07b;font-weight:bold">✓ Zahlung erhalten – der Platz ist verbindlich reserviert.</p>`
      : (payLink
        ? `<p style="margin:24px 0"><a href="${payLink}" style="display:inline-block;background:#e50000;color:#fff;padding:14px 32px;border-radius:30px;text-decoration:none;font-weight:bold">JETZT BEZAHLEN</a></p>
           <p style="font-size:13px;color:#888">Der Platz wird erst nach Zahlungseingang verbindlich reserviert.</p>`
        : "")}
    <p style="font-size:13px;color:#888">Deine Bestätigung kannst du jederzeit hier abrufen:<br>
      <a href="https://www.talentexperte.de/bestaetigung.html?id=${a.id}" style="color:#e50000">https://www.talentexperte.de/bestaetigung.html?id=${a.id}</a></p>
    <p style="font-size:13px;color:#888">Bei Fragen erreichst du uns unter <a href="mailto:kontakt@talentexperte.de" style="color:#e50000">kontakt@talentexperte.de</a>.</p>
  </div>
</div>`;
}

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

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY fehlt" }), { status: 500, headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const apply = body.apply === true;
  const cutoff = body.cutoff || "2026-06-10T14:17:50Z"; // Deploy-Zeitpunkt der reparierten register-Function
  const today = new Date().toISOString().slice(0, 10);

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);

  const { data: rows, error } = await supabase
    .from("anmeldungen")
    .select("id, vorname, nachname, eltern_vorname, email, zahlungsstatus, betrag_euro, notizen, created_at, camps!inner(name, datum_von, datum_bis, uhrzeit_von, uhrzeit_bis, ort, stripe_link)")
    .in("zahlungsstatus", ["offen", "bezahlt"])
    .lt("created_at", cutoff)
    .gte("camps.datum_von", today)
    .order("created_at", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  const recipients = (rows ?? []).filter((r) => !(r.notizen || "").includes("[TYP:"));

  const results: Record<string, unknown>[] = [];
  for (const a of recipients) {
    const camp = a.camps as Record<string, unknown>;
    const buchungsNr = String(a.id).slice(0, 8).toUpperCase();
    const payLink = camp.stripe_link
      ? camp.stripe_link + (String(camp.stripe_link).includes("?") ? "&" : "?") +
        "client_reference_id=" + a.id + "&prefilled_email=" + encodeURIComponent(a.email)
      : null;

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
            subject: "Anmeldebestätigung – " + camp.name + " (Buchungs-Nr. " + buchungsNr + ")",
            html: buildHtml(a, camp, buchungsNr, payLink),
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
    JSON.stringify({ apply, cutoff, anzahl: results.length, results }, null, 2),
    { status: 200, headers: corsHeaders }
  );
});
