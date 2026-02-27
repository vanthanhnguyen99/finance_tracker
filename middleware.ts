import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const protectedPaths = new Set(["/", "/add", "/history"]);
const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const IMAGE_REQUEST_LIMIT = 120;
const IMAGE_REQUEST_WINDOW_MS = 60 * 1000;
const MAX_API_BODY_BYTES = 1024 * 1024; // 1MB

function isSameOriginMutation(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    return false;
  }

  const hosts = new Set<string>();
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = req.headers.get("host")?.trim();
  if (forwardedHost) hosts.add(forwardedHost);
  if (host) hosts.add(host);
  if (req.nextUrl.host) hosts.add(req.nextUrl.host);

  return hosts.has(parsedOrigin.host);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  const middlewareSubrequest = req.headers.get("x-middleware-subrequest");

  // Mitigation: reject external attempts to inject Next.js middleware internal header.
  if (middlewareSubrequest) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  if (pathname.startsWith("/api/") && mutatingMethods.has(req.method)) {
    if (!isSameOriginMutation(req)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }

    const contentLength = req.headers.get("content-length");
    if (contentLength) {
      const parsedLength = Number(contentLength);
      if (!Number.isFinite(parsedLength) || parsedLength < 0) {
        return NextResponse.json({ error: "Invalid content length" }, { status: 400 });
      }
      if (parsedLength > MAX_API_BODY_BYTES) {
        return NextResponse.json({ error: "Payload too large" }, { status: 413 });
      }
    }
  }

  if (pathname === "/_next/image") {
    const ip = getClientIp(req.headers.get("x-forwarded-for"), "unknown");
    const rate = checkRateLimit(`img:${ip}`, IMAGE_REQUEST_LIMIT, IMAGE_REQUEST_WINDOW_MS);
    if (!rate.allowed) {
      const response = new NextResponse("Too Many Requests", { status: 429 });
      response.headers.set("Retry-After", String(rate.retryAfterSeconds));
      return response;
    }
  }

  if (protectedPaths.has(pathname) && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/add", "/history", "/login", "/register", "/_next/image", "/api/:path*"]
};
