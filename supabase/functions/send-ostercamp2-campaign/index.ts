import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Diese einmalige Kampagne ist dauerhaft beendet. Es gibt absichtlich weder
// Datenbankzugriff noch Versandlogik, Empfaengerauswahl oder Reaktivierungsflag.
serve((req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Nur POST" }),
      {
        headers: { "Content-Type": "application/json" },
        status: 405,
      },
    );
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: "Diese einmalige Kampagne ist dauerhaft beendet.",
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 410,
    },
  );
});
