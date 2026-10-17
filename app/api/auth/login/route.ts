import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, isCurrentPasswordHash, verifyPassword } from "@/lib/auth";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_SECURE } from "@/lib/session-constants";
import { checkRateLimit, getRequestClientIp } from "@/lib/rate-limit";
import { withApiSecurity, readJsonBody } from "@/lib/http-security";

export const dynamic = "force-dynamic";
const INVALID_LOGIN = "Email hoặc mật khẩu không đúng hoặc tài khoản chưa được kích hoạt";
// Equal-cost verification for absent, disabled, pending and active accounts.
const DUMMY_HASH = `scrypt_v2:${"0".repeat(32)}:${"0".repeat(128)}`;
async function handlePOST(req: NextRequest) {
  const body = await readJsonBody(req);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return NextResponse.json({ error: "Thiếu email hoặc mật khẩu" }, { status: 400 });
  const accountRate = checkRateLimit(`login-account:${email}`, 8, 10 * 60 * 1000);
  const clientRate = checkRateLimit(`login-client:${getRequestClientIp(req.headers)}`, 40, 10 * 60 * 1000);
  const rate = accountRate.allowed ? clientRate : accountRate;
  if (!rate.allowed) return NextResponse.json({ error: "Quá nhiều yêu cầu đăng nhập, vui lòng thử lại sau." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  const user = await prisma.userAllowlist.findFirst({ where: { email } });
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!valid || !user?.passwordHash || user.status !== "ACTIVE") return NextResponse.json({ error: INVALID_LOGIN }, { status: 401 });
  const upgrade = isCurrentPasswordHash(user.passwordHash) ? undefined : await hashPassword(password);
  const session = await createSession(user.id, user.passwordHash, upgrade);
  if (!session) return NextResponse.json({ error: INVALID_LOGIN }, { status: 401 });
  const res = NextResponse.json({ ok: true, user: { id: user.id, displayName: user.displayName, email: user.email } });
  res.cookies.set(SESSION_COOKIE_NAME, session.token, { httpOnly: true, secure: SESSION_COOKIE_SECURE, sameSite: "lax", path: "/", expires: session.expiresAt });
  res.cookies.set("session", "", { httpOnly: true, secure: SESSION_COOKIE_SECURE, sameSite: "lax", path: "/", expires: new Date(0) });
  // Development keeps the historical cookie name; do not overwrite its fresh value.
  if (!SESSION_COOKIE_SECURE) res.cookies.set(SESSION_COOKIE_NAME, session.token, { httpOnly: true, secure: false, sameSite: "lax", path: "/", expires: session.expiresAt });
  return res;
}
export const POST = withApiSecurity(handlePOST);
