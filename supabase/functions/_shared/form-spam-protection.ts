type FormBody = Record<string, unknown>;

type ProtectionOptions = {
  purpose: string;
  contentFields: string[];
  emailField?: string;
  minAgeSeconds?: number;
  maxAgeSeconds?: number;
  honeypotFields?: string[];
};

type ProtectionResult = {
  ok: boolean;
  status?: number;
  error?: string;
  reason?: string;
};

const DEFAULT_HONEYPOT_FIELDS = ["website_url", "contact_url", "fax_number"];
const DEFAULT_MIN_AGE_SECONDS = 3;
const DEFAULT_MAX_AGE_SECONDS = 7200;
const rateLimitStore = new Map<string, number[]>();

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function getSecret(): string {
  return (
    Deno.env.get("REGISTRATION_FORM_SECRET") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    "talentexperte-local-dev-only"
  );
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(length = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toHex(signature);
}

export async function createFormToken(purpose: string): Promise<string> {
  const timestamp = nowSeconds();
  const nonce = randomHex(16);
  const payload = `${purpose}:${timestamp}:${nonce}`;
  const signature = await hmac(payload);
  return `${payload}:${signature}`;
}

async function verifyFormToken(token: unknown, purpose: string, maxAgeSeconds: number): Promise<boolean> {
  const value = asString(token, 300);
  const parts = value.split(":");
  if (parts.length !== 4) return false;

  const [tokenPurpose, timestampRaw, nonce, signature] = parts;
  if (tokenPurpose !== purpose) return false;
  if (!/^\d{10}$/.test(timestampRaw)) return false;
  if (!/^[a-f0-9]{32}$/.test(nonce)) return false;
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;

  const age = nowSeconds() - Number(timestampRaw);
  if (age < -60 || age > maxAgeSeconds) return false;

  const expected = await hmac(`${tokenPurpose}:${timestampRaw}:${nonce}`);
  return signature === expected;
}

export function asString(value: unknown, maxLength = 5000): string {
  const text = typeof value === "string" ? value : value == null ? "" : String(value);
  return text.replace(/\0/g, "").trim().slice(0, maxLength);
}

export function cleanText(value: unknown, maxLength = 5000): string {
  return asString(value, maxLength)
    .replace(/<[^>]*>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown";
}

function hashForLimit(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return String(hash >>> 0);
}

function rateLimitExceeded(scope: string, value: string, limit: number, windowSeconds: number): boolean {
  const key = `${scope}:${hashForLimit(value || "unknown")}`;
  const cutoff = nowSeconds() - windowSeconds;
  const kept = (rateLimitStore.get(key) || []).filter((timestamp) => timestamp > cutoff);

  if (kept.length >= limit) {
    rateLimitStore.set(key, kept);
    return true;
  }

  kept.push(nowSeconds());
  rateLimitStore.set(key, kept);
  return false;
}

function getFormAge(body: FormBody): number | null {
  const raw = body.form_started_at ?? body.form_time;
  const timestamp = typeof raw === "number" ? raw : Number(asString(raw, 20));
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return nowSeconds() - timestamp;
}

function looksLikeSpam(text: string): boolean {
  const combined = text.toLowerCase();
  const linkCount = (combined.match(/https?:\/\//g) || []).length +
    (combined.match(/\bwww\./g) || []).length;
  if (linkCount > 2) return true;

  const spamPatterns = [
    /\bviagra\b/i,
    /\bcialis\b/i,
    /\bcasino\b/i,
    /\bpoker\b/i,
    /\bcrypto\b/i,
    /\bforex\b/i,
    /\bloan\b/i,
    /\bpayday\b/i,
    /\bescort\b/i,
    /\bporn\b/i,
    /\bseo\s+backlinks?\b/i,
    /\[url=/i,
    /<a\s/i,
  ];

  if (spamPatterns.some((pattern) => pattern.test(text))) return true;
  if (/(.)\1{24,}/u.test(text)) return true;

  const asciiLetters = combined.replace(/[^a-z]/g, "");
  if (asciiLetters.length > 120 && /(.)\1{10,}/.test(asciiLetters)) return true;

  return false;
}

function logRejected(reason: string, req: Request, body: FormBody): void {
  const email = asString(body.email ?? body.mitarbeiter_email ?? body.firma_email, 200).toLowerCase();
  console.warn("Form spam protection rejected request", {
    reason,
    ip: getClientIp(req),
    email_hash: email ? hashForLimit(email) : null,
    user_agent: asString(req.headers.get("user-agent"), 160),
  });
}

export async function checkFormProtection(
  req: Request,
  body: FormBody,
  options: ProtectionOptions,
): Promise<ProtectionResult> {
  const honeypotFields = options.honeypotFields || DEFAULT_HONEYPOT_FIELDS;
  for (const field of honeypotFields) {
    if (asString(body[field], 500) !== "") {
      logRejected(`honeypot:${field}`, req, body);
      return { ok: false, status: 400, error: "Anfrage konnte nicht verarbeitet werden.", reason: "honeypot" };
    }
  }

  const maxAgeSeconds = options.maxAgeSeconds || DEFAULT_MAX_AGE_SECONDS;
  if (!await verifyFormToken(body.form_token, options.purpose, maxAgeSeconds)) {
    logRejected("invalid_token", req, body);
    return { ok: false, status: 400, error: "Anfrage konnte nicht verarbeitet werden.", reason: "invalid_token" };
  }

  const age = getFormAge(body);
  const minAgeSeconds = options.minAgeSeconds || DEFAULT_MIN_AGE_SECONDS;
  if (age == null || age < minAgeSeconds || age > maxAgeSeconds) {
    logRejected(`invalid_form_age:${age}`, req, body);
    return { ok: false, status: 400, error: "Anfrage konnte nicht verarbeitet werden.", reason: "invalid_form_age" };
  }

  const content = options.contentFields.map((field) => cleanText(body[field], 5000)).join(" ");
  if (looksLikeSpam(content)) {
    logRejected("content_spam", req, body);
    return { ok: false, status: 400, error: "Anfrage konnte nicht verarbeitet werden.", reason: "content_spam" };
  }

  const ip = getClientIp(req);
  if (rateLimitExceeded("ip-minute", ip, 20, 60) || rateLimitExceeded("ip-hour", ip, 60, 3600)) {
    logRejected("ip_rate_limited", req, body);
    return { ok: false, status: 429, error: "Bitte versuchen Sie es spaeter erneut.", reason: "ip_rate_limited" };
  }

  if (options.emailField) {
    const email = asString(body[options.emailField], 200).toLowerCase();
    if (email && rateLimitExceeded("email-hour", email, 12, 3600)) {
      logRejected("email_rate_limited", req, body);
      return { ok: false, status: 429, error: "Bitte versuchen Sie es spaeter erneut.", reason: "email_rate_limited" };
    }
  }

  return { ok: true };
}

export function checkTokenRateLimit(req: Request): ProtectionResult {
  const ip = getClientIp(req);
  if (rateLimitExceeded("token-ip", ip, 40, 3600)) {
    console.warn("Form token rate limit exceeded", {
      ip,
      user_agent: asString(req.headers.get("user-agent"), 160),
    });
    return { ok: false, status: 429, error: "Bitte versuchen Sie es spaeter erneut.", reason: "token_rate_limited" };
  }

  return { ok: true };
}
