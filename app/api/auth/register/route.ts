import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const MIN_PASSWORD_LENGTH = 6;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const displayName = String(body.displayName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!displayName || !email || !password) {
    return NextResponse.json({ error: "Thiếu thông tin đăng ký" }, { status: 400 });
  }

  const ip = getClientIp(req.headers.get("x-forwarded-for"), "unknown");
  const rate = checkRateLimit(`register:${ip}`, 10, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu đăng ký, vui lòng thử lại sau." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds)
        }
      }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Email không hợp lệ" }, { status: 400 });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Mật khẩu phải từ ${MIN_PASSWORD_LENGTH} ký tự` },
      { status: 400 }
    );
  }

  const existing = await prisma.userAllowlist.findFirst({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email đã tồn tại" }, { status: 409 });
  }

  await prisma.userAllowlist.create({
    data: {
      displayName,
      email,
      passwordHash: hashPassword(password),
      status: "PENDING"
    }
  });

  return NextResponse.json({
    ok: true,
    message: "Đăng ký thành công. Tài khoản đang chờ admin duyệt."
  });
}
