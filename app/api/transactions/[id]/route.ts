import { withApiSecurity, readJsonBody } from "@/lib/http-security";
import { NextRequest, NextResponse } from "next/server";
import { toMinor, isValidMinorAmount } from "@/lib/money";
import { getWalletBalances, getWalletByCurrency, withUserLedger } from "@/lib/wallet";
import { getApiSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { expenseAffectsWallet, normalizePaymentMethod } from "@/lib/credit";

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
  const amountMajor = Number(body.amountMajor);
  const note = typeof body.note === "string" ? body.note : null;
  const category = typeof body.category === "string" ? body.category : null;
  const currency = body.currency as "DKK" | "VND" | undefined;
  const paymentMethodRaw = body.paymentMethod;
  const paymentMethod = normalizePaymentMethod(paymentMethodRaw);

  if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (currency !== undefined && currency !== "DKK" && currency !== "VND") {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }
  if (paymentMethodRaw !== undefined && !paymentMethod) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

  const { id } = await params;

  const response = await withUserLedger(user.id, async (tx) => {
    const txn = await tx.transaction.findFirst({
      where: { id, userId: user.id }
    });
    if (!txn) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const nextCurrency = currency ?? txn.currency;
    const newAmount = toMinor(amountMajor, nextCurrency);
    if (!isValidMinorAmount(newAmount)) {
      return NextResponse.json({ error: "Amount is outside the supported range" }, { status: 400 });
    }
    const nextPaymentMethod =
      txn.type === "EXPENSE" ? paymentMethod ?? txn.paymentMethod ?? "CASH" : undefined;

    if (txn.type === "EXPENSE") {
      const { balances } = await getWalletBalances(user.id, tx);
      const simulatedBalances = { ...balances };

      if (expenseAffectsWallet(txn.paymentMethod)) {
        simulatedBalances[txn.currency] += txn.amount;
      }
      if (expenseAffectsWallet(nextPaymentMethod)) {
        simulatedBalances[nextCurrency] -= newAmount;
      }

      if (simulatedBalances[nextCurrency] < 0) {
        return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
      }
    }

    const wallet = await getWalletByCurrency(nextCurrency, tx);
    const updated = await tx.transaction.update({
      where: { id: txn.id },
      data: {
        amount: newAmount,
        currency: nextCurrency,
        walletId: wallet.id,
        note,
        category,
        ...(txn.type === "EXPENSE"
          ? { paymentMethod: nextPaymentMethod }
          : {})
      }
    });
    return NextResponse.json({ transaction: updated });
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

  const deleted = await withUserLedger(user.id, (tx) => tx.transaction.deleteMany({
    where: { id, userId: user.id }
  }));
  if (!deleted.count) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/budgets");
  return NextResponse.json({ ok: true });
}

export const PATCH = withApiSecurity(handlePATCH);
export const DELETE = withApiSecurity(handleDELETE);
