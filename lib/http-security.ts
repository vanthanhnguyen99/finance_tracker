import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRequestClientIp } from "./rate-limit";
import { PasswordBusyError } from "../server/password.mjs";

export const MAX_API_BODY_BYTES = 1024 * 1024;
export const PRIVATE_CACHE_CONTROL = "private, no-store, max-age=0";
export class HttpInputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const bodies = new WeakMap<Request, Record<string, unknown>>();

export function allowedOrigins() {
  const configured = process.env.APP_ORIGINS;
  if (configured) return new Set(configured.split(",").map(value => new URL(value.trim()).origin));
  return new Set(process.env.NODE_ENV === "production" ? [] : ["http://localhost", "http://127.0.0.1:3107"]);
}

export function isSameOriginMutation(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || req.headers.get("sec-fetch-site") === "cross-site") return false;
  try { return allowedOrigins().has(new URL(origin).origin) && new URL(origin).origin === origin; }
  catch { return false; }
}

export async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  const cached = bodies.get(req);
  if (cached) return cached;
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type") ?? ""))
    throw new HttpInputError("Content-Type phải là application/json", 415);
  const reader = req.body?.getReader();
  if (!reader) throw new HttpInputError("Thiếu dữ liệu JSON");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_API_BODY_BYTES) {
        void reader.cancel().catch(() => undefined);
        throw new HttpInputError("Payload too large", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let body: unknown;
  try {
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch { throw new HttpInputError("Dữ liệu JSON không hợp lệ"); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpInputError("Dữ liệu không hợp lệ");
  const record = body as Record<string, unknown>;
  if (Object.keys(record).length > 32) throw new HttpInputError("Quá nhiều trường dữ liệu");
  // Legacy login passwords are bounded by the payload cap; creation routes enforce 128 characters.
  const limits: Record<string, number> = { email: 254, displayName: 100, password: MAX_API_BODY_BYTES, newPassword: 128, token: 128, note: 2000, category: 200, provider: 200 };
  for (const [key, value] of Object.entries(record)) {
    if (value != null && typeof value === "object") throw new HttpInputError("Dữ liệu không hợp lệ");
    if (key in limits && value != null && typeof value !== "string") throw new HttpInputError(`Trường ${key} không hợp lệ`);
    if (typeof value === "string" && value.length > (limits[key] ?? 4096)) throw new HttpInputError(`Trường ${key} quá dài`);
  }
  bodies.set(req, record);
  return record;
}

/** Handler-level checks still apply if a framework middleware route is bypassed. */
export function withApiSecurity<Args extends unknown[]>(handler: (req: NextRequest, ...args: Args) => Promise<Response>) {
  return async (req: NextRequest, ...args: Args): Promise<Response> => {
    let response: Response;
    try {
      if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method) && !isSameOriginMutation(req))
        throw new HttpInputError("Invalid origin", 403);
      if (process.env.NODE_ENV === "production") {
        if (process.env.TRUST_PROXY === "true" && getRequestClientIp(req.headers) === "unknown")
          throw new HttpInputError("Invalid client address", 400);
        requireClientRateLimit(req, "api-client", 240, 60000);
      }
      const declared = req.headers.get("content-length");
      if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_API_BODY_BYTES))
        throw new HttpInputError("Payload too large", 413);
      response = await handler(req, ...args);
    } catch (error) {
      if (error instanceof HttpInputError) response = NextResponse.json({ error: error.message }, { status: error.status });
      else if (error instanceof PasswordBusyError) response = NextResponse.json({ error: "Hệ thống bận, vui lòng thử lại." }, { status: 503, headers: { "Retry-After": "2" } });
      else { console.error("API request failed", error instanceof Error ? error.name : "UnknownError"); response = NextResponse.json({ error: "Không thể xử lý yêu cầu." }, { status: 500 }); }
    }
    response.headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
    response.headers.set("CDN-Cache-Control", "no-store");
    response.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
    return response;
  };
}

export function requireUserRateLimit(userId: string, action: string, limit: number, windowMs = 60000) {
  const rate = checkRateLimit(`user:${userId}:${action}`, limit, windowMs);
  if (!rate.allowed) throw new HttpInputError("Quá nhiều yêu cầu, vui lòng thử lại sau.", 429);
}
export function requireClientRateLimit(req: Request, action: string, limit: number, windowMs: number) {
  const rate = checkRateLimit(`${action}:${getRequestClientIp(req.headers)}`, limit, windowMs);
  if (!rate.allowed) throw new HttpInputError("Quá nhiều yêu cầu, vui lòng thử lại sau.", 429);
}
