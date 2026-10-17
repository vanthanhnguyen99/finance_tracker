import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";
import { isSameOriginMutation, MAX_API_BODY_BYTES, PRIVATE_CACHE_CONTROL } from "@/lib/http-security";

export function middleware(req: NextRequest) {
  const nonce = crypto.randomBytes(18).toString("base64");
  const development = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'", `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self'",
    `connect-src 'self'${development ? " ws: wss:" : ""}`, "object-src 'none'", "base-uri 'self'",
    "form-action 'self'", "frame-ancestors 'none'"
  ].join("; ");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  let response: NextResponse;
  const pathname = req.nextUrl.pathname;
  if (req.headers.has("x-middleware-subrequest")) response = new NextResponse("Bad Request", { status: 400 });
  else if (pathname.startsWith("/api/") && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !isSameOriginMutation(req))
    response = NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  else if (pathname.startsWith("/api/") && req.headers.has("content-length") && (!/^\d+$/.test(req.headers.get("content-length")!) || Number(req.headers.get("content-length")) > MAX_API_BODY_BYTES))
    response = NextResponse.json({ error: "Payload too large" }, { status: 413 });
  else if (new Set(["/", "/add", "/history", "/budgets", "/reports"]).has(pathname) && !req.cookies.get(SESSION_COOKIE_NAME)?.value)
    response = NextResponse.redirect(new URL("/login", req.url));
  else response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg|manifest.webmanifest).*)"]
};
