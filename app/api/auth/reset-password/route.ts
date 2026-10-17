import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { withApiSecurity, readJsonBody, requireClientRateLimit } from "@/lib/http-security";
async function handlePOST(req: NextRequest) {
  requireClientRateLimit(req, "recovery", 20, 15 * 60000);
  const body = await readJsonBody(req);
  if (typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token) || typeof body.newPassword !== "string" || body.newPassword.length < 12)
    return NextResponse.json({ error: "Liên kết không hợp lệ hoặc mật khẩu chưa đủ 12 ký tự." }, { status: 400 });
  const tokenHash = crypto.createHash("sha256").update(body.token).digest("hex");
  const existing = await prisma.passwordRecoveryToken.findUnique({ where: { tokenHash } });
  if (!existing || existing.expiresAt <= new Date()) return NextResponse.json({ error: "Liên kết không hợp lệ hoặc đã hết hạn." }, { status: 400 });
  const passwordHash = await hashPassword(body.newPassword);
  const changed = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "UserAllowlist" WHERE "id" = ${existing.userId} FOR UPDATE`;
    const token = await tx.passwordRecoveryToken.findUnique({ where: { tokenHash } });
    const user = await tx.userAllowlist.findUnique({ where: { id: existing.userId } });
    if (!token || token.expiresAt <= new Date() || user?.status !== "ACTIVE") return false;
    await tx.userAllowlist.update({ where: { id: user.id }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.passwordRecoveryToken.deleteMany({ where: { userId: user.id } });
    await tx.passwordResetRequest.updateMany({ where: { userId: user.id, status: "PENDING" }, data: { status: "REJECTED", reviewedAt: new Date() } });
    return true;
  });
  return changed ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Liên kết không hợp lệ hoặc đã hết hạn." }, { status: 400 });
}
export const POST = withApiSecurity(handlePOST);
