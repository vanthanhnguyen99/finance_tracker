import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, isCurrentPasswordHash, verifyPassword } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Thiếu email hoặc mật khẩu" }, { status: 400 });
  }

  const ip = getClientIp(req.headers.get("x-forwarded-for"), "unknown");
  const rate = checkRateLimit(`login:${ip}:${email}`, 8, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Đăng nhập thất bại quá nhiều lần, vui lòng thử lại sau." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds)
        }
      }
    );
  }

  const user = await prisma.userAllowlist.findFirst({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 401 });
  }

  if (user.status === "PENDING") {
    return NextResponse.json({ error: "Tài khoản đang chờ admin duyệt" }, { status: 403 });
  }

  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Tài khoản chưa được kích hoạt" }, { status: 403 });
  }

  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "Tài khoản chưa có mật khẩu. Liên hệ admin để đặt mật khẩu." },
      { status: 400 }
    );
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 401 });
  }

  if (!isCurrentPasswordHash(user.passwordHash)) {
    await prisma.userAllowlist
      .update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(password) }
      })
      .catch(() => undefined);
  }

  const { token, expiresAt } = await createSession(user.id);
  const res = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email
    }
  });

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const isHttps = req.nextUrl.protocol === "https:" || forwardedProto === "https";

  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });

  return res;
}
