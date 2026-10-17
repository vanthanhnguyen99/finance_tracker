import { withApiSecurity, readJsonBody } from "@/lib/http-security";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { toMinor, isValidMinorAmount } from "@/lib/money";
import { getWalletBalances, withUserLedger } from "@/lib/wallet";
import { getApiSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function handlePATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonBody(req);
  const fromAmountMajor = Number(body.fromAmountDkk);
  const toAmountVnd = Number(body.toAmountVnd);
  const hasFeeAmount = body.feeAmount !== undefined;
  const feeAmountMajor = body.feeAmount ? Number(body.feeAmount) : 0;
  if (body.feeCurrency !== undefined && body.feeCurrency !== "DKK" && body.feeCurrency !== "VND") {
    return NextResponse.json({ error: "Invalid fee currency" }, { status: 400 });
  }

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

  const requestedFeeCurrency = body.feeCurrency as "DKK" | "VND" | undefined;
  const { id } = await params;

  const response = await withUserLedger(user.id, async (tx) => {
    const exchange = await tx.exchange.findFirst({
      where: { id, userId: user.id }
    });
    if (!exchange) {
      return NextResponse.json({ error: "Exchange not found" }, { status: 404 });
    }

    const fromAmountDkk = toMinor(fromAmountMajor, "DKK");
    const toAmountVndMinor = toMinor(toAmountVnd, "VND");
    const feeCurrency = requestedFeeCurrency ?? exchange.feeCurrency ?? "DKK";
    const previousFeeMajor = (exchange.feeAmount ?? 0) / (exchange.feeCurrency === "VND" ? 1 : 100);
    const feeMajor = hasFeeAmount ? feeAmountMajor : previousFeeMajor;
    const feeAmountMinor = toMinor(feeMajor, feeCurrency);
    if (!isValidMinorAmount(fromAmountDkk) || !isValidMinorAmount(toAmountVndMinor) ||
      !isValidMinorAmount(feeAmountMinor, feeMajor === 0)) {
      return NextResponse.json({ error: "Amount is outside the supported range" }, { status: 400 });
    }

    const { balances } = await getWalletBalances(user.id, tx);
    const availableDkk = balances.DKK + exchange.fromAmountDkk + (exchange.feeCurrency === "DKK" ? (exchange.feeAmount ?? 0) : 0);
    const requiredDkk = fromAmountDkk + (feeCurrency === "DKK" ? feeAmountMinor : 0);
    if (availableDkk < requiredDkk) {
      return NextResponse.json({ error: "Insufficient DKK balance" }, { status: 400 });
    }

    const availableVnd = balances.VND - exchange.toAmountVnd +
      (exchange.feeCurrency === "VND" ? exchange.feeAmount ?? 0 : 0);
    if (availableVnd + toAmountVndMinor - (feeCurrency === "VND" ? feeAmountMinor : 0) < 0) {
      return NextResponse.json({ error: "Insufficient VND balance" }, { status: 400 });
    }

    const effectiveRate = new Prisma.Decimal(toAmountVnd / fromAmountMajor);

    const updated = await tx.exchange.update({
      where: { id: exchange.id },
      data: {
        fromAmountDkk,
        toAmountVnd: toAmountVndMinor,
        feeAmount: feeAmountMinor || null,
        feeCurrency: feeAmountMinor ? feeCurrency : null,
        effectiveRate
      }
    });
    return NextResponse.json({ exchange: updated });
  });
  if (response.ok) {
    revalidatePath("/");
    revalidatePath("/history");
    revalidatePath("/budgets");
  }
  return response;
}

async function handleDELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const deleted = await withUserLedger(user.id, (tx) => tx.exchange.deleteMany({
    where: { id, userId: user.id }
  }));
  if (!deleted.count) {
    return NextResponse.json({ error: "Exchange not found" }, { status: 404 });
  }
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/budgets");
  return NextResponse.json({ ok: true });
}

export const PATCH = withApiSecurity(handlePATCH);
export const DELETE = withApiSecurity(handleDELETE);
