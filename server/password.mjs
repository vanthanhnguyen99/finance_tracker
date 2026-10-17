import crypto from "node:crypto";

let inFlight = 0;
const MAX_CONCURRENT_DERIVATIONS = 4;
export class PasswordBusyError extends Error {}

async function derive(password, salt) {
  if (inFlight >= MAX_CONCURRENT_DERIVATIONS) throw new PasswordBusyError("Authentication busy");
  inFlight++;
  try {
    return await new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (error, result) => error ? reject(error) : resolve(result));
    });
  } finally {
    inFlight--;
  }
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `scrypt_v2:${salt}:${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  let salt, hash, input = password;
  if (storedHash.startsWith("scrypt_v2:") || storedHash.startsWith("md5scrypt_v1:")) {
    const [scheme, s, h] = storedHash.split(":");
    salt = s; hash = h;
    if (scheme === "md5scrypt_v1") input = crypto.createHash("md5").update(password, "utf8").digest("hex");
  } else {
    [salt, hash] = storedHash.split(":");
  }
  if (!salt || !/^[a-f0-9]{128}$/i.test(hash ?? "") || salt.length > 128) return false;
  const derived = await derive(input, salt);
  return crypto.timingSafeEqual(derived, Buffer.from(hash, "hex"));
}
