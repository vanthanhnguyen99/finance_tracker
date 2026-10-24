import { isIP } from "node:net";
type Bucket = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as unknown as {
  rateLimitStore?: Map<string, Bucket>;
};

const store = globalForRateLimit.rateLimitStore ?? new Map<string, Bucket>();
const MAX_BUCKETS = 10000;

if (!globalForRateLimit.rateLimitStore) {
  globalForRateLimit.rateLimitStore = store;
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || now > current.resetAt) {
    if (store.size >= MAX_BUCKETS) {
      for (const [storedKey, bucket] of store) {
        if (now > bucket.resetAt) store.delete(storedKey);
      }
      // Fail closed instead of evicting active limits under a flood of new keys.
      if (!store.has(key) && store.size >= MAX_BUCKETS) {
        return { allowed: false, remaining: 0, retryAfterSeconds: 60 };
      }
    }
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterSeconds: Math.ceil(windowMs / 1000)
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  current.count += 1;
  store.set(key, current);
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  };
}

export function getClientIp(rawForwardedFor: string | null, fallback: string) {
  // Ingress must overwrite X-Real-IP and be the only path to the private app.
  if (process.env.TRUST_PROXY !== "true") return fallback;
  const value = rawForwardedFor?.trim();
  return value && isIP(value) ? value : fallback;
}
export function getRequestClientIp(headers: Headers) {
  return getClientIp(headers.get("x-real-ip"), "unknown");
}
