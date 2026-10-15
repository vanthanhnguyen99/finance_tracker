const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./load-ts.cjs');
const load = createLoader();
const money = load('lib/money.ts');

for (const amount of [0, 0.01, 0.1, 12.34, 1234.56, 21474836.47, 350000]) {
  test(`editing ${amount} preserves its amount`, () => {
    assert.equal(Number(money.normalizeAmountForApi(money.formatMajorAmountForInput(amount))), amount);
  });
}

test('minor-unit validation rejects rounded zero, overflow, and non-finite amounts', () => {
  for (const amount of [money.toMinor(0.1, 'VND'), money.toMinor(0.001, 'DKK'), 2147483648, Infinity, NaN, -1]) {
    assert.equal(money.isValidMinorAmount(amount), false);
  }
  assert.equal(money.isValidMinorAmount(2147483647), true);
  assert.equal(money.isValidMinorAmount(0, true), true);
});

test('spoofed forwarding headers cannot bypass login limits, even with proxy trust', async () => {
  const oldTrust = process.env.TRUST_PROXY;
  try {
    const rateLoad = createLoader({
      '@/lib/db': { prisma: { userAllowlist: { findFirst: async () => null } } },
      '@/lib/auth': {}
    });
    const rate = rateLoad('lib/rate-limit.ts');
    delete process.env.TRUST_PROXY;
    assert.equal(rate.getClientIp('forged-client', 'unknown'), 'unknown');
    process.env.TRUST_PROXY = 'true';
    const { POST } = rateLoad('app/api/auth/login/route.ts');
    for (let i = 0; i < 9; i++) {
      const response = await POST(new Request('http://localhost/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `forged-${i}` },
        body: JSON.stringify({ email: 'rate-regression@example.test', password: 'incorrect' })
      }));
      assert.equal(response.status, i < 8 ? 401 : 429);
    }
  } finally {
    if (oldTrust === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = oldTrust;
  }
});

const emptyBackup = () => ({
  version: 1, scope: 'system', source: 'finance-tracker-admin', exportedAt: new Date().toISOString(),
  wallets: [], users: [], sessions: [], passwordResetRequests: [], transactions: [], exchanges: []
});

async function adminServer(t, db) {
  const { createAdminServer } = await import('../admin-server.mjs');
  const server = createAdminServer(db);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}
process.env.ADMIN_TOKEN = 'regression-test-only';

for (const [name, payload] of [
  ['unrelated JSON', { unrelated: 'json' }], ['empty object', {}], ['array', []],
  ['null', null], ['missing collection', { ...emptyBackup(), transactions: undefined }],
  ['wrong collection type', { ...emptyBackup(), users: {} }],
  ['unknown version', { ...emptyBackup(), version: 2 }],
  ['incomplete backup', { ...emptyBackup(), meta: { userCount: 1 } }],
  ['invalid row', { ...emptyBackup(), users: [{}] }]
]) {
  test(`restore rejects ${name} before any database call`, async t => {
    const db = new Proxy({}, { get: (_, key) => { throw new Error(`Unexpected database access: ${String(key)}`); } });
    const base = await adminServer(t, db);
    const res = await fetch(`${base}/api/system/restore`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': process.env.ADMIN_TOKEN },
      body: JSON.stringify({ mode: 'replace', backup: payload })
    });
    assert.equal(res.status, 400, await res.text());
  });
}

test('backup reads all collections in a repeatable-read transaction', async t => {
  let transactionOptions;
  const table = { findMany: async () => [] };
  const db = { $transaction: async (action, options) => {
    transactionOptions = options;
    return action({ wallet: table, userAllowlist: table, session: table, passwordResetRequest: table, transaction: table, exchange: table });
  }};
  const base = await adminServer(t, db);
  const res = await fetch(`${base}/api/system/backup`, { headers: { 'X-Admin-Token': process.env.ADMIN_TOKEN } });
  assert.equal(res.status, 200);
  assert.equal(transactionOptions.isolationLevel, 'RepeatableRead');
  const backup = await res.json();
  for (const collection of ['users', 'wallets', 'sessions', 'transactions', 'exchanges', 'passwordResetRequests']) assert.deepEqual(backup[collection], []);
});
