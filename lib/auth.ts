import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const HASH_SCHEME = "md5scrypt_v1";

function deriveMd5(password: string) {
  return crypto.createHash("md5").update(password, "utf8").digest("hex");
}

export function hashPassword(password: string) {
  const md5 = deriveMd5(password);
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(md5, salt, 64).toString("hex");
  return `${HASH_SCHEME}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;

  if (storedHash.startsWith(`${HASH_SCHEME}:`)) {
    const [, salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const derived = crypto.scryptSync(deriveMd5(password), salt, 64);
    const original = Buffer.from(hash, "hex");
    if (derived.length !== original.length) return false;
    return crypto.timingSafeEqual(derived, original);
  }

  // Backward compatibility for legacy format: salt:scrypt(password)
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt
    }
  });
  return { token, expiresAt };
}

export async function deleteSessionByToken(token: string | undefined) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { token } });
}

export async function getActiveUserBySessionToken(token: string | undefined) {
  if (!token) return null;
  const session = await prisma.session.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  });

  if (!session || session.user.status !== "ACTIVE") return null;
  return session.user;
}

export async function getApiSessionUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return getActiveUserBySessionToken(token);
}
