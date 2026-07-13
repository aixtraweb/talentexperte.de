import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type AdminContext = {
  userId: string;
  email: string;
  token: string;
  // Die Datenbanktypen werden in diesem statischen Projekt nicht generiert.
  // `any` verhindert hier fälschlich auf `never` verengte Tabellenresultate.
  serviceClient: any;
};

export class AdminAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

export async function requireDashboardAdmin(req: Request): Promise<AdminContext> {
  const authHeader = req.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new AdminAuthError("Nicht autorisiert", 401);

  const url = Deno.env.get("SUPABASE_URL") || Deno.env.get("MY_SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceKey) throw new AdminAuthError("Admin-Dienst ist nicht konfiguriert", 503);

  const serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = match[1].trim();
  const { data, error } = await serviceClient.auth.getUser(token);
  if (error || !data.user) throw new AdminAuthError("Ungültige Sitzung", 401);

  const email = String(data.user.email || "").trim().toLowerCase();
  const { data: admin, error: adminError } = await serviceClient
    .from("dashboard_admins")
    .select("email")
    .eq("email", email)
    .eq("active", true)
    .maybeSingle();
  if (adminError || !admin) throw new AdminAuthError("Keine Admin-Berechtigung", 403);

  return { userId: data.user.id, email, token, serviceClient };
}
