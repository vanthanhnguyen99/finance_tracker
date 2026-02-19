import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWalletByCurrency, getWalletBalances } from "@/lib/wallet";
import { toMinor } from "@/lib/money";
import { getApiSessionUser } from "@/lib/auth";
import { getTimeZoneFromRequest, parseDateInputInTimeZone } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getApiSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userTimeZone = getTimeZoneFromRequest(req);
  const type = searchParams.get("type") || undefined;
  const currency = searchParams.get("currency") || undefined;
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const where: Record<string, unknown> = {};
  if (type) {
    if (type !== "INCOME" && type !== "EXPENSE" && type !== "EXCHANGE") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    where.type = type;
  }
  if (currency) {
    if (currency !== "DKK" && currency !== "VND") {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }
    where.currency = currency;
  }
  if (start || end) {
    const startDate = start
      ? /^\d{4}-\d{2}-\d{2}$/.test(start)
        ? parseDateInputInTimeZone(start, userTimeZone, false) ?? undefined
        : new Date(start)
      : undefined;
    const endDate = end
      ? /^\d{4}-\d{2}-\d{2}$/.test(end)
        ? parseDateInputInTimeZone(end, userTimeZone, true) ?? undefined
        : new Date(end)
      : undefined;
    if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }
    where.createdAt = {
      gte: startDate,
      lte: endDate
    };
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      ...where,
      userId: user.id
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ transactions });
}

export async function POST(req: NextRequest) {
  const user = await getApiSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const type = body.type as "INCOME" | "EXPENSE";
  const currency = body.currency as "DKK" | "VND";
  const amountMajor = Number(body.amountMajor);
  const note = typeof body.note === "string" ? body.note : undefined;
  const category = typeof body.category === "string" ? body.category : undefined;
  const createdAtRaw = body.createdAt;
  const createdAt =
    typeof createdAtRaw === "string" && createdAtRaw
      ? new Date(createdAtRaw)
      : undefined;

  if (!type || !currency || !Number.isFinite(amountMajor) || amountMajor <= 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (createdAt && Number.isNaN(createdAt.getTime())) {
    return NextResponse.json({ error: "Invalid createdAt" }, { status: 400 });
  }

  const wallet = await getWalletByCurrency(currency);
  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 400 });
  }

  const amountMinor = toMinor(amountMajor, currency);

  if (type === "EXPENSE") {
    const { balances } = await getWalletBalances(user.id);
    if (balances[currency] < amountMinor) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      type,
      userId: user.id,
      walletId: wallet.id,
      amount: amountMinor,
      currency,
      category,
      note,
      ...(createdAt ? { createdAt } : {})
    }
  });

  return NextResponse.json({ transaction });
}
