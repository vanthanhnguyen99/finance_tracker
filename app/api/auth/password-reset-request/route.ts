import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const MIN_PASSWORD_LENGTH = 6;

const GENERIC_OK_MESSAGE =
  "Nếu tài khoản hợp lệ, yêu cầu đặt lại mật khẩu đã được gửi và đang chờ admin duyệt.";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const newPassword = String(body.newPassword ?? "");

  if (!email || !newPassword) {
    return NextResponse.json({ error: "Thiếu email hoặc mật khẩu mới" }, { status: 400 });
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Mật khẩu mới phải từ ${MIN_PASSWORD_LENGTH} ký tự` },
      { status: 400 }
    );
  }

  const ip = getClientIp(req.headers.get("x-forwarded-for"), "unknown");
  const rate = checkRateLimit(`forgot-password:${ip}:${email}`, 6, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu, vui lòng thử lại sau." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds)
        }
      }
    );
  }

  const user = await prisma.userAllowlist.findFirst({
    where: { email, status: "ACTIVE" },
    select: { id: true }
  });

  // Always return a generic response to avoid account enumeration.
  if (!user) {
    return NextResponse.json({ ok: true, message: GENERIC_OK_MESSAGE });
  }

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetRequest.deleteMany({
      where: {
        userId: user.id,
        status: "PENDING"
      }
    });

    await tx.passwordResetRequest.create({
      data: {
        userId: user.id,
        newPasswordHash: hashPassword(newPassword),
        status: "PENDING"
      }
    });
  });

  return NextResponse.json({ ok: true, message: GENERIC_OK_MESSAGE });
}
