import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { toMinor } from "@/lib/money";
import { getWalletBalances } from "@/lib/wallet";
import { getApiSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const fromAmountMajor = Number(body.fromAmountDkk);
  const toAmountVnd = Number(body.toAmountVnd);
  const feeAmountMajor = body.feeAmount ? Number(body.feeAmount) : 0;

  if (
    !Number.isFinite(fromAmountMajor) ||
    fromAmountMajor <= 0 ||
    !Number.isFinite(toAmountVnd) ||
    toAmountVnd <= 0
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!Number.isFinite(feeAmountMajor) || feeAmountMajor < 0) {
    return NextResponse.json({ error: "Invalid fee amount" }, { status: 400 });
  }

  const { id } = await params;

  const exchange = await prisma.exchange.findFirst({
    where: { id, userId: user.id }
  });
  if (!exchange) {
    return NextResponse.json({ error: "Exchange not found" }, { status: 404 });
  }

  const fromAmountDkk = toMinor(fromAmountMajor, "DKK");
  const toAmountVndMinor = toMinor(toAmountVnd, "VND");
  const feeAmountMinor = feeAmountMajor ? toMinor(feeAmountMajor, "DKK") : 0;

  const { balances } = await getWalletBalances(user.id);
  const availableDkk = balances.DKK + exchange.fromAmountDkk + (exchange.feeCurrency === "DKK" ? (exchange.feeAmount ?? 0) : 0);
  const requiredDkk = fromAmountDkk + feeAmountMinor;
  if (availableDkk < requiredDkk) {
    return NextResponse.json({ error: "Insufficient DKK balance" }, { status: 400 });
  }

  const effectiveRate = new Prisma.Decimal(toAmountVnd / fromAmountMajor);

  const updated = await prisma.exchange.update({
    where: { id: exchange.id },
    data: {
      fromAmountDkk,
      toAmountVnd: toAmountVndMinor,
      feeAmount: feeAmountMinor || null,
      feeCurrency: feeAmountMinor ? "DKK" : null,
      effectiveRate
    }
  });

  return NextResponse.json({ exchange: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const deleted = await prisma.exchange.deleteMany({
    where: { id, userId: user.id }
  });
  if (!deleted.count) {
    return NextResponse.json({ error: "Exchange not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
