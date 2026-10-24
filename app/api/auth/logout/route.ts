import { withApiSecurity } from "@/lib/http-security";
import { NextRequest, NextResponse } from "next/server";
import { deleteSessionByToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_SECURE } from "@/lib/session-constants";

export const dynamic = "force-dynamic";

async function handlePOST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  await deleteSessionByToken(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: SESSION_COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    expires: new Date(0)
  });

  res.cookies.set("session", "", { httpOnly: true, secure: SESSION_COOKIE_SECURE, sameSite: "lax", path: "/", expires: new Date(0) });
  return res;
}

export const POST = withApiSecurity(handlePOST);
