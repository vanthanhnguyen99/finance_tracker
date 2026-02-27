import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const HASH_SCHEME = "scrypt_v2";
const LEGACY_MD5_HASH_SCHEME = "md5scrypt_v1";
const SESSION_TOKEN_SCHEME = "sha256_v1";

function deriveMd5(password: string) {
  return crypto.createHash("md5").update(password, "utf8").digest("hex");
}

function hashSessionToken(token: string) {
  const digest = crypto.createHash("sha256").update(token, "utf8").digest("hex");
  return `${SESSION_TOKEN_SCHEME}:${digest}`;
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${HASH_SCHEME}:${salt}:${hash}`;
}

export function isCurrentPasswordHash(storedHash: string | null | undefined) {
  return Boolean(storedHash?.startsWith(`${HASH_SCHEME}:`));
}

export function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;

  if (storedHash.startsWith(`${HASH_SCHEME}:`)) {
    const [, salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, 64);
    const original = Buffer.from(hash, "hex");
    if (derived.length !== original.length) return false;
    return crypto.timingSafeEqual(derived, original);
  }

  if (storedHash.startsWith(`${LEGACY_MD5_HASH_SCHEME}:`)) {
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
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.session.create({
    data: {
      userId,
      token: tokenHash,
      expiresAt
    }
  });
  return { token, expiresAt };
}

export async function deleteSessionByToken(token: string | undefined) {
  if (!token) return;
  const tokenHash = hashSessionToken(token);
  await prisma.session.deleteMany({
    where: {
      token: { in: [token, tokenHash] }
    }
  });
}

export async function getActiveUserBySessionToken(token: string | undefined) {
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findFirst({
    where: {
      token: { in: [tokenHash, token] },
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  });

  if (!session || session.user.status !== "ACTIVE") return null;

  if (session.token === token) {
    await prisma.session
      .updateMany({
        where: { id: session.id, token },
        data: { token: tokenHash }
      })
      .catch(() => undefined);
  }

  return session.user;
}

export async function getApiSessionUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return getActiveUserBySessionToken(token);
}
