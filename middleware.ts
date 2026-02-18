import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

const protectedPaths = new Set(["/", "/add", "/history"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  const middlewareSubrequest = req.headers.get("x-middleware-subrequest");

  // Mitigation: reject external attempts to inject Next.js middleware internal header.
  if (middlewareSubrequest) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  if (protectedPaths.has(pathname) && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/add", "/history", "/login", "/register"]
};
