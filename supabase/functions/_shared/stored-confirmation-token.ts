import { confirmationExpiryForCamp } from "./confirmation-token.ts";

const V2_PATTERN = /^v2\.([A-Za-z0-9_-]{43})$/;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export async function createStoredConfirmationToken(
  supabase: any,
  subjectType: "registration" | "company_registration",
  subjectId: string,
  campEnd: unknown,
): Promise<string> {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const token = `v2.${toBase64Url(random)}`;
  const expiresAtSeconds = confirmationExpiryForCamp(campEnd);
  const { error } = await supabase.from("confirmation_tokens").insert({
    token_hash: await sha256(token),
    subject_type: subjectType,
    subject_id: subjectId,
    expires_at: new Date(expiresAtSeconds * 1000).toISOString(),
  });
  if (error) throw new Error(`CONFIRMATION_TOKEN_STORE_FAILED: ${error.message}`);
  return token;
}

export async function verifyStoredConfirmationToken(
  supabase: any,
  subjectType: "registration" | "company_registration",
  subjectId: string,
  token: unknown,
): Promise<boolean> {
  const value = String(token || "").trim();
  if (!V2_PATTERN.test(value)) return false;
  const tokenHash = await sha256(value);
  const { data, error } = await supabase.from("confirmation_tokens")
    .select("token_hash")
    .eq("token_hash", tokenHash)
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return false;
  await supabase.from("confirmation_tokens").update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);
  return true;
}

export function isStoredConfirmationToken(token: unknown): boolean {
  return V2_PATTERN.test(String(token || "").trim());
}
