import { prisma } from "./db";

export async function ensureWallets() {
  const existing = await prisma.wallet.findMany();
  const byCurrency = new Map(existing.map((wallet) => [wallet.currency, wallet]));

  if (!byCurrency.get("DKK")) {
    await prisma.wallet.create({
      data: {
        name: "DKK Wallet",
        currency: "DKK"
      }
    });
  }

  if (!byCurrency.get("VND")) {
    await prisma.wallet.create({
      data: {
        name: "VND Wallet",
        currency: "VND"
      }
    });
  }

  return prisma.wallet.findMany();
}

export async function getWalletBalances(userId: string) {
  const wallets = await ensureWallets();
  const [transactionSums, exchangeSums, exchangeFeeDkk, exchangeFeeVnd] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["currency", "type"],
      where: {
        userId,
        type: { in: ["INCOME", "EXPENSE"] }
      },
      _sum: { amount: true }
    }),
    prisma.exchange.aggregate({
      where: { userId },
      _sum: {
        fromAmountDkk: true,
        toAmountVnd: true
      }
    }),
    prisma.exchange.aggregate({
      where: { userId, feeCurrency: "DKK" },
      _sum: { feeAmount: true }
    }),
    prisma.exchange.aggregate({
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
    if (row.type === "EXPENSE") balances[row.currency] -= amount;
  }

  balances.DKK -= (exchangeSums._sum.fromAmountDkk ?? 0) + (exchangeFeeDkk._sum.feeAmount ?? 0);
  balances.VND += (exchangeSums._sum.toAmountVnd ?? 0) - (exchangeFeeVnd._sum.feeAmount ?? 0);

  return {
    wallets,
    balances
  };
}

export async function getWalletByCurrency(currency: "DKK" | "VND") {
  const wallet = await prisma.wallet.findFirst({ where: { currency } });
  if (!wallet) {
    await ensureWallets();
    return prisma.wallet.findFirst({ where: { currency } });
  }
  return wallet;
}
