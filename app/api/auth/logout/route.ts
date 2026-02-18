import { NextRequest, NextResponse } from "next/server";
import { deleteSessionByToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  await deleteSessionByToken(token);

  const res = NextResponse.json({ ok: true });
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const isHttps = req.nextUrl.protocol === "https:" || forwardedProto === "https";
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    expires: new Date(0)
  });

  return res;
}
