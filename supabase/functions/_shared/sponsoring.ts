const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class SponsorConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SponsorConfigurationError";
  }
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Normalizes codes before HMAC generation. Separators, capitalization and
 * diacritics are deliberately ignored so parents can enter printed codes
 * without formatting surprises.
 */
export function normalizeSponsorCode(value: unknown): string {
  const text = typeof value === "string"
    ? value
    : value == null
    ? ""
    : String(value);
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleUpperCase("de-DE")
    .replace(/[^A-Z0-9]+/g, "")
    .trim()
    .slice(0, 120);
}

/** Must stay byte-for-byte compatible with scripts/import-sponsoring-entitlements.mjs. */
export function normalizeChildName(
  firstName: unknown,
  lastName: unknown,
): string {
  const first = typeof firstName === "string"
    ? firstName
    : firstName == null
    ? ""
    : String(firstName);
  const last = typeof lastName === "string"
    ? lastName
    : lastName == null
    ? ""
    : String(lastName);

  return `${first} ${last}`
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("de-DE")
    .replace(/ß/g, "ss")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSponsorValue(value: string): Promise<string> {
  const pepper = Deno.env.get("SPONSOR_CODE_PEPPER") || "";
  if (pepper.length < 24) {
    throw new SponsorConfigurationError(
      "SPONSOR_CODE_PEPPER fehlt oder ist zu kurz.",
    );
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return toHex(signature);
}

export async function hashSponsorCode(rawCode: unknown): Promise<string> {
  const normalizedCode = normalizeSponsorCode(rawCode);
  if (normalizedCode.length < 16) {
    throw new Error("SPONSOR_CODE_INVALID");
  }
  return hmacSponsorValue(normalizedCode);
}

export async function hashSponsorRateLimitIdentity(
  identity: unknown,
): Promise<string> {
  const normalizedIdentity = String(identity || "unknown").trim().slice(0, 200);
  return hmacSponsorValue(`rate-limit:${normalizedIdentity}`);
}
