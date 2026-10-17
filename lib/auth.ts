import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserRateLimit } from "@/lib/http-security";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const SESSION_TOKEN_SCHEME = "sha256_v1";
export { hashPassword, verifyPassword } from "../server/password.mjs";
export function isCurrentPasswordHash(storedHash: string | null | undefined) {
  return Boolean(storedHash?.startsWith("scrypt_v2:"));
}
function hashSessionToken(token: string) {
  return `${SESSION_TOKEN_SCHEME}:${crypto.createHash("sha256").update(token, "utf8").digest("hex")}`;
}
function isRawSessionToken(token: string | undefined): token is string {
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
}

export async function createSession(userId: string, expectedPasswordHash: string, upgradedPasswordHash?: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  return prisma.$transaction(async (tx) => {
    // Password changes/recovery use this same lock, excluding a stale concurrent login.
    await tx.$queryRaw`SELECT "id" FROM "UserAllowlist" WHERE "id" = ${userId} FOR UPDATE`;
    const user = await tx.userAllowlist.findUnique({ where: { id: userId } });
    if (!user || user.status !== "ACTIVE" || user.passwordHash !== expectedPasswordHash) return null;
    if (upgradedPasswordHash) await tx.userAllowlist.update({ where: { id: userId }, data: { passwordHash: upgradedPasswordHash } });
    await tx.session.create({ data: { userId, token: hashSessionToken(token), expiresAt } });
    return { token, expiresAt };
  });
}

export async function deleteSessionByToken(token: string | undefined) {
  if (!isRawSessionToken(token)) return;
  const tokenHash = hashSessionToken(token);
  await prisma.session.deleteMany({
    where: {
      token: tokenHash
    }
  });
}

export async function getActiveUserBySessionToken(token: string | undefined) {
  if (!isRawSessionToken(token)) return null;
  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findFirst({
    where: {
      token: tokenHash,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  });

  if (!session || session.user.status !== "ACTIVE") return null;

  return session.user;
}

export async function getApiSessionUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getActiveUserBySessionToken(token);
  if (user) requireUserRateLimit(user.id, req.method === "GET" ? "read" : "write", req.method === "GET" ? 180 : 60);
  return user;
}
