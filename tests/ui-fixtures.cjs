const { PrismaClient } = require('@prisma/client');
const crypto = require('node:crypto');

function testDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error('TEST_DATABASE_URL is required');
  const url = new URL(value);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/finance_tracker_test') {
    throw new Error('UI fixtures require a local, disposable finance_tracker_test database');
  }
  return value;
}

async function seedUiFixtures() {
  const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl() } } });
  try {
    const userId = 'glass-ui-fixture';
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.budget.deleteMany({ where: { userId } });
    await prisma.exchange.deleteMany({ where: { userId } });
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.userAllowlist.upsert({
      where: { id: userId }, update: { status: 'ACTIVE' },
      create: { id: userId, displayName: 'UI Preview', email: 'glass-ui@example.test', status: 'ACTIVE' }
    });
    const token = crypto.createHash('sha256').update('glass-ui-fixture-session').digest('hex');
    await prisma.session.create({ data: { userId, token: `sha256_v1:${crypto.createHash('sha256').update(token).digest('hex')}`, expiresAt: new Date(Date.now() + 86400000) } });
    for (const currency of ['DKK', 'VND']) {
      const wallet = await prisma.wallet.upsert({ where: { currency }, update: {}, create: { name: currency, currency } });
      await prisma.transaction.create({ data: { userId, walletId: wallet.id, currency, type: 'INCOME', amount: currency === 'DKK' ? 10000000 : 100000000, category: 'Lương', note: 'UI fixture income' } });
      await prisma.transaction.createMany({ data: Array.from({ length: 65 }, (_, i) => ({
        id: `glass-${currency}-${i}`, userId, walletId: wallet.id, currency, type: 'EXPENSE', amount: currency === 'DKK' ? 1234 : 35000,
        category: 'Đi chợ', paymentMethod: 'CASH', note: `UI fixture ${currency} ${i}`,
        createdAt: new Date(Date.now() - (i + 1) * 60000)
      })) });
    }
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await prisma.budget.create({ data: { userId, month, currency: 'DKK', scope: 'TOTAL', scopeKey: 'TOTAL', limitMinor: 200000 } });
    return { userId, token };
  } finally { await prisma.$disconnect(); }
}
async function otherUiAccount() {
  const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl() } } });
  try {
    const id = 'glass-ui-other';
    await prisma.userAllowlist.upsert({ where: { id }, update: { status: 'ACTIVE' }, create: { id, displayName: 'Other Preview', status: 'ACTIVE' } });
    const token = crypto.createHash('sha256').update('glass-ui-other-session').digest('hex');
    await prisma.session.deleteMany({ where: { userId: id } });
    await prisma.session.create({ data: { userId: id, token: `sha256_v1:${crypto.createHash('sha256').update(token).digest('hex')}`, expiresAt: new Date(Date.now() + 86400000) } });
    return token;
  } finally { await prisma.$disconnect(); }
}
module.exports = { seedUiFixtures, testDatabaseUrl, otherUiAccount };
if (require.main === module) seedUiFixtures().then(() => console.log('UI fixtures ready')).catch(error => { console.error(error); process.exitCode = 1; });
