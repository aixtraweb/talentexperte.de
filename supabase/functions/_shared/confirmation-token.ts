const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^(\d{10})\.([a-f0-9]{64})$/;
const MAX_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 400;
const MIN_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const CAMP_GRACE_SECONDS = 60 * 60 * 24 * 30;

export class ConfirmationConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfirmationConfigurationError";
  }
}

function getSecret(): string {
  const secret = Deno.env.get("CONFIRMATION_LINK_SECRET") || "";
  if (secret.length < 32) {
    throw new ConfirmationConfigurationError(
      "CONFIRMATION_LINK_SECRET fehlt oder ist zu kurz.",
    );
  }
  return secret;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes.buffer;
}

export function assertConfirmationTokenConfiguration(): void {
  getSecret();
}

export function confirmationExpiryForCamp(campEnd: unknown): number {
  const now = Math.floor(Date.now() / 1000);
  const parsed = Date.parse(String(campEnd || "") + "T23:59:59Z");
  const desired = Number.isFinite(parsed)
    ? Math.floor(parsed / 1000) + CAMP_GRACE_SECONDS
    : now + MIN_TOKEN_TTL_SECONDS;
  return Math.max(
    now + MIN_TOKEN_TTL_SECONDS,
    Math.min(desired, now + MAX_TOKEN_TTL_SECONDS),
  );
}

export async function createConfirmationToken(
  registrationId: string,
  expiresAt = Math.floor(Date.now() / 1000) + MIN_TOKEN_TTL_SECONDS,
): Promise<string> {
  if (!UUID_PATTERN.test(registrationId)) {
    throw new Error("CONFIRMATION_REGISTRATION_ID_INVALID");
  }
  const now = Math.floor(Date.now() / 1000);
  if (
    !Number.isInteger(expiresAt) || expiresAt < now ||
    expiresAt > now + MAX_TOKEN_TTL_SECONDS
  ) {
    throw new Error("CONFIRMATION_EXPIRY_INVALID");
  }
  const payload = `${registrationId.toLowerCase()}.${expiresAt}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getKey(),
    new TextEncoder().encode(payload),
  );
  return `${expiresAt}.${toHex(signature)}`;
}

export async function verifyConfirmationToken(
  registrationId: string,
  token: unknown,
): Promise<boolean> {
  if (!UUID_PATTERN.test(registrationId)) return false;
  const match = String(token || "").trim().match(TOKEN_PATTERN);
  if (!match) return false;

  const expiresAt = Number(match[1]);
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt < now || expiresAt > now + MAX_TOKEN_TTL_SECONDS + 300) {
    return false;
  }

  const payload = `${registrationId.toLowerCase()}.${expiresAt}`;
  return crypto.subtle.verify(
    "HMAC",
    await getKey(),
    fromHex(match[2]),
    new TextEncoder().encode(payload),
  );
}
