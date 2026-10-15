const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./load-ts.cjs');
const testUrl = process.env.TEST_DATABASE_URL;

test('PostgreSQL ledger regressions (requires a disposable migrated test database)', { skip: !testUrl }, async t => {
  const parsed = new URL(testUrl);
  assert.equal(parsed.pathname, '/finance_tracker_test', 'Use a dedicated finance_tracker_test database');
  assert(['127.0.0.1', 'localhost'].includes(parsed.hostname), 'Test database must be local');
  process.env.DATABASE_URL = testUrl;
  const { NextRequest } = require('next/server');
  let user;
  const load = createLoader({ '@/lib/auth': { getApiSessionUser: async () => user }, 'next/cache': { revalidatePath() {} } });
  const { prisma } = load('lib/db.ts');
  t.after(() => prisma.$disconnect());
  await prisma.session.deleteMany();
  await prisma.passwordResetRequest.deleteMany();
  await prisma.exchange.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.userAllowlist.deleteMany();
  user = await prisma.userAllowlist.create({ data: { displayName: 'Regression', email: 'test@example.test', status: 'ACTIVE' } });
  const transactions = load('app/api/transactions/route.ts');
  const transactionEdit = load('app/api/transactions/[id]/route.ts');
  const exchanges = load('app/api/exchange/route.ts');
  const exchangeEdit = load('app/api/exchange/[id]/route.ts');
  const wallet = load('lib/wallet.ts');
  const request = (data, method = 'POST') => new NextRequest('http://localhost/api/test', {
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  const context = id => ({ params: Promise.resolve({ id }) });
  const income = async (amountMajor, currency = 'DKK') => {
    const res = await transactions.POST(request({ type: 'INCOME', currency, amountMajor }));
    assert.equal(res.status, 200, await res.clone().text());
    return (await res.json()).transaction;
  };
  const reset = async () => { await prisma.exchange.deleteMany(); await prisma.transaction.deleteMany(); };

  await t.test('parallel first-use requests initialize wallets without unique constraint failures', async () => {
    await prisma.wallet.deleteMany();
    const other = await prisma.userAllowlist.create({ data: { displayName: 'Other', status: 'ACTIVE' } });
    await Promise.all([wallet.getWalletBalances(user.id), wallet.getWalletBalances(other.id)]);
    assert.equal(await prisma.wallet.count(), 2);
  });
  await t.test('two expenses cannot spend the same balance', async () => {
    await reset(); await income(100);
    const results = await Promise.all([1, 2].map(() => transactions.POST(request({ type: 'EXPENSE', amountMajor: 80 }))));
    assert.deepEqual(results.map(x => x.status).sort(), [200, 400]);
    assert.equal((await wallet.getWalletBalances(user.id)).balances.DKK, 2000);
  });
  await t.test('an expense and exchange cannot spend the same balance', async () => {
    await reset(); await income(100);
    const results = await Promise.all([
      transactions.POST(request({ type: 'EXPENSE', amountMajor: 80 })),
      exchanges.POST(request({ fromAmountDkk: 80, toAmountVnd: 280000 }))
    ]);
    assert.deepEqual(results.map(x => x.status).sort(), [200, 400]);
    assert.equal((await wallet.getWalletBalances(user.id)).balances.DKK, 2000);
  });
  await t.test('concurrent expense edits check the committed balance', async () => {
    await reset(); await income(100);
    const records = [];
    for (let i = 0; i < 2; i++) {
      const res = await transactions.POST(request({ type: 'EXPENSE', amountMajor: 10 }));
      records.push((await res.json()).transaction);
    }
    const results = await Promise.all(records.map(record => transactionEdit.PATCH(request({ amountMajor: 70 }, 'PATCH'), context(record.id))));
    assert.deepEqual(results.map(x => x.status).sort(), [200, 400]);
    assert.equal((await wallet.getWalletBalances(user.id)).balances.DKK, 2000);
  });
  await t.test('credit-card expenses still work without a cash balance', async () => {
    await reset();
    const res = await transactions.POST(request({ type: 'EXPENSE', amountMajor: 20, paymentMethod: 'CREDIT_CARD' }));
    assert.equal(res.status, 200);
    assert.equal((await wallet.getWalletBalances(user.id)).balances.DKK, 0);
  });
  await t.test('the default DKK fee is checked, stored, and deducted', async () => {
    await reset(); await income(100);
    assert.equal((await exchanges.POST(request({ fromAmountDkk: 100, toAmountVnd: 350000, feeAmount: 5 }))).status, 400);
    await income(5);
    const res = await exchanges.POST(request({ fromAmountDkk: 100, toAmountVnd: 350000, feeAmount: 5 }));
    assert.equal(res.status, 200);
    const { exchange } = await res.json();
    assert.equal(exchange.feeCurrency, 'DKK'); assert.equal(exchange.feeAmount, 500);
    assert.equal((await wallet.getWalletBalances(user.id)).balances.DKK, 0);
  });
  await t.test('editing an exchange preserves its VND fee after received funds have been spent', async () => {
    await reset(); await income(100); await income(2000, 'VND');
    const res = await exchanges.POST(request({ fromAmountDkk: 50, toAmountVnd: 175000, feeAmount: 1000, feeCurrency: 'VND' }));
    assert.equal(res.status, 200);
    const { exchange } = await res.json();
    assert.equal((await transactions.POST(request({ type: 'EXPENSE', currency: 'VND', amountMajor: 50000 }))).status, 200);
    const before = (await wallet.getWalletBalances(user.id)).balances;
    for (const fee of [{}, { feeAmount: '1000', feeCurrency: 'VND' }]) {
      const edit = await exchangeEdit.PATCH(request({ fromAmountDkk: 50, toAmountVnd: 175000, ...fee }, 'PATCH'), context(exchange.id));
      assert.equal(edit.status, 200, await edit.clone().text());
      const updated = (await edit.json()).exchange;
      assert.equal(updated.feeCurrency, 'VND'); assert.equal(updated.feeAmount, 1000);
      assert.deepEqual((await wallet.getWalletBalances(user.id)).balances, before);
    }
    const clear = await exchangeEdit.PATCH(request({ fromAmountDkk: 50, toAmountVnd: 175000, feeAmount: 0, feeCurrency: 'VND' }, 'PATCH'), context(exchange.id));
    assert.equal(clear.status, 200);
    assert.equal((await wallet.getWalletBalances(user.id)).balances.VND, before.VND + 1000);
  });
  await t.test('SQL totals retain uncategorized cash and legacy expenses, excluding repayments', async () => {
    await reset();
    const dkk = await wallet.getWalletByCurrency('DKK');
    await prisma.transaction.createMany({ data: [
      { category: null, paymentMethod: 'CASH', amount: 100 },
      { category: '', paymentMethod: 'CASH', amount: 200 },
      { category: 'Đi chợ', paymentMethod: null, amount: 300 },
      { category: 'Tín dụng', paymentMethod: 'CASH', amount: 400 },
      { category: 'Tin dung', paymentMethod: null, amount: 500 },
      { category: 'Tín dụng', paymentMethod: 'CREDIT_CARD', amount: 600 }
    ].map(row => ({ ...row, userId: user.id, walletId: dkk.id, type: 'EXPENSE', currency: 'DKK' })) });
    const { nonRepaymentExpenseFilter } = load('lib/credit.ts');
    const sum = await prisma.transaction.aggregate({ where: { userId: user.id, ...nonRepaymentExpenseFilter }, _sum: { amount: true } });
    assert.equal(sum._sum.amount, 1200);
    const uncategorized = await prisma.transaction.aggregate({ where: { userId: user.id, AND: [nonRepaymentExpenseFilter, { OR: [{ category: null }, { category: '' }] }] }, _sum: { amount: true } });
    assert.equal(uncategorized._sum.amount, 300);
    const api = load('app/api/dashboard/route.ts');
    const response = await api.GET(new NextRequest('http://localhost/api/dashboard'));
    assert.equal((await response.json()).totals.expenseDkk, 1200);
  });
  await t.test('create and edit reject rounded zero and integer overflow without database errors', async () => {
    await reset();
    for (const [currency, amountMajor] of [['VND', 0.1], ['DKK', 0.001], ['VND', 2147483648], ['DKK', 21474836.48]]) {
      assert.equal((await transactions.POST(request({ type: 'INCOME', currency, amountMajor }))).status, 400);
    }
    const txn = await income(2147483647, 'VND');
    for (const amountMajor of [0.1, 2147483648]) assert.equal((await transactionEdit.PATCH(request({ amountMajor }, 'PATCH'), context(txn.id))).status, 400);
    await income(100);
    for (const data of [
      { fromAmountDkk: 0.001, toAmountVnd: 10 }, { fromAmountDkk: 1, toAmountVnd: 0.1 },
      { fromAmountDkk: 1, toAmountVnd: 2147483648 }, { fromAmountDkk: 1, toAmountVnd: 10, feeAmount: 0.001 }
    ]) assert.equal((await exchanges.POST(request(data))).status, 400);
  });
  await t.test('a currency edit keeps the wallet relationship consistent', async () => {
    await reset(); const txn = await income(100);
    const res = await transactionEdit.PATCH(request({ amountMajor: 100, currency: 'VND' }, 'PATCH'), context(txn.id));
    assert.equal(res.status, 200);
    const updated = await prisma.transaction.findUnique({ where: { id: txn.id }, include: { wallet: true } });
    assert.equal(updated.currency, updated.wallet.currency);
  });
  await t.test('a note-only edit preserves a decimal DKK amount through form normalization and the API', async () => {
    await reset();
    const txn = await income(12.34);
    const money = load('lib/money.ts');
    const amountMajor = money.normalizeAmountForApi(money.formatMajorAmountForInput(txn.amount / 100));
    const edited = await transactionEdit.PATCH(request({ amountMajor, note: 'Updated note' }, 'PATCH'), context(txn.id));
    assert.equal(edited.status, 200);
    assert.equal((await edited.json()).transaction.amount, 1234);
  });
  await t.test('a concurrent registration cannot leave a dangling session in a backup', async () => {
    process.env.ADMIN_TOKEN = 'integration-test-only';
    const { createAdminServer } = await import('../admin-server.mjs');
    let finishWrite;
    const writeDone = new Promise(resolve => { finishWrite = resolve; });
    const adapter = { $transaction: (action, options) => prisma.$transaction(tx => action({
      wallet: tx.wallet, passwordResetRequest: tx.passwordResetRequest, transaction: tx.transaction, exchange: tx.exchange,
      userAllowlist: { findMany: async args => {
        const rows = await tx.userAllowlist.findMany(args);
        try {
          const newcomer = await prisma.userAllowlist.create({ data: { displayName: 'Concurrent registration', status: 'ACTIVE' } });
          await prisma.session.create({ data: { userId: newcomer.id, token: 'concurrent-test-token', expiresAt: new Date(Date.now() + 60000) } });
        } finally { finishWrite(); }
        return rows;
      } },
      session: { findMany: async args => { await writeDone; return tx.session.findMany(args); } }
    }), options) };
    const server = createAdminServer(adapter);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const res = await fetch(`http://127.0.0.1:${server.address().port}/api/system/backup`, { headers: { 'X-Admin-Token': process.env.ADMIN_TOKEN } });
      assert.equal(res.status, 200, await res.clone().text());
      const backup = await res.json();
      const userIds = new Set(backup.users.map(row => row.id));
      assert(backup.sessions.every(session => userIds.has(session.userId)));
      assert(!backup.sessions.some(session => session.token === 'concurrent-test-token'));
      assert.equal(await prisma.session.count({ where: { token: 'concurrent-test-token' } }), 1);
    } finally { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); }
  });
  for (const scope of ['user', 'system', 'restore']) {
    for (const first of ['expense', 'clear']) {
      await t.test(`${scope} admin mutation serializes with a ${first}-first cash expense`, async () => {
        await reset(); await income(100);
        const otherUser = await prisma.userAllowlist.findFirst({ where: { id: { not: user.id } } });
        const dkk = await wallet.getWalletByCurrency('DKK');
        await prisma.transaction.create({ data: {
          userId: otherUser.id, walletId: dkk.id, currency: 'DKK', type: 'INCOME', amount: 1000
        } });
        const session = await prisma.session.upsert({
          where: { token: 'clear-regression-session' }, update: {},
          create: { token: 'clear-regression-session', userId: user.id, expiresAt: new Date(Date.now() + 60000) }
        });
        process.env.ADMIN_TOKEN = 'integration-test-only';
        const { createAdminServer } = await import('../admin-server.mjs');
        const { PrismaClient } = require('@prisma/client');
        const observer = new PrismaClient();
        let releaseFirst;
        const firstCanFinish = new Promise(resolve => { releaseFirst = resolve; });
        let signalPaused;
        const firstPaused = new Promise(resolve => { signalPaused = resolve; });
        function instrument(tx, model, method) {
          return new Proxy(tx, { get(target, key) {
            if (key !== model) return Reflect.get(target, key);
            return new Proxy(target[model], { get(table, operation) {
              if (operation !== method) return Reflect.get(table, operation);
              return async (...args) => { signalPaused(); await firstCanFinish; return table[method](...args); };
            } });
          } });
        }
        const writerDb = { $transaction: (action, options) => prisma.$transaction(async tx => {
          await tx.$executeRaw`SET LOCAL application_name = 'ledger_expense_regression'`;
          return action(first === 'expense' ? instrument(tx, 'transaction', 'create') : tx);
        }, options) };
        const adminDb = {
          userAllowlist: prisma.userAllowlist,
          $transaction: (action, options) => prisma.$transaction(async tx => {
            await tx.$executeRaw`SET LOCAL application_name = 'ledger_clear_regression'`;
            return action(first === 'clear' ? instrument(tx, 'passwordResetRequest', 'deleteMany') : tx);
          }, options)
        };
        const writer = createLoader({ './db': { prisma: writerDb }, '@/lib/db': { prisma: writerDb }, '@/lib/auth': { getApiSessionUser: async () => user } })('app/api/transactions/route.ts');
        const server = createAdminServer(adminDb);
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const base = `http://127.0.0.1:${server.address().port}`;
        const headers = { 'X-Admin-Token': process.env.ADMIN_TOKEN, 'Content-Type': 'application/json' };
        const backup = scope === 'restore' ? await (await fetch(`${base}/api/system/backup`, { headers })).json() : undefined;
        const endpoint = scope === 'user' ? `/api/users/${user.id}/clear-data` :
          scope === 'restore' ? '/api/system/restore' : '/api/system/clear-user-data';
        const clear = () => fetch(`${base}${endpoint}`, {
          method: 'POST', headers, body: backup ? JSON.stringify({ backup }) : undefined
        });
        const expense = () => writer.POST(request({ type: 'EXPENSE', amountMajor: 80 }));
        const pending = [];
        let secondFinished = false;
        let observed;
        try {
          pending.push(first === 'expense' ? expense() : clear());
          await Promise.race([
            firstPaused,
            pending[0].then(() => { throw new Error('The first operation finished before reaching the test barrier'); })
          ]);
          pending.push((first === 'expense' ? clear() : expense()).finally(() => { secondFinished = true; }));
          const secondName = first === 'expense' ? 'ledger_clear_regression' : 'ledger_expense_regression';
          // Observe PostgreSQL's lock wait, rather than relying on a fixed sleep.
          for (let attempt = 0; attempt < 100; attempt++) {
            if (secondFinished) { observed = 'completed before first operation'; break; }
            const waiting = await observer.$queryRaw`
              SELECT pid FROM pg_stat_activity WHERE application_name = ${secondName} AND wait_event_type = 'Lock'
            `;
            if (waiting.length) { observed = 'blocked on lock'; break; }
            await new Promise(resolve => setTimeout(resolve, 20));
          }
          releaseFirst();
          const responses = await Promise.all(pending);
          const expenseResponse = responses[first === 'expense' ? 0 : 1];
          const clearResponse = responses[first === 'clear' ? 0 : 1];
          assert.equal(clearResponse.status, 200, await clearResponse.text());
          const balance = (await wallet.getWalletBalances(user.id)).balances.DKK;
          assert.equal(observed, 'blocked on lock', `Final DKK balance: ${balance}`);
          assert.equal(expenseResponse.status, first === 'expense' || scope === 'restore' ? 200 : 400);
          assert.equal(balance, scope === 'restore' ? (first === 'expense' ? 10000 : 2000) : 0);
          assert.equal((await wallet.getWalletBalances(otherUser.id)).balances.DKK, scope === 'system' ? 0 : 1000);
          assert(await prisma.session.findUnique({ where: { id: session.id } }), 'Existing sessions are preserved');
        } finally {
          releaseFirst();
          await Promise.allSettled(pending);
          await observer.$disconnect();
          await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
        }
      });
    }
  }
  await t.test('real backup restore round-trips all records and rejects invalid JSON without deleting anything', async () => {
    process.env.ADMIN_TOKEN = 'integration-test-only';
    const { createAdminServer } = await import('../admin-server.mjs');
    const server = createAdminServer(prisma);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const base = `http://127.0.0.1:${server.address().port}`;
      const headers = { 'Content-Type': 'application/json', 'X-Admin-Token': process.env.ADMIN_TOKEN };
      const backup = await (await fetch(`${base}/api/system/backup`, { headers })).json();
      const rejected = await fetch(`${base}/api/system/restore`, { method: 'POST', headers, body: JSON.stringify({ backup: { unrelated: 'json' } }) });
      assert.equal(rejected.status, 400);
      assert.equal(await prisma.transaction.count(), backup.transactions.length);
      const restored = await fetch(`${base}/api/system/restore`, { method: 'POST', headers, body: JSON.stringify({ backup }) });
      assert.equal(restored.status, 200, await restored.clone().text());
      assert.equal(await prisma.transaction.count(), backup.transactions.length);
      assert.equal(await prisma.userAllowlist.count(), backup.users.length);
    } finally { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); }
  });
});
