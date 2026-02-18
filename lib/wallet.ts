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
  const transactions = await prisma.transaction.findMany({
    where: { userId }
  });
  const exchanges = await prisma.exchange.findMany({
    where: { userId }
  });

  const balances = {
    DKK: 0,
    VND: 0
  };

  for (const txn of transactions) {
    if (txn.type === "INCOME") {
      balances[txn.currency] += txn.amount;
    }
    if (txn.type === "EXPENSE") {
      balances[txn.currency] -= txn.amount;
    }
  }

  for (const ex of exchanges) {
    balances.DKK -= ex.fromAmountDkk;
    balances.VND += ex.toAmountVnd;
    if (ex.feeAmount && ex.feeCurrency) {
      balances[ex.feeCurrency] -= ex.feeAmount;
    }
  }

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
