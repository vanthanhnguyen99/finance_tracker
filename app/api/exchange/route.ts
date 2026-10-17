import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWalletByCurrency, getWalletBalances, withUserLedger } from "@/lib/wallet";
import { Prisma } from "@prisma/client";
import { toMinor, isValidMinorAmount } from "@/lib/money";
import { getApiSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getApiSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const fromAmountMajor = Number(body.fromAmountDkk);
  const toAmountVnd = Number(body.toAmountVnd);
  const hasFeeAmount = body.feeAmount !== undefined && body.feeAmount !== null && body.feeAmount !== "";
  const feeAmountMajor = hasFeeAmount ? Number(body.feeAmount) : undefined;
  const feeCurrency = (body.feeCurrency ?? "DKK") as "DKK" | "VND";
  const provider = typeof body.provider === "string" ? body.provider : undefined;
  const createdAtRaw = body.createdAt;
  const createdAt =
    typeof createdAtRaw === "string" && createdAtRaw
      ? new Date(createdAtRaw)
      : undefined;

  if (
    !Number.isFinite(fromAmountMajor) ||
    fromAmountMajor <= 0 ||
    !Number.isFinite(toAmountVnd) ||
    toAmountVnd <= 0
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (feeAmountMajor !== undefined && (!Number.isFinite(feeAmountMajor) || feeAmountMajor < 0)) {
    return NextResponse.json({ error: "Invalid fee amount" }, { status: 400 });
  }
  if (feeCurrency !== "DKK" && feeCurrency !== "VND") {
    return NextResponse.json({ error: "Invalid fee currency" }, { status: 400 });
  }
  if (createdAt && Number.isNaN(createdAt.getTime())) {
    return NextResponse.json({ error: "Invalid createdAt" }, { status: 400 });
  }

  const fromAmountDkk = toMinor(fromAmountMajor, "DKK");
  const toAmountVndMinor = toMinor(toAmountVnd, "VND");

  const feeAmountMinor = feeAmountMajor
    ? toMinor(feeAmountMajor, feeCurrency)
    : undefined;

  if (!isValidMinorAmount(fromAmountDkk) || !isValidMinorAmount(toAmountVndMinor) ||
    (feeAmountMinor !== undefined && !isValidMinorAmount(feeAmountMinor))) {
    return NextResponse.json({ error: "Amount is outside the supported range" }, { status: 400 });
  }

  return withUserLedger(user.id, async (tx) => {
    const fromWallet = await getWalletByCurrency("DKK", tx);
    const toWallet = await getWalletByCurrency("VND", tx);
    if (!fromWallet || !toWallet) {
      return NextResponse.json({ error: "Wallets not found" }, { status: 400 });
    }

    const { balances } = await getWalletBalances(user.id, tx);
    const requiredDkk = fromAmountDkk + (feeCurrency === "DKK" ? feeAmountMinor ?? 0 : 0);
    if (balances.DKK < requiredDkk) {
      return NextResponse.json({ error: "Insufficient DKK balance" }, { status: 400 });
    }

    if (feeCurrency === "VND" && feeAmountMinor && balances.VND < feeAmountMinor) {
      return NextResponse.json({ error: "Insufficient VND balance for fee" }, { status: 400 });
    }

    const effectiveRate = new Prisma.Decimal(toAmountVnd / fromAmountMajor);

    const exchange = await tx.exchange.create({
      data: {
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        userId: user.id,
        fromAmountDkk,
        toAmountVnd: toAmountVndMinor,
        effectiveRate,
        feeAmount: feeAmountMinor,
        feeCurrency,
        provider,
        ...(createdAt ? { createdAt } : {})
      }
    });

    return NextResponse.json({ exchange });
  });
}

export async function GET(req: NextRequest) {
  const user = await getApiSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exchanges = await prisma.exchange.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ exchanges });
}
