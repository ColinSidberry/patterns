import { NextRequest, NextResponse } from "next/server";
import { CODE_COOKIE, verifyToken } from "@/lib/code-auth";

// Gate ONLY the /code viewer. The rest of the app stays public.
// Next 16 "proxy" convention (formerly middleware.ts).
export async function proxy(req: NextRequest) {
  const secret = process.env.SITE_SECRET;
  if (!secret) {
    // Fail closed if the gate isn't configured.
    return new NextResponse("Code viewer not configured", { status: 503 });
  }

  const ok = await verifyToken(req.cookies.get(CODE_COOKIE)?.value, secret);
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/code/login";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  // Match /code and everything under it EXCEPT the login page itself
  // (otherwise the redirect would loop).
  matcher: ["/code", "/code/((?!login).*)"],
};
