import crypto from "node:crypto";
import http from "node:http";
import { hashPassword, PasswordBusyError } from "./server/password.mjs";
import { URL, pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";

const port = Number(process.env.ADMIN_PORT ?? 3000);
const HASH_SCHEME = "scrypt_v2";
const ADMIN_MUTATION_LIMIT = 120;
const ADMIN_MUTATION_WINDOW_MS = 60 * 60 * 1000;
const ADMIN_BODY_LIMIT_BYTES = 10 * 1024 * 1024;
const LEDGER_TRANSACTION_OPTIONS = { isolationLevel: "ReadCommitted", maxWait: 10000, timeout: 30000 };
const BASE_SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};
const ADMIN_CSP =
  "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";

const allowedStatuses = new Set(["PENDING", "ACTIVE", "DISABLED", "REJECTED"]);
const allowedPasswordResetStatuses = new Set(["PENDING", "APPROVED", "REJECTED"]);
const allowedTransactionTypes = new Set(["INCOME", "EXPENSE", "EXCHANGE"]);
const allowedCurrencies = new Set(["DKK", "VND"]);
const allowedPaymentMethods = new Set(["CASH", "CREDIT_CARD"]);
const mutationRateStore = new Map();

function sendJson(res, status, payload) {
  res.writeHead(status, {
    ...BASE_SECURITY_HEADERS,
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, html) {
  res.writeHead(200, {
    ...BASE_SECURITY_HEADERS,
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": ADMIN_CSP.replace("script-src 'self' 'unsafe-inline'", `script-src 'sha256-${crypto.createHash("sha256").update(html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "").digest("base64")}'`)
  });
  res.end(html);
}

function getToken(req) {
  const header = req.headers["x-admin-token"];
  if (typeof header === "string" && header.trim()) return header.trim();
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return "";
}

function isAuthorized(req) {
  const expected = process.env.ADMIN_TOKEN ?? "";
  if (!expected) return false;
  const provided = getToken(req);
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let finished = false;

    const finishReject = (error) => {
      if (finished) return;
      finished = true;
      reject(error);
    };

    const finishResolve = (value) => {
      if (finished) return;
      finished = true;
      resolve(value);
    };

    req.on("data", (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;
      if (totalBytes > ADMIN_BODY_LIMIT_BYTES) {
        req.destroy();
        finishReject(new Error("Payload too large"));
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => {
      if (finished) return;
      if (!chunks.length) {
        finishResolve({});
        return;
      }
      try {
        const data = Buffer.concat(chunks).toString("utf8");
        finishResolve(JSON.parse(data));
      } catch {
        finishReject(new Error("Invalid JSON"));
      }
    });
    req.on("error", finishReject);
  });
}

function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const current = mutationRateStore.get(key);
  if (!current || now > current.resetAt) {
    if (mutationRateStore.size >= 10000) {
      for (const [storedKey, value] of mutationRateStore) if (now > value.resetAt) mutationRateStore.delete(storedKey);
      if (!mutationRateStore.has(key) && mutationRateStore.size >= 10000) return { allowed: false, retryAfterSeconds: 60 };
    }
    mutationRateStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }
  current.count += 1;
  mutationRateStore.set(key, current);
  return {
    allowed: true,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  };
}

function parseIsoDate(value, fieldName) {
  const parsed = new Date(String(value ?? ""));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} is invalid`);
  }
  return parsed;
}

function parseInteger(value, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return num;
}

function parsePositiveNumber(value, fieldName) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error(`${fieldName} must be greater than 0`);
  }
  return num;
}

function validateSystemBackup(backup) {
  if (!backup || Array.isArray(backup) || ![1, 2].includes(backup.version) ||
      backup.scope !== "system" || backup.source !== "finance-tracker-admin") {
    throw new Error("Invalid system backup format or version");
  }
  parseIsoDate(backup.exportedAt, "exportedAt");
  const collections = {
    wallets: "walletCount", users: "userCount", sessions: "sessionCount",
    passwordResetRequests: "passwordResetRequestCount", transactions: "transactionCount", exchanges: "exchangeCount"
  };
  if (backup.version === 2) collections.budgets = "budgetCount";
  for (const [key, countKey] of Object.entries(collections)) {
    if (!Array.isArray(backup[key])) throw new Error(`backup.${key} must be an array`);
    if (backup.meta && backup.meta[countKey] !== backup[key].length) {
      throw new Error(`backup.${key} count does not match metadata`);
    }
  }
}

function normalizeUsers(records) {
  if (!Array.isArray(records)) return [];
  return records.map((item, index) => {
    const row = item ?? {};
    const id = String(row.id ?? "").trim();
    const displayName = String(row.displayName ?? "").trim();
    const status = String(row.status ?? "");
    const primaryCurrency = String(row.primaryCurrency ?? "DKK");
    if (!id) throw new Error(`users[${index}].id is required`);
    if (!displayName) throw new Error(`users[${index}].displayName is required`);
    if (!allowedStatuses.has(status)) throw new Error(`users[${index}].status is invalid`);
    if (!allowedCurrencies.has(primaryCurrency)) throw new Error(`users[${index}].primaryCurrency is invalid`);
    return {
      id,
      displayName,
      email: row.email == null ? null : String(row.email),
      passwordHash: row.passwordHash == null ? null : String(row.passwordHash),
      note: row.note == null ? null : String(row.note),
      status,
      primaryCurrency,
      createdAt: parseIsoDate(row.createdAt, `users[${index}].createdAt`),
      updatedAt: parseIsoDate(row.updatedAt, `users[${index}].updatedAt`)
    };
  });
}

function normalizeWallets(records) {
  if (!Array.isArray(records)) return [];
  return records.map((item, index) => {
    const row = item ?? {};
    const id = String(row.id ?? "").trim();
    const name = String(row.name ?? "").trim();
    const currency = String(row.currency ?? "");
    if (!id) throw new Error(`wallets[${index}].id is required`);
    if (!name) throw new Error(`wallets[${index}].name is required`);
    if (!allowedCurrencies.has(currency)) throw new Error(`wallets[${index}].currency is invalid`);
    return {
      id,
      name,
      currency,
      createdAt: parseIsoDate(row.createdAt, `wallets[${index}].createdAt`),
      updatedAt: parseIsoDate(row.updatedAt, `wallets[${index}].updatedAt`)
    };
  });
}

function normalizeSessions(records) {
  if (!Array.isArray(records)) return [];
  return records.map((item, index) => {
    const row = item ?? {};
    const id = String(row.id ?? "").trim();
    const userId = String(row.userId ?? "").trim();
    const token = String(row.token ?? "").trim();
    if (!id) throw new Error(`sessions[${index}].id is required`);
    if (!userId) throw new Error(`sessions[${index}].userId is required`);
    if (!token) throw new Error(`sessions[${index}].token is required`);
    return {
      id,
      userId,
      token,
      expiresAt: parseIsoDate(row.expiresAt, `sessions[${index}].expiresAt`),
      createdAt: parseIsoDate(row.createdAt, `sessions[${index}].createdAt`)
    };
  });
}

function normalizePasswordResetRequests(records) {
  if (!Array.isArray(records)) return [];
  return records.map((item, index) => {
    const row = item ?? {};
    const id = String(row.id ?? "").trim();
    const userId = String(row.userId ?? "").trim();
    const newPasswordHash = String(row.newPasswordHash ?? "").trim();
    const status = String(row.status ?? "");
    if (!id) throw new Error(`passwordResetRequests[${index}].id is required`);
    if (!userId) throw new Error(`passwordResetRequests[${index}].userId is required`);
    if (!newPasswordHash) throw new Error(`passwordResetRequests[${index}].newPasswordHash is required`);
    if (!allowedPasswordResetStatuses.has(status)) {
      throw new Error(`passwordResetRequests[${index}].status is invalid`);
    }
    return {
      id,
      userId,
      newPasswordHash,
      status,
      createdAt: parseIsoDate(row.createdAt, `passwordResetRequests[${index}].createdAt`),
      reviewedAt: row.reviewedAt == null ? null : parseIsoDate(row.reviewedAt, `passwordResetRequests[${index}].reviewedAt`)
    };
  });
}

function normalizeSystemTransactions(records) {
  if (!Array.isArray(records)) return [];
  return records.map((item, index) => {
    const row = item ?? {};
    const id = String(row.id ?? "").trim();
    const type = String(row.type ?? "");
    const walletId = String(row.walletId ?? "").trim();
    const currency = String(row.currency ?? "");
    const userIdRaw = row.userId == null ? null : String(row.userId).trim();
    const paymentMethodRaw = row.paymentMethod == null ? null : String(row.paymentMethod);
    if (!id) throw new Error(`transactions[${index}].id is required`);
    if (!allowedTransactionTypes.has(type)) throw new Error(`transactions[${index}].type is invalid`);
    if (!walletId) throw new Error(`transactions[${index}].walletId is required`);
    if (!allowedCurrencies.has(currency)) throw new Error(`transactions[${index}].currency is invalid`);
    if (paymentMethodRaw !== null && !allowedPaymentMethods.has(paymentMethodRaw)) {
      throw new Error(`transactions[${index}].paymentMethod is invalid`);
    }
    const paymentMethod = paymentMethodRaw ?? (type === "EXPENSE" ? "CASH" : null);
    return {
      id,
      userId: userIdRaw || null,
      type,
      walletId,
      amount: parseInteger(row.amount, `transactions[${index}].amount`),
      currency,
      paymentMethod,
      category: row.category == null ? null : String(row.category),
      note: row.note == null ? null : String(row.note),
      createdAt: parseIsoDate(row.createdAt, `transactions[${index}].createdAt`)
    };
  });
}

function normalizeSystemExchanges(records) {
  if (!Array.isArray(records)) return [];
  return records.map((item, index) => {
    const row = item ?? {};
    const id = String(row.id ?? "").trim();
    const fromWalletId = String(row.fromWalletId ?? "").trim();
    const toWalletId = String(row.toWalletId ?? "").trim();
    const userIdRaw = row.userId == null ? null : String(row.userId).trim();
    const feeCurrencyRaw = row.feeCurrency == null ? null : String(row.feeCurrency);
    if (!id) throw new Error(`exchanges[${index}].id is required`);
    if (!fromWalletId) throw new Error(`exchanges[${index}].fromWalletId is required`);
    if (!toWalletId) throw new Error(`exchanges[${index}].toWalletId is required`);
    if (feeCurrencyRaw !== null && !allowedCurrencies.has(feeCurrencyRaw)) {
      throw new Error(`exchanges[${index}].feeCurrency is invalid`);
    }
    return {
      id,
      userId: userIdRaw || null,
      fromWalletId,
      toWalletId,
      fromAmountDkk: parseInteger(row.fromAmountDkk, `exchanges[${index}].fromAmountDkk`),
      toAmountVnd: parseInteger(row.toAmountVnd, `exchanges[${index}].toAmountVnd`),
      effectiveRate: String(parsePositiveNumber(row.effectiveRate, `exchanges[${index}].effectiveRate`)),
      feeAmount: row.feeAmount == null ? null : parseInteger(row.feeAmount, `exchanges[${index}].feeAmount`),
      feeCurrency: feeCurrencyRaw,
      provider: row.provider == null ? null : String(row.provider),
      createdAt: parseIsoDate(row.createdAt, `exchanges[${index}].createdAt`)
    };
  });
}

function normalizeBudgets(records) {
  const ids = new Set();
  const identities = new Set();
  return records.map((row, index) => {
    const field = `budgets[${index}]`;
    if (!row || typeof row.id !== "string" || !row.id.trim() || typeof row.userId !== "string" || !row.userId.trim()) throw new Error(`${field} id/userId is required`);
    if (typeof row.month !== "string" || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(row.month)) throw new Error(`${field}.month is invalid`);
    if (!allowedCurrencies.has(row.currency)) throw new Error(`${field}.currency is invalid`);
    let scopeKey;
    if (["TOTAL", "UNCATEGORIZED"].includes(row.scope) && row.category === null) scopeKey = row.scope;
    else if (row.scope === "CATEGORY" && typeof row.category === "string" && row.category.trim() && row.category.length <= 200) scopeKey = `CATEGORY:${row.category}`;
    else throw new Error(`${field}.scope/category is invalid`);
    if (scopeKey !== row.scopeKey || !Number.isInteger(row.limitMinor) || row.limitMinor <= 0 || row.limitMinor > 2147483647) throw new Error(`${field}.scopeKey/limitMinor is invalid`);
    const identity = JSON.stringify([row.userId, row.month, row.currency, scopeKey]);
    if (ids.has(row.id) || identities.has(identity)) throw new Error(`${field} is duplicated`);
    ids.add(row.id); identities.add(identity);
    return { id: row.id, userId: row.userId, month: row.month, currency: row.currency, scope: row.scope,
      category: row.category, scopeKey, limitMinor: row.limitMinor,
      createdAt: parseIsoDate(row.createdAt, `${field}.createdAt`), updatedAt: parseIsoDate(row.updatedAt, `${field}.updatedAt`) };
  });
}

function appHtml() {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admin - Finance Tracker</title>
  <style>
    :root {
      --bg: #f4f6fb;
      --card: #ffffff;
      --ink: #101828;
      --muted: #667085;
      --line: #e4e7ec;
      --brand: #0f172a;
      --pending: #f59e0b;
      --active: #16a34a;
      --disabled: #64748b;
      --rejected: #ef4444;
    }
    * { box-sizing: border-box; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 0; background: var(--bg); color: var(--ink); }
    .wrap { max-width: 1100px; margin: 28px auto; padding: 0 16px 24px; }
    .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 16px; box-shadow: 0 8px 28px rgba(16, 24, 40, 0.04); }
    .stack { display: grid; gap: 12px; }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .title { margin: 0; font-size: 20px; }
    .muted { color: var(--muted); font-size: 13px; }
    .chip { border-radius: 999px; border: 1px solid var(--line); padding: 6px 10px; font-size: 12px; color: var(--muted); background: #fff; }
    .grid-5 { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
    .stat { border: 1px solid var(--line); border-radius: 12px; padding: 12px; background: #fff; }
    .stat .k { font-size: 12px; color: var(--muted); }
    .stat .v { font-size: 22px; font-weight: 700; margin-top: 4px; }
    .controls { display: grid; grid-template-columns: 1.2fr 0.8fr auto auto auto; gap: 8px; align-items: center; }
    .btn { border: 0; border-radius: 10px; padding: 10px 12px; cursor: pointer; font-weight: 600; }
    .btn-primary { background: var(--brand); color: white; }
    .btn-ghost { background: #fff; border: 1px solid var(--line); color: var(--ink); }
    .btn-warn { background: #fff7ed; border: 1px solid #fdba74; color: #9a3412; }
    .btn-danger { background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; }
    .btn-ok { background: #f0fdf4; border: 1px solid #86efac; color: #166534; }
    input, select, textarea { width: 100%; border-radius: 10px; border: 1px solid var(--line); padding: 10px; font: inherit; background: #fff; }
    textarea { min-height: 70px; resize: vertical; }
    .list { display: grid; gap: 10px; }
    .user { border: 1px solid var(--line); border-radius: 14px; padding: 14px; background: #fff; }
    .user-top { display: flex; justify-content: space-between; gap: 10px; }
    .user-name { margin: 0; font-size: 16px; }
    .status { border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; border: 1px solid transparent; }
    .status.PENDING { background: #fffbeb; border-color: #fcd34d; color: #92400e; }
    .status.ACTIVE { background: #f0fdf4; border-color: #86efac; color: #166534; }
    .status.DISABLED { background: #f8fafc; border-color: #cbd5e1; color: #334155; }
    .status.REJECTED { background: #fef2f2; border-color: #fca5a5; color: #991b1b; }
    .meta { margin-top: 8px; display: grid; gap: 4px; font-size: 13px; color: var(--muted); }
    .actions { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; }
    .edit { margin-top: 10px; border-top: 1px dashed var(--line); padding-top: 10px; display: none; gap: 8px; }
    .edit.open { display: grid; }
    .msg { font-size: 13px; color: var(--muted); }
    .empty { text-align: center; color: var(--muted); padding: 18px; border: 1px dashed var(--line); border-radius: 12px; }
    @media (max-width: 920px) {
      .grid-5 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .controls { grid-template-columns: 1fr; }
      .actions { flex-direction: column; }
      .actions .btn { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="wrap stack">
    <section class="card stack">
      <div class="header">
        <div>
          <h1 class="title">Finance Tracker Admin</h1>
          <div class="muted">Quản lý tài khoản đăng ký, duyệt quyền sử dụng, backup/restore toàn hệ thống, clear user data, duyệt quên mật khẩu và thu hồi session.</div>
        </div>
        <span class="chip">Local Admin (6070)</span>
      </div>
      <div class="controls">
        <input id="token" type="password" placeholder="Nhập ADMIN_TOKEN" />
        <button class="btn btn-primary" data-action="loadUsers">Tải dữ liệu</button>
        <input id="search" placeholder="Tìm theo tên/email..." data-filter="input" />
        <select id="statusFilter" data-filter="change">
          <option value="ALL">Tất cả trạng thái</option>
          <option value="PENDING">PENDING</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="DISABLED">DISABLED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <button class="btn btn-ghost" data-action="approveAllPending">Duyệt tất cả PENDING</button>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" data-action="downloadSystemBackup">Backup toàn hệ thống (JSON)</button>
        <button class="btn btn-danger" data-action="openSystemRestorePicker">Restore toàn hệ thống từ file</button>
        <button class="btn btn-warn" data-action="clearSystemUserData">Clear user data (giữ session)</button>
        <input id="systemRestoreFile" type="file" accept="application/json" style="display:none" />
      </div>
      <div id="msg" class="msg"></div>
    </section>

    <section class="card">
      <div id="stats" class="grid-5"></div>
    </section>

    <section class="card">
      <div id="users" class="list"></div>
    </section>
  </div>

  <script>
    let allUsers = [];

    async function api(path, method = 'GET', body) {
      const token = document.getElementById('token').value.trim();
      const res = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    }

    function setMsg(text) {
      document.getElementById('msg').textContent = text;
    }

    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function formatDate(value) {
      try {
        return new Intl.DateTimeFormat('vi-VN', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit'
        }).format(new Date(value));
      } catch {
        return value || '-';
      }
    }

    function getFilteredUsers() {
      const search = document.getElementById('search').value.trim().toLowerCase();
      const statusFilter = document.getElementById('statusFilter').value;
      return allUsers.filter((u) => {
        const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;
        const hay = ((u.displayName || '') + ' ' + (u.email || '')).toLowerCase();
        const matchSearch = !search || hay.includes(search);
        return matchStatus && matchSearch;
      });
    }

    function renderStats() {
      const total = allUsers.length;
      const pending = allUsers.filter((u) => u.status === 'PENDING').length;
      const active = allUsers.filter((u) => u.status === 'ACTIVE').length;
      const disabled = allUsers.filter((u) => u.status === 'DISABLED').length;
      const rejected = allUsers.filter((u) => u.status === 'REJECTED').length;

      const stats = document.getElementById('stats');
      stats.innerHTML = [
        ['Tổng tài khoản', total],
        ['Chờ duyệt', pending],
        ['Đang hoạt động', active],
        ['Đã khóa', disabled],
        ['Đã từ chối', rejected]
      ].map(([k, v]) => (
        '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'
      )).join('');
    }

    function renderUsers() {
      const users = getFilteredUsers();
      const root = document.getElementById('users');
      root.innerHTML = '';

      if (users.length === 0) {
        root.innerHTML = '<div class="empty">Không có user phù hợp bộ lọc hiện tại.</div>';
        return;
      }

      users.forEach((u) => {
        const statusRaw = ['PENDING', 'ACTIVE', 'DISABLED', 'REJECTED'].includes(u.status)
          ? u.status
          : 'PENDING';
        const displayName = escapeHtml(u.displayName || '(Không tên)');
        const email = escapeHtml(u.email || '(Không có email)');
        const status = escapeHtml(statusRaw);
        const note = escapeHtml(u.note || '(trống)');
        const sessions = Number(u._count?.sessions ?? 0);
        const createdAt = escapeHtml(formatDate(u.createdAt));
        const updatedAt = escapeHtml(formatDate(u.updatedAt));
        const editDisplayName = escapeHtml(u.displayName || '');
        const editNote = escapeHtml(u.note || '');

        const wrap = document.createElement('div');
        wrap.className = 'user';
        wrap.innerHTML =
          '<div class="user-top">' +
            '<div>' +
              '<h3 class="user-name">' + displayName + '</h3>' +
              '<div class="muted">' + email + '</div>' +
            '</div>' +
            '<span class="status ' + status + '">' + status + '</span>' +
          '</div>' +
          '<div class="meta">' +
            '<div>Note: ' + note + '</div>' +
            '<div>Sessions đang mở: ' + sessions + '</div>' +
            '<div>Tạo lúc: ' + createdAt + '</div>' +
            '<div>Cập nhật: ' + updatedAt + '</div>' +
          '</div>' +
          '<div class="actions">' +
            '<button class="btn btn-ok js-approve">Approve / Enable</button>' +
            '<button class="btn btn-ghost js-pending">Đưa về Pending</button>' +
            '<button class="btn btn-warn js-disable">Disable</button>' +
            '<button class="btn btn-danger js-reject">Reject</button>' +
            '<button class="btn btn-ghost js-revoke">Thu hồi session</button>' +
            '<button class="btn btn-danger js-clear-data">Xóa data user</button>' +
            '<button class="btn btn-ok js-recovery">Cấp liên kết khôi phục</button>' +
            '<button class="btn btn-ghost js-toggle-edit">Sửa thông tin</button>' +
          '</div>' +
          '<div class="edit">' +
            '<input class="js-name" value="' + editDisplayName + '" placeholder="Tên hiển thị" />' +
            '<textarea class="js-note" placeholder="Ghi chú">' + editNote + '</textarea>' +
            '<input class="js-password" type="password" placeholder="Mật khẩu mới (để trống nếu không đổi)" />' +
            '<button class="btn btn-primary js-save">Lưu thay đổi</button>' +
          '</div>';

        const editPanel = wrap.querySelector('.edit');
        const nameInput = wrap.querySelector('.js-name');
        const noteInput = wrap.querySelector('.js-note');
        const passwordInput = wrap.querySelector('.js-password');

        wrap.querySelector('.js-approve')?.addEventListener('click', () => updateUserStatus(u.id, 'ACTIVE'));
        wrap.querySelector('.js-pending')?.addEventListener('click', () => updateUserStatus(u.id, 'PENDING'));
        wrap.querySelector('.js-disable')?.addEventListener('click', () => updateUserStatus(u.id, 'DISABLED'));
        wrap.querySelector('.js-reject')?.addEventListener('click', () => updateUserStatus(u.id, 'REJECTED'));
        wrap.querySelector('.js-revoke')?.addEventListener('click', () => revokeSessions(u.id));
        wrap.querySelector('.js-clear-data')?.addEventListener('click', () => clearUserData(u));
        wrap.querySelector('.js-recovery')?.addEventListener('click', () => createRecoveryLink(u.id));

        wrap.querySelector('.js-toggle-edit')?.addEventListener('click', () => {
          editPanel?.classList.toggle('open');
        });
        wrap.querySelector('.js-save')?.addEventListener('click', async () => {
          try {
            const displayNameValue = nameInput?.value || '';
            const noteValue = noteInput?.value || '';
            const passwordValue = passwordInput?.value || '';
            await api('/api/users/' + u.id, 'PATCH', {
              displayName: displayNameValue,
              note: noteValue,
              password: passwordValue || undefined
            });
            setMsg('Đã lưu thông tin user.');
            await loadUsers();
          } catch (e) {
            setMsg(e.message);
          }
        });

        root.appendChild(wrap);
      });
    }

    async function createRecoveryLink(userId) {
      if (!confirm('Bạn đã xác minh danh tính chủ tài khoản qua kênh độc lập? Chỉ gửi liên kết cho người đã được xác minh.')) return;
      try {
        const result = await api('/api/users/' + userId + '/recovery-link', 'POST', { identityVerified: true });
        prompt('Liên kết dùng một lần, hết hạn sau 15 phút. Gửi riêng cho chủ tài khoản đã được xác minh:', result.url);
        setMsg('Đã cấp liên kết khôi phục mới. Liên kết trước đó đã bị hủy.');
      } catch (e) { setMsg(e.message); }
    }

    async function downloadSystemBackup() {
      try {
        const payload = await api('/api/system/backup');
        const exportedAt = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
        const fileName = 'backup-system-' + exportedAt + '.json';
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
        setMsg('Đã tải backup JSON toàn hệ thống.');
      } catch (e) {
        setMsg(e.message);
      }
    }

    function openSystemRestorePicker() {
      document.getElementById('systemRestoreFile')?.click();
    }

    async function handleSystemRestoreFileChange() {
      const input = document.getElementById('systemRestoreFile');
      const file = input?.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        const shouldRestore = window.confirm(
          'Restore toàn hệ thống sẽ ghi đè dữ liệu hiện tại (users/transactions/exchanges/sessions). Tiếp tục?'
        );
        if (!shouldRestore) {
          input.value = '';
          return;
        }
        const result = await api('/api/system/restore', 'POST', {
          mode: 'replace',
          backup: payload
        });
        setMsg(
          'Restore thành công: ' +
            result.userCount + ' user, ' +
            result.transactionCount + ' giao dịch, ' +
            result.exchangeCount + ' exchange.'
        );
        input.value = '';
        await loadUsers();
      } catch (e) {
        setMsg(e.message || 'Restore thất bại');
        if (input) input.value = '';
      }
    }

    function formatClearCounts(result) {
      return (
        result.transactionCount + ' giao dịch, ' +
        result.exchangeCount + ' exchange, ' +
        result.budgetCount + ' ngân sách, ' +
        result.passwordResetRequestCount + ' yêu cầu quên mật khẩu'
      );
    }

    async function clearUserData(user) {
      const label = user.email || user.displayName || user.id;
      const shouldClear = window.confirm(
        'Xóa toàn bộ data nghiệp vụ của user "' + label + '"? Transactions, exchanges, ngân sách và yêu cầu quên mật khẩu sẽ bị xóa. Tài khoản và session vẫn được giữ.'
      );
      if (!shouldClear) return;

      try {
        const result = await api('/api/users/' + user.id + '/clear-data', 'POST');
        setMsg('Đã xóa data user: ' + formatClearCounts(result) + '. Session vẫn được giữ.');
        await loadUsers();
      } catch (e) {
        setMsg(e.message);
      }
    }

    async function clearSystemUserData() {
      const shouldClear = window.confirm(
        'Xóa toàn bộ user data trên hệ thống? Transactions, exchanges, ngân sách và yêu cầu quên mật khẩu của tất cả user sẽ bị xóa. Tài khoản và session vẫn được giữ.'
      );
      if (!shouldClear) return;

      const phrase = window.prompt('Nhập CLEAR USER DATA để xác nhận.');
      if (phrase !== 'CLEAR USER DATA') {
        setMsg('Đã hủy clear user data.');
        return;
      }

      try {
        const result = await api('/api/system/clear-user-data', 'POST');
        setMsg('Đã clear user data toàn hệ thống: ' + formatClearCounts(result) + '. Session vẫn được giữ.');
        await loadUsers();
      } catch (e) {
        setMsg(e.message);
      }
    }

    async function rejectPasswordReset(requestId) {
      try {
        await api('/api/password-reset-requests/' + requestId + '/reject', 'POST');
        setMsg('Đã từ chối yêu cầu đặt lại mật khẩu.');
        await loadUsers();
      } catch (e) {
        setMsg(e.message);
      }
    }

    async function loadUsers() {
      try {
        const data = await api('/api/users');
        allUsers = (data.users || []).slice().sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        renderStats();
        renderUsers();
        setMsg('Đã tải danh sách user.');
      } catch (e) {
        setMsg(e.message);
      }
    }

    function onFilterChange() {
      renderUsers();
    }

    function toggleEdit(id) {
      const panel = document.getElementById('edit-' + id);
      if (!panel) return;
      panel.classList.toggle('open');
    }

    async function updateUserStatus(id, status) {
      try {
        await api('/api/users/' + id, 'PATCH', { status });
        setMsg('Đã cập nhật trạng thái user.');
        await loadUsers();
      } catch (e) {
        setMsg(e.message);
      }
    }

    async function saveUser(id) {
      try {
        const displayName = document.getElementById('name-' + id)?.value || '';
        const note = document.getElementById('note-' + id)?.value || '';
        const password = document.getElementById('pwd-' + id)?.value || '';
        await api('/api/users/' + id, 'PATCH', {
          displayName,
          note,
          password: password || undefined
        });
        setMsg('Đã lưu thông tin user.');
        await loadUsers();
      } catch (e) {
        setMsg(e.message);
      }
    }

    async function revokeSessions(id) {
      try {
        await api('/api/users/' + id + '/revoke-sessions', 'POST');
        setMsg('Đã thu hồi toàn bộ session của user.');
        await loadUsers();
      } catch (e) {
        setMsg(e.message);
      }
    }

    async function approveAllPending() {
      try {
        const pending = allUsers.filter((u) => u.status === 'PENDING');
        for (const u of pending) {
          await api('/api/users/' + u.id, 'PATCH', { status: 'ACTIVE' });
        }
        setMsg('Đã duyệt toàn bộ tài khoản PENDING.');
        await loadUsers();
      } catch (e) {
        setMsg(e.message);
      }
    }

    window.loadUsers = loadUsers;
    window.onFilterChange = onFilterChange;
    window.updateUserStatus = updateUserStatus;
    window.toggleEdit = toggleEdit;
    window.saveUser = saveUser;
    window.revokeSessions = revokeSessions;
    window.approveAllPending = approveAllPending;

    window.rejectPasswordReset = rejectPasswordReset;
    window.clearUserData = clearUserData;
    window.clearSystemUserData = clearSystemUserData;
    window.downloadSystemBackup = downloadSystemBackup;
    window.openSystemRestorePicker = openSystemRestorePicker;

    document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => window[button.dataset.action]()));
    document.querySelectorAll('[data-filter]').forEach(input => input.addEventListener(input.dataset.filter, onFilterChange));
    document.getElementById('systemRestoreFile')?.addEventListener('change', handleSystemRestoreFileChange);
  </script>
</body>
</html>`;
}

async function lockLedgerUsers(tx, userId) {
  if (userId !== undefined) {
    return tx.$queryRaw`SELECT "id" FROM "UserAllowlist" WHERE "id" = ${userId} FOR UPDATE`;
  }

  // Global mutations must also exclude registrations and ledger writers for
  // newly created users. Take this before any wallet or ledger locks.
  await tx.$executeRaw`LOCK TABLE "UserAllowlist" IN EXCLUSIVE MODE`;
  return tx.$queryRaw`SELECT "id" FROM "UserAllowlist" ORDER BY "id" FOR UPDATE`;
}

async function handleAdminRequest(req, res, prisma) {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname === "/") {
      sendHtml(res, appHtml());
      return;
    }

    if (req.method === "GET" && url.pathname === "/favicon.ico") {
      res.writeHead(204);
      res.end();
      return;
    }

    const remoteIp = req.socket.remoteAddress ?? "unknown";
    if (!isAuthorized(req)) {
      const rate = checkRateLimit(`unauthorized:${remoteIp}`, 30, 60000);
      if (!rate.allowed) { sendJson(res, 429, { error: "Rate limit exceeded" }); return; }
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    if (["POST", "PATCH", "DELETE", "PUT"].includes(req.method)) {
      const remoteIp = req.socket.remoteAddress ?? "unknown";
      const key = `admin:${remoteIp}:${getToken(req).slice(0, 8)}`;
      const rate = checkRateLimit(key, ADMIN_MUTATION_LIMIT, ADMIN_MUTATION_WINDOW_MS);
      if (!rate.allowed) {
        res.setHeader("Retry-After", String(rate.retryAfterSeconds));
        sendJson(res, 429, { error: "Rate limit exceeded" });
        return;
      }
    }

    if (req.method === "GET" && url.pathname === "/api/users") {
      const users = await prisma.userAllowlist.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true, displayName: true, email: true, note: true, status: true,
          primaryCurrency: true, createdAt: true, updatedAt: true,
          _count: { select: { sessions: true } }
        }
      });
      sendJson(res, 200, { users });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/system/backup") {
      const [wallets, users, sessions, passwordResetRequests, transactions, exchanges, budgets] = await prisma.$transaction(
        (tx) => Promise.all([
          tx.wallet.findMany({ orderBy: { currency: "asc" } }),
          tx.userAllowlist.findMany({ orderBy: { createdAt: "asc" } }),
          tx.session.findMany({ orderBy: { createdAt: "asc" } }),
          tx.passwordResetRequest.findMany({ orderBy: { createdAt: "asc" } }),
          tx.transaction.findMany({ orderBy: { createdAt: "asc" } }),
          tx.exchange.findMany({ orderBy: { createdAt: "asc" } }),
          tx.budget.findMany({ orderBy: { createdAt: "asc" } })
        ]),
        { isolationLevel: "RepeatableRead", timeout: 30000 }
      );

      sendJson(res, 200, {
        version: 2,
        scope: "system",
        source: "finance-tracker-admin",
        exportedAt: new Date().toISOString(),
        wallets: wallets.map((row) => ({
          id: row.id,
          name: row.name,
          currency: row.currency,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString()
        })),
        users: users.map((row) => ({
          id: row.id,
          displayName: row.displayName,
          email: row.email,
          passwordHash: row.passwordHash,
          note: row.note,
          status: row.status,
          primaryCurrency: row.primaryCurrency,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString()
        })),
        sessions: sessions.map((row) => ({
          id: row.id,
          userId: row.userId,
          token: row.token,
          expiresAt: row.expiresAt.toISOString(),
          createdAt: row.createdAt.toISOString()
        })),
        passwordResetRequests: passwordResetRequests.map((row) => ({
          id: row.id,
          userId: row.userId,
          newPasswordHash: row.newPasswordHash,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null
        })),
        transactions: transactions.map((row) => ({
          id: row.id,
          userId: row.userId,
          type: row.type,
          walletId: row.walletId,
          amount: row.amount,
          currency: row.currency,
          paymentMethod: row.paymentMethod,
          category: row.category,
          note: row.note,
          createdAt: row.createdAt.toISOString()
        })),
        exchanges: exchanges.map((row) => ({
          id: row.id,
          userId: row.userId,
          fromWalletId: row.fromWalletId,
          toWalletId: row.toWalletId,
          fromAmountDkk: row.fromAmountDkk,
          toAmountVnd: row.toAmountVnd,
          effectiveRate: row.effectiveRate.toString(),
          feeAmount: row.feeAmount,
          feeCurrency: row.feeCurrency,
          provider: row.provider,
          createdAt: row.createdAt.toISOString()
        })),
        budgets: budgets.map(row => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
        meta: {
          walletCount: wallets.length,
          userCount: users.length,
          sessionCount: sessions.length,
          passwordResetRequestCount: passwordResetRequests.length,
          transactionCount: transactions.length,
          exchangeCount: exchanges.length,
          budgetCount: budgets.length
        }
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/system/restore") {
      const body = await parseBody(req);
      const mode = body?.mode === "append" ? "append" : "replace";
      const backupPayload = body?.backup ?? body;
      let wallets, users, sessions, passwordResetRequests, transactions, exchanges, budgets;
      try {
        validateSystemBackup(backupPayload);
        wallets = normalizeWallets(backupPayload.wallets);
        users = normalizeUsers(backupPayload.users);
        sessions = normalizeSessions(backupPayload.sessions);
        passwordResetRequests = normalizePasswordResetRequests(backupPayload.passwordResetRequests);
        transactions = normalizeSystemTransactions(backupPayload.transactions);
        exchanges = normalizeSystemExchanges(backupPayload.exchanges);
        budgets = backupPayload.version === 2 ? normalizeBudgets(backupPayload.budgets) : [];
      } catch (error) {
        sendJson(res, 400, { error: error.message });
        return;
      }
      const userIds = new Set(users.map((row) => row.id));

      for (const row of budgets) {
        if (!userIds.has(row.userId)) { sendJson(res, 400, { error: `budgets userId not found: ${row.userId}` }); return; }
      }
      for (const row of sessions) {
        if (!userIds.has(row.userId)) {
          sendJson(res, 400, { error: `sessions userId not found: ${row.userId}` });
          return;
        }
      }
      for (const row of passwordResetRequests) {
        if (!userIds.has(row.userId)) {
          sendJson(res, 400, { error: `passwordResetRequests userId not found: ${row.userId}` });
          return;
        }
      }
      for (const row of transactions) {
        if (row.userId && !userIds.has(row.userId)) {
          sendJson(res, 400, { error: `transactions userId not found: ${row.userId}` });
          return;
        }
      }
      for (const row of exchanges) {
        if (row.userId && !userIds.has(row.userId)) {
          sendJson(res, 400, { error: `exchanges userId not found: ${row.userId}` });
          return;
        }
      }

      await prisma.$transaction(async (tx) => {
        await lockLedgerUsers(tx);
        const walletIdMap = new Map();
        const currencyWalletMap = new Map();
        const walletRows = wallets.length > 0 ? wallets : [
          { id: "DKK", name: "Ví DKK", currency: "DKK", createdAt: new Date(), updatedAt: new Date() },
          { id: "VND", name: "Ví VND", currency: "VND", createdAt: new Date(), updatedAt: new Date() }
        ];

        for (const row of walletRows) {
          const saved = await tx.wallet.upsert({
            where: { currency: row.currency },
            update: { name: row.name },
            create: { name: row.name, currency: row.currency }
          });
          walletIdMap.set(row.id, saved.id);
          currencyWalletMap.set(row.currency, saved.id);
        }

        if (mode === "replace") {
          await tx.budget.deleteMany({});
          await tx.session.deleteMany({});
          await tx.passwordResetRequest.deleteMany({});
          await tx.exchange.deleteMany({});
          await tx.transaction.deleteMany({});
          await tx.userAllowlist.deleteMany({});
        }

        if (users.length > 0) {
          await tx.userAllowlist.createMany({
            skipDuplicates: mode === "append",
            data: users.map((row) => ({
              id: row.id,
              displayName: row.displayName,
              email: row.email,
              passwordHash: row.passwordHash,
              note: row.note,
              status: row.status,
              primaryCurrency: row.primaryCurrency,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt
            }))
          });
        }

        if (budgets.length > 0) {
          await tx.budget.createMany({ data: budgets, skipDuplicates: mode === "append" });
        }

        if (transactions.length > 0) {
          await tx.transaction.createMany({
            skipDuplicates: mode === "append",
            data: transactions.map((row) => ({
              id: row.id,
              userId: row.userId,
              type: row.type,
              walletId: walletIdMap.get(row.walletId) ?? currencyWalletMap.get(row.currency),
              amount: row.amount,
              currency: row.currency,
              paymentMethod: row.paymentMethod,
              category: row.category,
              note: row.note,
              createdAt: row.createdAt
            }))
          });
        }

        if (exchanges.length > 0) {
          const dkkWalletId = currencyWalletMap.get("DKK");
          const vndWalletId = currencyWalletMap.get("VND");
          if (!dkkWalletId || !vndWalletId) {
            throw new Error("Wallet DKK/VND is missing in backup");
          }
          await tx.exchange.createMany({
            skipDuplicates: mode === "append",
            data: exchanges.map((row) => ({
              id: row.id,
              userId: row.userId,
              fromWalletId: walletIdMap.get(row.fromWalletId) ?? dkkWalletId,
              toWalletId: walletIdMap.get(row.toWalletId) ?? vndWalletId,
              fromAmountDkk: row.fromAmountDkk,
              toAmountVnd: row.toAmountVnd,
              effectiveRate: row.effectiveRate,
              feeAmount: row.feeAmount,
              feeCurrency: row.feeCurrency,
              provider: row.provider,
              createdAt: row.createdAt
            }))
          });
        }

        if (passwordResetRequests.length > 0) {
          await tx.passwordResetRequest.createMany({
            skipDuplicates: mode === "append",
            data: passwordResetRequests.map((row) => ({
              id: row.id,
              userId: row.userId,
              newPasswordHash: row.newPasswordHash,
              status: row.status === "PENDING" ? "REJECTED" : row.status,
              createdAt: row.createdAt,
              reviewedAt: row.reviewedAt ?? new Date()
            }))
          });
        }

        // Sessions from a backup are intentionally not restored.

      }, LEDGER_TRANSACTION_OPTIONS);

      sendJson(res, 200, {
        ok: true,
        mode,
        walletCount: wallets.length,
        userCount: users.length,
        sessionCount: 0,
        passwordResetRequestCount: passwordResetRequests.length,
        transactionCount: transactions.length,
        exchangeCount: exchanges.length,
        budgetCount: budgets.length
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/system/clear-user-data") {
      const result = await prisma.$transaction(async (tx) => {
        await lockLedgerUsers(tx);
        const passwordResetRequests = await tx.passwordResetRequest.deleteMany({});
        const exchanges = await tx.exchange.deleteMany({});
        const transactions = await tx.transaction.deleteMany({});
        const budgets = await tx.budget.deleteMany({});

        return {
          passwordResetRequestCount: passwordResetRequests.count,
          exchangeCount: exchanges.count,
          transactionCount: transactions.count,
          budgetCount: budgets.count
        };
      }, LEDGER_TRANSACTION_OPTIONS);

      sendJson(res, 200, {
        ok: true,
        scope: "system",
        preserved: ["users", "sessions", "wallets"],
        ...result
      });
      return;
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/users/")) {
      const id = url.pathname.split("/").pop();
      const body = await parseBody(req);
      if (!id) {
        sendJson(res, 400, { error: "Invalid payload" });
        return;
      }

      const data = {};
      if (typeof body.status === "string") {
        if (!allowedStatuses.has(body.status)) {
          sendJson(res, 400, { error: "Invalid status" });
          return;
        }
        data.status = body.status;
      }
      if (typeof body.displayName === "string") {
        const displayName = body.displayName.trim();
        if (!displayName || displayName.length > 100) {
          sendJson(res, 400, { error: "displayName required" });
          return;
        }
        data.displayName = displayName;
      }
      if (typeof body.note === "string") {
        if (body.note.length > 2000) { sendJson(res, 400, { error: "Note too long" }); return; }
        data.note = body.note.trim() || null;
      }
      if (typeof body.password === "string" && body.password.trim()) {
        if (body.password.length < 12 || body.password.length > 128) {
          sendJson(res, 400, { error: "Mật khẩu phải từ 12 đến 128 ký tự" });
          return;
        }
        data.passwordHash = await hashPassword(body.password);
      }

      if (Object.keys(data).length === 0) {
        sendJson(res, 400, { error: "No fields to update" });
        return;
      }

      const user = await prisma.$transaction(async tx => {
        await lockLedgerUsers(tx, id);
        const updated = await tx.userAllowlist.update({ where: { id }, data });
        if (data.passwordHash || (data.status && data.status !== "ACTIVE")) {
          await tx.session.deleteMany({ where: { userId: id } });
          await tx.passwordRecoveryToken.deleteMany({ where: { userId: id } });
          await tx.passwordResetRequest.updateMany({ where: { userId: id, status: "PENDING" }, data: { status: "REJECTED", reviewedAt: new Date() } });
        }
        const { passwordHash: ignored, ...safe } = updated;
        return safe;
      }, LEDGER_TRANSACTION_OPTIONS);

      sendJson(res, 200, { user });
      return;
    }

    if (req.method === "POST" && /^\/api\/users\/[^/]+\/recovery-link$/.test(url.pathname)) {
      const body = await parseBody(req);
      if (body?.identityVerified !== true) { sendJson(res, 400, { error: "Identity verification is required" }); return; }
      const id = url.pathname.split("/")[3];
      const origin = process.env.APP_ORIGINS?.split(",")[0]?.trim();
      if (!origin || new URL(origin).protocol !== "https:") { sendJson(res, 503, { error: "Recovery origin is not configured" }); return; }
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 15 * 60000);
      const created = await prisma.$transaction(async tx => {
        await lockLedgerUsers(tx, id);
        const user = await tx.userAllowlist.findUnique({ where: { id } });
        if (user?.status !== "ACTIVE") return false;
        await tx.passwordRecoveryToken.deleteMany({ where: { userId: id } });
        await tx.passwordRecoveryToken.create({ data: { userId: id, tokenHash: crypto.createHash("sha256").update(token).digest("hex"), expiresAt } });
        return true;
      }, LEDGER_TRANSACTION_OPTIONS);
      if (!created) { sendJson(res, 404, { error: "Active user not found" }); return; }
      sendJson(res, 200, { url: `${new URL(origin).origin}/reset-password#token=${token}`, expiresAt: expiresAt.toISOString() });
      return;
    }

    if (req.method === "POST" && url.pathname.endsWith("/revoke-sessions")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const id = parts[2];
      if (!id) {
        sendJson(res, 400, { error: "Invalid payload" });
        return;
      }

      const result = await prisma.session.deleteMany({ where: { userId: id } });
      sendJson(res, 200, { revoked: result.count });
      return;
    }

    if (req.method === "POST" && url.pathname.endsWith("/clear-data")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const id = parts[2];
      if (!id || parts[0] !== "api" || parts[1] !== "users" || parts[3] !== "clear-data") {
        sendJson(res, 400, { error: "Invalid payload" });
        return;
      }

      const user = await prisma.userAllowlist.findUnique({
        where: { id },
        select: { id: true }
      });
      if (!user) {
        sendJson(res, 404, { error: "User không tồn tại" });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        await lockLedgerUsers(tx, id);
        const passwordResetRequests = await tx.passwordResetRequest.deleteMany({ where: { userId: id } });
        const exchanges = await tx.exchange.deleteMany({ where: { userId: id } });
        const transactions = await tx.transaction.deleteMany({ where: { userId: id } });
        const budgets = await tx.budget.deleteMany({ where: { userId: id } });

        return {
          passwordResetRequestCount: passwordResetRequests.count,
          exchangeCount: exchanges.count,
          transactionCount: transactions.count,
          budgetCount: budgets.count
        };
      }, LEDGER_TRANSACTION_OPTIONS);

      sendJson(res, 200, {
        ok: true,
        scope: "user",
        userId: id,
        preserved: ["user", "sessions"],
        ...result
      });
      return;
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/password-reset-requests/")) {
      sendJson(res, 410, { error: "Legacy password approvals are disabled. Verify identity and issue a recovery link." });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin request failed", error instanceof Error ? error.name : "UnknownError");
    sendJson(res, error instanceof PasswordBusyError ? 503 : 400, { error: "Không thể xử lý yêu cầu. Kiểm tra dữ liệu và thử lại." });
  }
}

export function createAdminServer(prisma = new PrismaClient()) {
  return http.createServer((req, res) => handleAdminRequest(req, res, prisma));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createAdminServer().listen(port, "0.0.0.0", () => {
    console.log(`Admin app listening on :${port}`);
  });
}
