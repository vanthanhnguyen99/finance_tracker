import { prisma } from "./db";
import { expenseAffectsWallet } from "./credit";
import { Prisma } from "@prisma/client";

export async function ensureWallets(db: Prisma.TransactionClient = prisma) {
  return Promise.all((["DKK", "VND"] as const).map((currency) =>
    getWalletByCurrency(currency, db)
  ));
}

export async function getWalletBalances(userId: string, db: Prisma.TransactionClient = prisma) {
  const wallets = await ensureWallets(db);
  const [transactionSums, exchangeSums, exchangeFeeDkk, exchangeFeeVnd] = await Promise.all([
    db.transaction.groupBy({
      by: ["currency", "type", "paymentMethod"],
      where: {
        userId,
        type: { in: ["INCOME", "EXPENSE"] }
      },
      _sum: { amount: true }
    }),
    db.exchange.aggregate({
      where: { userId },
      _sum: {
        fromAmountDkk: true,
        toAmountVnd: true
      }
    }),
    db.exchange.aggregate({
      where: { userId, feeCurrency: "DKK" },
      _sum: { feeAmount: true }
    }),
    db.exchange.aggregate({
      where: { userId, feeCurrency: "VND" },
      _sum: { feeAmount: true }
    })
  ]);

  const balances = {
    DKK: 0,
    VND: 0
  };

  for (const row of transactionSums) {
    const amount = row._sum.amount ?? 0;
    if (row.type === "INCOME") balances[row.currency] += amount;
    if (row.type === "EXPENSE" && expenseAffectsWallet(row.paymentMethod)) {
      balances[row.currency] -= amount;
    }
  }

  balances.DKK -= (exchangeSums._sum.fromAmountDkk ?? 0) + (exchangeFeeDkk._sum.feeAmount ?? 0);
  balances.VND += (exchangeSums._sum.toAmountVnd ?? 0) - (exchangeFeeVnd._sum.feeAmount ?? 0);

  return {
    wallets,
    balances
  };
}

export async function getWalletByCurrency(currency: "DKK" | "VND", db: Prisma.TransactionClient = prisma) {
  const existing = await db.wallet.findUnique({ where: { currency } });
  if (existing) return existing;
  return db.wallet.upsert({
    where: { currency },
    update: { currency },
    create: { name: `${currency} Wallet`, currency }
  });
}

export async function withUserLedger<T>(userId: string, action: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    // Every ledger mutation takes this lock before reading balances or records.
    // READ COMMITTED then sees the preceding writer's committed changes.
    await tx.$queryRaw`SELECT "id" FROM "UserAllowlist" WHERE "id" = ${userId} FOR UPDATE`;
    // Initialize shared wallets in one order, including during concurrent first use.
    await getWalletByCurrency("DKK", tx);
    await getWalletByCurrency("VND", tx);
    return action(tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 10000, timeout: 15000 });
}
