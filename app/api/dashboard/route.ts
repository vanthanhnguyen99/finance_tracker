import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRange, type TimeFilter } from "@/lib/date";
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
  const filterParam = searchParams.get("filter");
  const filter: TimeFilter =
    filterParam === "today" ||
    filterParam === "week" ||
    filterParam === "month" ||
    filterParam === "last7" ||
    filterParam === "last30"
      ? filterParam
      : "month";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const fromDate = parseDateInputInTimeZone(fromParam, userTimeZone, false);
  const toDate = parseDateInputInTimeZone(toParam, userTimeZone, true);
  const hasCustomParams = fromParam !== null || toParam !== null;
  if (hasCustomParams && (!fromDate || !toDate || fromDate > toDate)) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }
  const hasCustomRange = Boolean(fromDate && toDate && fromDate <= toDate);

  const { start, end } = hasCustomRange
    ? { start: fromDate!, end: toDate! }
    : getRange(filter, userTimeZone);

  const creditRepaymentFilter = {
    AND: [
      {
        OR: [
          { category: { equals: "Tín dụng", mode: "insensitive" as const } },
          { category: { equals: "Tin dung", mode: "insensitive" as const } }
        ]
      },
      { paymentMethod: { not: "CREDIT_CARD" as const } }
    ]
  };

  const [incomeDkk, incomeVnd, expenseDkk, expenseVnd] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId: user.id,
        type: "INCOME",
        currency: "DKK",
        createdAt: { gte: start, lte: end }
      }
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId: user.id,
        type: "INCOME",
        currency: "VND",
        createdAt: { gte: start, lte: end }
      }
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId: user.id,
        type: "EXPENSE",
        currency: "DKK",
        NOT: creditRepaymentFilter,
        createdAt: { gte: start, lte: end }
      }
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId: user.id,
        type: "EXPENSE",
        currency: "VND",
        NOT: creditRepaymentFilter,
        createdAt: { gte: start, lte: end }
      }
    })
  ]);

  return NextResponse.json({
    filter: hasCustomRange ? "custom" : filter,
    primaryCurrency: user.primaryCurrency,
    totals: {
      incomeDkk: incomeDkk._sum.amount ?? 0,
      incomeVnd: incomeVnd._sum.amount ?? 0,
      expenseDkk: expenseDkk._sum.amount ?? 0,
      expenseVnd: expenseVnd._sum.amount ?? 0
    },
    primaryTotals: {
      income:
        user.primaryCurrency === "DKK"
          ? incomeDkk._sum.amount ?? 0
          : incomeVnd._sum.amount ?? 0,
      expense:
        user.primaryCurrency === "DKK"
          ? expenseDkk._sum.amount ?? 0
          : expenseVnd._sum.amount ?? 0
    }
  });
}
