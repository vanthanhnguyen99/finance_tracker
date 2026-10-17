import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { withApiSecurity, readJsonBody, requireClientRateLimit } from "@/lib/http-security";
export const dynamic = "force-dynamic";
async function handlePOST(req: NextRequest) {
  const body = await readJsonBody(req);
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!displayName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12)
    return NextResponse.json({ error: "Tên, email hợp lệ và mật khẩu từ 12 đến 128 ký tự là bắt buộc." }, { status: 400 });
  requireClientRateLimit(req, "register", 10, 15 * 60 * 1000);
  const passwordHash = await hashPassword(password);
  try {
    await prisma.userAllowlist.create({ data: { displayName, email, passwordHash, status: "PENDING" } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }
  return NextResponse.json({ ok: true, message: "Nếu thông tin hợp lệ, tài khoản sẽ được quản trị viên xem xét. Nếu đã có tài khoản, hãy đăng nhập hoặc liên hệ quản trị viên." });
}
export const POST = withApiSecurity(handlePOST);
