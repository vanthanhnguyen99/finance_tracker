import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRange, type TimeFilter } from "@/lib/date";
import { getApiSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getApiSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
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
  const parseDate = (value: string | null) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  };
  const fromDate = parseDate(fromParam);
  const toDate = parseDate(toParam);
  const hasCustomRange = Boolean(fromDate && toDate && fromDate <= toDate);

  const { start, end } = hasCustomRange
    ? {
        start: fromDate!,
        end: new Date(toDate!.getFullYear(), toDate!.getMonth(), toDate!.getDate(), 23, 59, 59, 999)
      }
    : getRange(filter);

  const [incomeDkk, expenseDkk, expenseVnd] = await Promise.all([
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
        type: "EXPENSE",
        currency: "DKK",
        createdAt: { gte: start, lte: end }
      }
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId: user.id,
        type: "EXPENSE",
        currency: "VND",
        createdAt: { gte: start, lte: end }
      }
    })
  ]);

  return NextResponse.json({
    filter: hasCustomRange ? "custom" : filter,
    totals: {
      incomeDkk: incomeDkk._sum.amount ?? 0,
      expenseDkk: expenseDkk._sum.amount ?? 0,
      expenseVnd: expenseVnd._sum.amount ?? 0
    }
  });
}
