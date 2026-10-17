const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { createLoader } = require('./load-ts.cjs');
const { NextRequest } = require('next/server');
process.env.APP_ORIGINS = 'http://localhost';
const request = (path, data, headers = {}) => new NextRequest(`http://localhost${path}`, {
  method: 'POST', headers: { Origin: 'http://localhost', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data)
});

test('stored session digests and malformed cookies cannot authenticate or revoke sessions', async () => {
  const raw = crypto.randomBytes(32).toString('hex');
  const digest = `sha256_v1:${crypto.createHash('sha256').update(raw).digest('hex')}`;
  let reads = 0, deleted;
  const auth = createLoader({ '@/lib/db': { prisma: { session: {
    findFirst: async ({ where }) => { reads++; assert.equal(where.token, digest); return { user: { id: 'u', status: 'ACTIVE' } }; },
    deleteMany: async ({ where }) => { deleted = where.token; }
  } } } })('lib/auth.ts');
  for (const token of [digest, 'legacy-token', 'a'.repeat(1000), undefined]) {
    assert.equal(await auth.getActiveUserBySessionToken(token), null);
    await auth.deleteSessionByToken(token);
  }
  assert.equal(reads, 0); assert.equal(deleted, undefined);
  assert.equal((await auth.getActiveUserBySessionToken(raw)).id, 'u');
  await auth.deleteSessionByToken(raw); assert.equal(deleted, digest);
});

test('password derivation remains compatible without synchronous event-loop hashing', async () => {
  const { hashPassword, verifyPassword } = await import('../server/password.mjs');
  const hash = await hashPassword('a-long-test-password');
  assert.equal(await verifyPassword('a-long-test-password', hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);
  const salt = 'synthetic-salt';
  const legacy = `${salt}:${crypto.scryptSync('legacy', salt, 64).toString('hex')}`;
  assert.equal(await verifyPassword('legacy', legacy), true);
});

test('Origin checks ignore forged proxy hosts and fail closed without Origin', async () => {
  const { withApiSecurity } = createLoader()('lib/http-security.ts');
  let called = 0;
  const post = withApiSecurity(async () => { called++; return new Response('{}'); });
  for (const headers of [{ Origin: 'https://evil.example', 'X-Forwarded-Host': 'evil.example' }, { Origin: 'https://localhost' }, { Origin: 'null' }, { Origin: '' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
    const response = await post(request('/api/test', {}, headers));
    assert.equal(response.status, 403); assert.match(response.headers.get('Cache-Control'), /no-store/);
  }
  assert.equal(called, 0);
  assert.equal((await post(request('/api/test', {}))).status, 200);
});

test('JSON reading enforces actual streamed bytes and validates malformed bodies', async () => {
  const { readJsonBody, withApiSecurity } = createLoader()('lib/http-security.ts');
  let called = false;
  const post = withApiSecurity(async req => { await readJsonBody(req); called = true; return new Response('{}'); });
  for (const body of ['null', '[]', '{bad', JSON.stringify({ note: 'x'.repeat(2001) }), JSON.stringify({ email: 123 })]) {
    const req = new NextRequest('http://localhost/api/test', { method: 'POST', headers: { Origin: 'http://localhost', 'Content-Type': 'application/json' }, body });
    assert.equal((await post(req)).status, 400);
  }
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(JSON.stringify({ note: 'x'.repeat(1024 * 1024) }))); controller.close(); } });
  const req = new NextRequest('http://localhost/api/test', { method: 'POST', headers: { Origin: 'http://localhost', 'Content-Type': 'application/json' }, body: stream, duplex: 'half' });
  assert.equal(req.headers.get('content-length'), null);
  assert.equal((await post(req)).status, 413); assert.equal(called, false);
});

test('trusted ingress IPs have separate buckets and reject IP chains or malformed IPs', () => {
  const previous = process.env.TRUST_PROXY;
  try {
    const rate = createLoader()('lib/rate-limit.ts');
    process.env.TRUST_PROXY = 'true';
    assert.equal(rate.getRequestClientIp(new Headers({ 'X-Real-IP': '198.51.100.1', 'X-Forwarded-For': 'forged' })), '198.51.100.1');
    assert.equal(rate.getClientIp('198.51.100.1, 203.0.113.1', 'unknown'), 'unknown');
    assert.equal(rate.getClientIp('bad-value', 'unknown'), 'unknown');
    assert.equal(rate.checkRateLimit('test:ip:198.51.100.1', 1, 60000).allowed, true);
    assert.equal(rate.checkRateLimit('test:ip:198.51.100.1', 1, 60000).allowed, false);
    assert.equal(rate.checkRateLimit('test:ip:203.0.113.1', 1, 60000).allowed, true);
    delete process.env.TRUST_PROXY; assert.equal(rate.getClientIp('198.51.100.1', 'unknown'), 'unknown');
  } finally { if (previous === undefined) delete process.env.TRUST_PROXY; else process.env.TRUST_PROXY = previous; }
});

test('anonymous legacy reset cannot store or replace any password request', async () => {
  const { POST } = createLoader({ '@/lib/db': { prisma: new Proxy({}, { get() { throw new Error('Unexpected database access'); } }) } })('app/api/auth/password-reset-request/route.ts');
  const response = await POST(request('/api/auth/password-reset-request', { email: 'victim@example.test', newPassword: 'attacker-password' }));
  assert.equal(response.status, 410); assert.match(response.headers.get('Cache-Control'), /no-store/);
});

async function startAdmin(t, db) {
  process.env.ADMIN_TOKEN = 'security-test-only-token';
  const { createAdminServer } = await import('../admin-server.mjs');
  const server = createAdminServer(db);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return `http://127.0.0.1:${server.address().port}`;
}
test('admin password changes revoke sessions and recovery links atomically without leaking hashes', async t => {
  let locked = false, revoked = false, recoveryRevoked = false, transaction = false;
  const db = { $transaction: async fn => {
    transaction = true;
    try { return await fn({
      $queryRaw: async () => { locked = true; },
      userAllowlist: { update: async ({ data }) => { assert(locked); return { id: 'u', ...data }; } },
      session: { deleteMany: async () => { assert(transaction); revoked = true; } },
      passwordRecoveryToken: { deleteMany: async () => { recoveryRevoked = true; } },
      passwordResetRequest: { updateMany: async () => {} }
    }); } finally { transaction = false; }
  } };
  const origin = await startAdmin(t, db);
  const response = await fetch(`${origin}/api/users/u`, { method: 'PATCH', headers: { 'X-Admin-Token': process.env.ADMIN_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'new-secure-test-password', status: 'ACTIVE' }) });
  assert.equal(response.status, 200); assert(revoked); assert(recoveryRevoked);
  assert.equal(Object.hasOwn((await response.json()).user, 'passwordHash'), false);
  const legacy = await fetch(`${origin}/api/password-reset-requests/old/approve`, { method: 'POST', headers: { 'X-Admin-Token': process.env.ADMIN_TOKEN } });
  assert.equal(legacy.status, 410);
});

test('admin scripts remain valid with a hash-based CSP and no inline event handlers', async t => {
  const origin = await startAdmin(t, {});
  const response = await fetch(origin); const html = await response.text();
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new vm.Script(script);
  assert(!/\son(?:click|input|change)=/.test(html));
  assert(response.headers.get('content-security-policy').includes(`'sha256-${crypto.createHash('sha256').update(script).digest('base64')}'`));
});

test('production login cookies always have Secure and the host prefix', async () => {
  const old = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const { POST } = createLoader({
      '@/lib/db': { prisma: { userAllowlist: { findFirst: async () => ({ id: 'u', status: 'ACTIVE', passwordHash: 'test-hash' }) } } },
      '@/lib/auth': { verifyPassword: async () => true, isCurrentPasswordHash: () => true, createSession: async () => ({ token: 'a'.repeat(64), expiresAt: new Date(Date.now() + 60000) }) }
    })('app/api/auth/login/route.ts');
    const response = await POST(request('/api/auth/login', { email: 'secure@example.test', password: 'test-password' }, { 'X-Forwarded-Proto': 'http' }));
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /__Host-session=/);
    assert.match(response.headers.get('set-cookie'), /; Secure/);
    assert.match(response.headers.get('Cache-Control'), /private.*no-store/);
  } finally { if (old === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = old; }
});

test('vendored braces rejects deeply nested patterns and ASTs without stack exhaustion', () => {
  const braces = require('../vendor/braces');
  assert.deepEqual(braces.expand('app/{api,components}/*.{ts,tsx}'), ['app/api/*.ts', 'app/api/*.tsx', 'app/components/*.ts', 'app/components/*.tsx']);
  for (const pattern of ['{'.repeat(10000) + 'a,b' + '}'.repeat(10000), '('.repeat(10000) + 'x' + ')'.repeat(10000)])
    assert.throws(() => braces(pattern), SyntaxError);
  let ast = { type: 'text', value: 'x' };
  for (let i = 0; i < 1000; i++) ast = { type: 'root', nodes: [ast] };
  for (const action of ['compile', 'stringify', 'expand']) assert.throws(() => braces[action](ast), SyntaxError);
});
