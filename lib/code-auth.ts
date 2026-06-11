// Edge-safe (Web Crypto) HMAC cookie signing/verification for the /code gate.
// Used by both middleware (verify, edge runtime) and the login route (sign, node).
// No Node Buffer here so it runs unchanged in the edge runtime.

const encoder = new TextEncoder();

export const CODE_COOKIE = "code_auth";

function toBase64Url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toBase64Url(sig);
}

// token format: "<expiryMs>.<base64url hmac(expiryMs)>"
export async function signToken(
  secret: string,
  ttlMs = 1000 * 60 * 60 * 24 * 30, // 30 days
): Promise<string> {
  const exp = String(Date.now() + ttlMs);
  const sig = await hmac(exp, secret);
  return `${exp}.${sig}`;
}

export async function verifyToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(exp)) return false;
  if (Date.now() > Number(exp)) return false;

  const expected = await hmac(exp, secret);
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
