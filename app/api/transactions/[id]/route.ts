import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toMinor } from "@/lib/money";
import { getWalletBalances } from "@/lib/wallet";
import { getApiSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
  const amountMajor = Number(body.amountMajor);
  const note = typeof body.note === "string" ? body.note : null;
  const category = typeof body.category === "string" ? body.category : null;
  const currency = body.currency as "DKK" | "VND" | undefined;

  if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (currency && currency !== "DKK" && currency !== "VND") {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }

  const { id } = await params;

  const txn = await prisma.transaction.findFirst({
    where: { id, userId: user.id }
  });
  if (!txn) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const nextCurrency = currency ?? txn.currency;
  const newAmount = toMinor(amountMajor, nextCurrency);

  if (txn.type === "EXPENSE") {
    const { balances } = await getWalletBalances(user.id);
    const available = balances[txn.currency] + txn.amount; // add back original amount
    const effectiveAvailable = nextCurrency === txn.currency ? available : balances[nextCurrency];
    if (effectiveAvailable < newAmount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }
  }

  const updated = await prisma.transaction.update({
    where: { id: txn.id },
    data: {
      amount: newAmount,
      currency: nextCurrency,
      note,
      category
    }
  });
  revalidatePath("/");
  revalidatePath("/history");

  return NextResponse.json({ transaction: updated });
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

  const deleted = await prisma.transaction.deleteMany({
    where: { id, userId: user.id }
  });
  if (!deleted.count) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
  revalidatePath("/");
  revalidatePath("/history");
  return NextResponse.json({ ok: true });
}
