import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CODE_COOKIE, signToken } from "@/lib/code-auth";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: Request) {
  const secret = process.env.SITE_SECRET;
  const expected = process.env.SITE_PASSWORD;
  if (!secret || !expected) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (!timingSafeEqual(password, expected)) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const token = await signToken(secret);
  const store = await cookies();
  store.set(CODE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // In production set COOKIE_DOMAIN=.colinsidberry.com so the same login
    // unlocks every subdomain. Unset locally so it works on localhost.
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}
