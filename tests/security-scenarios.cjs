const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createLoader } = require('./load-ts.cjs');
module.exports = async ({ t, prisma }) => {
  const { NextRequest } = require('next/server');
  process.env.APP_ORIGINS = 'https://financetracker.wt.id.vn,http://localhost';
  process.env.ADMIN_TOKEN = 'security-integration-test-only';
  const load = createLoader({ '@/lib/db': { prisma }, './db': { prisma } });
  const auth = load('lib/auth.ts');
  const recoveryApi = load('app/api/auth/reset-password/route.ts');
  const loginApi = load('app/api/auth/login/route.ts');
  const password = 'initial-secure-test-password';
  const user = await prisma.userAllowlist.create({ data: { displayName: 'Security Test', email: 'security-integration@example.test', status: 'ACTIVE', passwordHash: await auth.hashPassword(password) } });
  const { createAdminServer } = await import('../admin-server.mjs');
  const server = createAdminServer(prisma);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'Content-Type': 'application/json', 'X-Admin-Token': process.env.ADMIN_TOKEN };
  const request = (path, body) => new NextRequest(`http://localhost${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(body) });
  const issue = async () => {
    const response = await fetch(`${base}/api/users/${user.id}/recovery-link`, { method: 'POST', headers, body: JSON.stringify({ identityVerified: true }) });
    assert.equal(response.status, 200, await response.clone().text());
    const body = await response.json(); return new URLSearchParams(new URL(body.url).hash.slice(1)).get('token');
  };
  try {
    await t.test('real admin password change revokes existing sessions and stale login credentials', async () => {
      const session = await auth.createSession(user.id, user.passwordHash);
      assert(session);
      const response = await fetch(`${base}/api/users/${user.id}`, { method: 'PATCH', headers, body: JSON.stringify({ password: 'changed-secure-test-password', status: 'ACTIVE' }) });
      assert.equal(response.status, 200);
      assert.equal(await prisma.session.count({ where: { userId: user.id } }), 0);
      assert.equal(await auth.getActiveUserBySessionToken(session.token), null);
      assert.equal(await auth.createSession(user.id, user.passwordHash), null);
      const login = await loginApi.POST(request('/api/auth/login', { email: user.email, password: 'changed-secure-test-password' }));
      assert.equal(login.status, 200);
      const cookie = login.headers.get('set-cookie').match(/(?:^|,\s*)session=([a-f0-9]{64})/)[1];
      assert.equal((await auth.getActiveUserBySessionToken(cookie)).id, user.id);
      const stored = await prisma.session.findFirst({ where: { userId: user.id } });
      assert.equal(await auth.getActiveUserBySessionToken(stored.token), null);
    });
    await t.test('recovery requires verified admin action; superseded and expired links fail', async () => {
      const rejected = await fetch(`${base}/api/users/${user.id}/recovery-link`, { method: 'POST', headers, body: '{}' });
      assert.equal(rejected.status, 400);
      const oldToken = await issue(); const token = await issue();
      assert.equal(await prisma.passwordRecoveryToken.count({ where: { userId: user.id } }), 1);
      assert.equal((await recoveryApi.POST(request('/api/auth/reset-password', { token: oldToken, newPassword: 'recovery-secure-test-password' }))).status, 400);
      await prisma.passwordRecoveryToken.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      assert.equal((await recoveryApi.POST(request('/api/auth/reset-password', { token, newPassword: 'recovery-secure-test-password' }))).status, 400);
    });
    await t.test('concurrent recovery consumes a token only once and revokes all sessions', async () => {
      const token = await issue();
      const outcomes = await Promise.all([1, 2].map(() => recoveryApi.POST(request('/api/auth/reset-password', { token, newPassword: 'recovery-secure-test-password' }))));
      assert.deepEqual(outcomes.map(r => r.status).sort(), [200, 400]);
      assert.equal(await prisma.passwordRecoveryToken.count({ where: { userId: user.id } }), 0);
      assert.equal(await prisma.session.count({ where: { userId: user.id } }), 0);
      assert.equal(await auth.verifyPassword('recovery-secure-test-password', (await prisma.userAllowlist.findUnique({ where: { id: user.id } })).passwordHash), true);
    });
    await t.test('a login waiting on a password-change lock cannot issue a stale session', async () => {
      const before = await prisma.userAllowlist.findUnique({ where: { id: user.id } });
      let release, ready;
      const held = new Promise(resolve => { release = resolve; });
      const locked = new Promise(resolve => { ready = resolve; });
      const newHash = await auth.hashPassword('concurrent-secure-test-password');
      const mutation = prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "UserAllowlist" WHERE "id" = ${user.id} FOR UPDATE`;
        ready(); await held;
        await tx.userAllowlist.update({ where: { id: user.id }, data: { passwordHash: newHash } });
        await tx.session.deleteMany({ where: { userId: user.id } });
      }, { timeout: 10000 });
      await Promise.race([locked, new Promise((_, reject) => setTimeout(() => reject(new Error('Lock acquisition timed out')), 3000))]);
      const login = auth.createSession(user.id, before.passwordHash);
      release(); await mutation;
      assert.equal(await login, null);
    });
    await t.test('admin user listings do not disclose password or recovery hashes', async () => {
      const response = await fetch(`${base}/api/users`, { headers });
      assert.equal(response.status, 200);
      for (const row of (await response.json()).users) {
        assert.equal(Object.hasOwn(row, 'passwordHash'), false);
        assert.equal(Object.hasOwn(row, 'passwordResetRequests'), false);
      }
    });
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.passwordRecoveryToken.deleteMany({ where: { userId: user.id } });
    await prisma.userAllowlist.delete({ where: { id: user.id } });
    process.env.APP_ORIGINS = 'http://localhost';
  }
};
